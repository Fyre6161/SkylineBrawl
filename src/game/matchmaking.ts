import { FIGHTERS } from './fighters';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './netcode';
import { FighterId, OnlineRole } from './types';
import { WssRelayClient } from './wssRelay';

export const MATCHMAKING_TOPIC = 'skyline-brawl/v1/matchmaking/queue';
const SEEK_INTERVAL_MS = 1200;
const REPLY_SEEK_COOLDOWN_MS = 450;
const MATCH_REBROADCAST_DELAYS_MS = [350, 750];
const MATCH_HANDSHAKE_TIMEOUT_MS = 22000;

export type QuickMatchStatus = 'idle' | 'searching' | 'matched' | 'error';

export type QuickMatchPacket =
  | {
      t: 'seek';
      id: string;
      room: string;
      fighter: FighterId;
      ts: number;
    }
  | {
      t: 'match';
      hostId: string;
      guestId: string;
      room: string;
      hostFighter: FighterId;
      guestFighter: FighterId;
      ts: number;
    }
  | {
      t: 'busy';
      hostId: string;
      guestId: string;
      ts: number;
    };

export interface QuickMatchState {
  myId: string;
  myRoom: string;
  myFighter: FighterId;
  status: 'searching' | 'matched';
  role: OnlineRole | null;
  partnerId: string | null;
  ignoredPartners: Set<string>;
}

export interface QuickMatchResult {
  role: OnlineRole;
  roomCode: string;
  myFighter: FighterId;
  opponentFighter: FighterId;
  partnerId: string;
}

export type QuickMatchEvaluation =
  | { kind: 'ignore' }
  | { kind: 'nudge_seek' }
  | {
      kind: 'paired';
      nextState: QuickMatchState;
      result: QuickMatchResult;
      matchPacket?: QuickMatchPacket;
    }
  | {
      kind: 'send_busy';
      busyPacket: QuickMatchPacket;
    }
  | {
      kind: 'partner_busy';
      nextState: QuickMatchState;
    };

function isFighterId(value: unknown): value is FighterId {
  return typeof value === 'string' && value in FIGHTERS;
}

export function decidePairHost(idA: string, idB: string): 'a' | 'b' {
  return idA < idB ? 'a' : 'b';
}

export function createQuickMatchState(
  myFighter: FighterId,
  myId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  myRoom = generateRoomCode(6)
): QuickMatchState {
  return {
    myId,
    myRoom: normalizeRoomCode(myRoom),
    myFighter,
    status: 'searching',
    role: null,
    partnerId: null,
    ignoredPartners: new Set<string>(),
  };
}

export function parseQuickMatchPacket(rawJson: string): QuickMatchPacket | null {
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (obj.t === 'seek') {
    if (
      typeof obj.id !== 'string' ||
      !obj.id ||
      typeof obj.room !== 'string' ||
      !isFighterId(obj.fighter)
    ) {
      return null;
    }
    const room = normalizeRoomCode(obj.room);
    if (!isValidRoomCode(room)) return null;
    return {
      t: 'seek',
      id: obj.id,
      room,
      fighter: obj.fighter,
      ts: typeof obj.ts === 'number' ? obj.ts : 0,
    };
  }

  if (obj.t === 'match') {
    if (
      typeof obj.hostId !== 'string' ||
      !obj.hostId ||
      typeof obj.guestId !== 'string' ||
      !obj.guestId ||
      typeof obj.room !== 'string' ||
      !isFighterId(obj.hostFighter) ||
      !isFighterId(obj.guestFighter)
    ) {
      return null;
    }
    const room = normalizeRoomCode(obj.room);
    if (!isValidRoomCode(room)) return null;
    return {
      t: 'match',
      hostId: obj.hostId,
      guestId: obj.guestId,
      room,
      hostFighter: obj.hostFighter,
      guestFighter: obj.guestFighter,
      ts: typeof obj.ts === 'number' ? obj.ts : 0,
    };
  }

  if (obj.t === 'busy') {
    if (
      typeof obj.hostId !== 'string' ||
      !obj.hostId ||
      typeof obj.guestId !== 'string' ||
      !obj.guestId
    ) {
      return null;
    }
    return {
      t: 'busy',
      hostId: obj.hostId,
      guestId: obj.guestId,
      ts: typeof obj.ts === 'number' ? obj.ts : 0,
    };
  }

  return null;
}

/**
 * Pure deterministic matchmaking state reducer.
 * Never compares wall-clock timestamps across devices to avoid clock-skew bugs.
 */
export function evaluateQuickMatchPacket(
  state: QuickMatchState,
  packet: QuickMatchPacket,
  now = Date.now()
): QuickMatchEvaluation {
  if (packet.t === 'seek') {
    if (packet.id === state.myId) return { kind: 'ignore' };
    if (state.ignoredPartners.has(packet.id)) return { kind: 'ignore' };
    if (state.status !== 'searching') return { kind: 'ignore' };

    if (decidePairHost(state.myId, packet.id) === 'a') {
      const nextState: QuickMatchState = {
        ...state,
        status: 'matched',
        role: 'host',
        partnerId: packet.id,
      };
      const matchPacket: QuickMatchPacket = {
        t: 'match',
        hostId: state.myId,
        guestId: packet.id,
        room: state.myRoom,
        hostFighter: state.myFighter,
        guestFighter: packet.fighter,
        ts: now,
      };
      return {
        kind: 'paired',
        nextState,
        result: {
          role: 'host',
          roomCode: state.myRoom,
          myFighter: state.myFighter,
          opponentFighter: packet.fighter,
          partnerId: packet.id,
        },
        matchPacket,
      };
    }

    // Larger ID waits for the smaller ID's host `match` packet, nudging once with `seek`
    return { kind: 'nudge_seek' };
  }

  if (packet.t === 'match') {
    if (packet.guestId !== state.myId) return { kind: 'ignore' };

    if (state.ignoredPartners.has(packet.hostId)) {
      return {
        kind: 'send_busy',
        busyPacket: { t: 'busy', hostId: packet.hostId, guestId: state.myId, ts: now },
      };
    }

    if (state.status === 'matched') {
      if (state.partnerId !== packet.hostId) {
        return {
          kind: 'send_busy',
          busyPacket: { t: 'busy', hostId: packet.hostId, guestId: state.myId, ts: now },
        };
      }
      return { kind: 'ignore' };
    }

    const nextState: QuickMatchState = {
      ...state,
      status: 'matched',
      role: 'guest',
      partnerId: packet.hostId,
    };
    return {
      kind: 'paired',
      nextState,
      result: {
        role: 'guest',
        roomCode: packet.room,
        myFighter: state.myFighter,
        opponentFighter: packet.hostFighter,
        partnerId: packet.hostId,
      },
    };
  }

  if (packet.t === 'busy') {
    if (
      state.status === 'matched' &&
      state.role === 'host' &&
      packet.hostId === state.myId &&
      packet.guestId === state.partnerId
    ) {
      const ignoredPartners = new Set(state.ignoredPartners);
      ignoredPartners.add(packet.guestId);
      const nextState: QuickMatchState = {
        ...state,
        myRoom: generateRoomCode(6),
        status: 'searching',
        role: null,
        partnerId: null,
        ignoredPartners,
      };
      return { kind: 'partner_busy', nextState };
    }
    return { kind: 'ignore' };
  }

  return { kind: 'ignore' };
}

export interface QuickMatchmakerEvents {
  onStatusChange: (status: QuickMatchStatus, detail?: string) => void;
  onMatched: (result: QuickMatchResult) => void;
  onRetrySearch?: () => void;
}

export class QuickMatchmaker {
  private relay: WssRelayClient | null = null;
  private state: QuickMatchState;
  private readonly events: QuickMatchmakerEvents;
  private seekTimer: number | null = null;
  private matchTimeoutTimer: number | null = null;
  private rebroadcastTimers: number[] = [];
  private lastNudgeAt = 0;
  private stopped = false;

  constructor(fighter: FighterId, events: QuickMatchmakerEvents) {
    this.events = events;
    this.state = createQuickMatchState(fighter);
    this.events.onStatusChange('searching');
    this.openRelay();
  }

  public setFighter(fighter: FighterId): void {
    if (this.stopped || this.state.status !== 'searching') return;
    this.state = { ...this.state, myFighter: fighter };
    this.publishSeek();
  }

  public getStatus(): QuickMatchStatus {
    return this.stopped ? 'idle' : this.state.status;
  }

  private openRelay(): void {
    this.relay = new WssRelayClient(
      MATCHMAKING_TOPIC,
      MATCHMAKING_TOPIC,
      `qm_${this.state.myId.slice(-6)}`,
      {
        onReady: () => {
          if (this.stopped) return;
          this.publishSeek();
          this.startSeekLoop();
        },
        onMessage: (rawJson) => {
          if (this.stopped) return;
          const packet = parseQuickMatchPacket(rawJson);
          if (!packet) return;
          this.handlePacket(packet);
        },
        onError: (detail) => {
          if (this.stopped) return;
          this.clearTimers();
          this.events.onStatusChange('error', detail);
        },
      }
    );
  }

  private handlePacket(packet: QuickMatchPacket): void {
    const ev = evaluateQuickMatchPacket(this.state, packet);

    switch (ev.kind) {
      case 'ignore':
        return;

      case 'nudge_seek': {
        const now = performance.now();
        if (now - this.lastNudgeAt >= REPLY_SEEK_COOLDOWN_MS) {
          this.lastNudgeAt = now;
          this.publishSeek();
        }
        return;
      }

      case 'send_busy':
        this.relay?.publishJson(ev.busyPacket);
        return;

      case 'paired': {
        this.state = ev.nextState;
        this.stopSeekLoop();
        this.events.onStatusChange('matched');

        if (ev.matchPacket) {
          this.relay?.publishJson(ev.matchPacket);
          this.clearRebroadcasts();
          for (const delay of MATCH_REBROADCAST_DELAYS_MS) {
            const tid = window.setTimeout(() => {
              if (!this.stopped && this.state.status === 'matched') {
                this.relay?.publishJson(ev.matchPacket);
              }
            }, delay);
            this.rebroadcastTimers.push(tid);
          }
          // Host keeps queue open briefly for rebroadcasts / `busy` rejections, then auto-closes if unneeded
          this.clearMatchTimeout();
          this.matchTimeoutTimer = window.setTimeout(() => {
            if (this.stopped || this.state.status !== 'matched') return;
            // Handshake is now solely in P2PTransport's hands; close matchmaking relay
            this.stop();
          }, MATCH_HANDSHAKE_TIMEOUT_MS);
        } else {
          // Guest immediately yields the matchmaking socket to connect directly to room
          this.stop();
        }

        this.events.onMatched(ev.result);
        return;
      }

      case 'partner_busy': {
        this.state = ev.nextState;
        this.clearRebroadcasts();
        this.clearMatchTimeout();
        this.events.onStatusChange('searching');
        this.events.onRetrySearch?.();
        this.publishSeek();
        this.startSeekLoop();
        return;
      }
    }
  }

  private publishSeek(): void {
    if (this.stopped || this.state.status !== 'searching') return;
    const pkt: QuickMatchPacket = {
      t: 'seek',
      id: this.state.myId,
      room: this.state.myRoom,
      fighter: this.state.myFighter,
      ts: Date.now(),
    };
    this.relay?.publishJson(pkt);
  }

  private startSeekLoop(): void {
    this.stopSeekLoop();
    this.seekTimer = window.setInterval(() => {
      this.publishSeek();
    }, SEEK_INTERVAL_MS);
  }

  private stopSeekLoop(): void {
    if (this.seekTimer !== null) {
      window.clearInterval(this.seekTimer);
      this.seekTimer = null;
    }
  }

  private clearRebroadcasts(): void {
    for (const tid of this.rebroadcastTimers) {
      window.clearTimeout(tid);
    }
    this.rebroadcastTimers = [];
  }

  private clearMatchTimeout(): void {
    if (this.matchTimeoutTimer !== null) {
      window.clearTimeout(this.matchTimeoutTimer);
      this.matchTimeoutTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopSeekLoop();
    this.clearRebroadcasts();
    this.clearMatchTimeout();
  }

  public stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.clearTimers();
    if (this.relay) {
      this.relay.close();
      this.relay = null;
    }
  }
}
