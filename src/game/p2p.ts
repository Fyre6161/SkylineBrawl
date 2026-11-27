import Peer, { DataConnection } from 'peerjs';
import {
  generateRoomCode,
  isValidRoomCode,
  NetMessage,
  normalizeRoomCode,
  roomCodeToPeerId,
} from './netcode';
import { OnlineConnectionStatus, OnlineRole } from './types';
import { RelayControlMessage, WssRelayClient } from './wssRelay';

export type TransportMode = 'webrtc' | 'relay';

export interface P2PEvents {
  onStatusChange: (
    status: OnlineConnectionStatus,
    detail?: string,
    mode?: TransportMode | null
  ) => void;
  onRoomReady: (roomCode: string) => void;
  onMessage: (msg: NetMessage) => void;
  onPingUpdate: (pingMs: number | null) => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceCandidatePoolSize: 4,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

const RELAY_FALLBACK_DELAY_MS = 3500;
const RELAY_RETRY_INTERVAL_MS = 1500;
const JOIN_TIMEOUT_MS = 22000;
const HEARTBEAT_TIMEOUT_MS = 10000;

function relayTopics(roomCode: string): { h2c: string; c2h: string } {
  const norm = normalizeRoomCode(roomCode);
  return {
    h2c: `skyline-brawl/v1/${norm}/h2c`,
    c2h: `skyline-brawl/v1/${norm}/c2h`,
  };
}

function isRelayControl(raw: unknown): raw is RelayControlMessage {
  return (
    Boolean(raw) &&
    typeof raw === 'object' &&
    '__sbRelay' in (raw as Record<string, unknown>)
  );
}

export class P2PTransport {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private relay: WssRelayClient | null = null;
  private activeMode: TransportMode | null = null;
  private events: P2PEvents;
  private role: OnlineRole | null = null;
  private roomCode = '';
  private pingTimer: number | null = null;
  private connectTimeout: number | null = null;
  private relayFallbackTimer: number | null = null;
  private relayRetryTimer: number | null = null;
  private destroyed = false;

  private hostReadyEmitted = false;
  private peerErrored = false;
  private relayErrored = false;
  private relayHandshakeActive = false;
  private relayNonce = '';
  private lastAckedGuestNonce = '';
  private lastRxAt = 0;

  constructor(events: P2PEvents) {
    this.events = events;
  }

  public getRole(): OnlineRole | null {
    return this.role;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getTransportMode(): TransportMode | null {
    return this.activeMode;
  }

  public isConnected(): boolean {
    if (this.activeMode === 'webrtc') {
      return Boolean(this.conn && this.conn.open);
    }
    if (this.activeMode === 'relay') {
      return Boolean(this.relay && this.relay.isReady());
    }
    return false;
  }

  public hostRoom(preferredCode?: string): void {
    this.cleanupAll();
    this.destroyed = false;
    this.role = 'host';
    this.roomCode = preferredCode ? normalizeRoomCode(preferredCode) : generateRoomCode(6);
    this.hostReadyEmitted = false;
    this.peerErrored = false;
    this.relayErrored = false;
    this.lastAckedGuestNonce = '';
    this.events.onStatusChange('creating', undefined, null);
    this.events.onPingUpdate(null);

    const codeForAttempt = this.roomCode;

    // 1. Open WSS Relay listener in parallel so cross-device NATs & firewalls always connect
    const topics = relayTopics(codeForAttempt);
    this.relay = new WssRelayClient(topics.c2h, topics.h2c, `host_${codeForAttempt}`, {
      onReady: () => {
        if (this.destroyed || this.roomCode !== codeForAttempt) return;
        this.markHostRoomReady();
      },
      onMessage: (rawJson) => {
        if (this.destroyed || this.roomCode !== codeForAttempt) return;
        this.handleRelayIncoming(rawJson);
      },
      onError: (detail) => {
        if (this.destroyed || this.roomCode !== codeForAttempt) return;
        this.relayErrored = true;
        if (this.peerErrored && !this.hostReadyEmitted) {
          this.events.onStatusChange('error', detail, null);
        }
      },
    });

    // 2. Open PeerJS WebRTC signaling for low-latency direct P2P when NAT allows it
    const peer = new Peer(roomCodeToPeerId(codeForAttempt), {
      config: ICE_CONFIG,
      debug: 0,
    });
    this.peer = peer;

    peer.on('open', () => {
      if (this.destroyed || this.peer !== peer) return;
      this.markHostRoomReady();
    });

    peer.on('disconnected', () => {
      if (this.destroyed || this.peer !== peer) return;
      try {
        peer.reconnect();
      } catch {
        // Relay channel stays active as backup
      }
    });

    peer.on('connection', (incoming) => {
      if (this.destroyed || this.peer !== peer) {
        incoming.close();
        return;
      }
      if (this.activeMode === 'webrtc' && this.conn && this.conn.open) {
        incoming.close();
        return;
      }
      if (this.activeMode === 'relay') {
        incoming.close();
        return;
      }
      if (this.conn && !this.conn.open) {
        try {
          this.conn.close();
        } catch {
          // Ignore stale half-open socket
        }
        this.conn = null;
      }
      this.attachWebRtcConnection(incoming);
    });

    peer.on('error', (err) => {
      if (this.destroyed || this.peer !== peer) return;
      const errType = (err as { type?: string })?.type;
      if (errType === 'unavailable-id' && !preferredCode && !this.hostReadyEmitted) {
        this.hostRoom();
        return;
      }
      this.peerErrored = true;
      // Keep room alive if WSS Relay is ready or still connecting
      if (this.relayErrored && !this.hostReadyEmitted) {
        this.events.onStatusChange(
          'error',
          err?.message || 'Could not reach room signaling service.',
          null
        );
      }
    });
  }

  private markHostRoomReady(): void {
    if (this.hostReadyEmitted || this.destroyed) return;
    this.hostReadyEmitted = true;
    this.events.onRoomReady(this.roomCode);
    this.events.onStatusChange('waiting', undefined, null);
  }

  public joinRoom(rawCode: string): void {
    const code = normalizeRoomCode(rawCode);
    if (!isValidRoomCode(code)) {
      this.events.onStatusChange('error', 'Enter a valid 4–8 character room code.', null);
      return;
    }

    this.cleanupAll();
    this.destroyed = false;
    this.role = 'guest';
    this.roomCode = code;
    this.peerErrored = false;
    this.relayErrored = false;
    this.relayHandshakeActive = false;
    this.relayNonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this.events.onStatusChange('connecting', undefined, null);
    this.events.onPingUpdate(null);

    this.connectTimeout = window.setTimeout(() => {
      if (this.destroyed || this.roomCode !== code) return;
      if (!this.isConnected()) {
        this.events.onStatusChange(
          'error',
          `Room ${code} did not respond. Check the code and ensure the host is waiting.`,
          null
        );
        this.cleanupAll();
      }
    }, JOIN_TIMEOUT_MS);

    // 1. Open WSS Relay channel in parallel so fallback is instant if WebRTC cannot traverse NAT
    const topics = relayTopics(code);
    this.relay = new WssRelayClient(topics.h2c, topics.c2h, `guest_${code}`, {
      onReady: () => {
        if (this.destroyed || this.roomCode !== code) return;
        if (this.relayHandshakeActive && this.activeMode !== 'webrtc') {
          this.sendRelayHelloLoop();
        }
      },
      onMessage: (rawJson) => {
        if (this.destroyed || this.roomCode !== code) return;
        this.handleRelayIncoming(rawJson);
      },
      onError: (detail) => {
        if (this.destroyed || this.roomCode !== code) return;
        this.relayErrored = true;
        if (this.peerErrored && !this.isConnected()) {
          this.events.onStatusChange('error', detail, null);
          this.cleanupAll();
        }
      },
    });

    // Give direct WebRTC P2P a short head start, then automatically engage WSS Relay
    this.relayFallbackTimer = window.setTimeout(() => {
      if (this.destroyed || this.roomCode !== code) return;
      if (this.activeMode !== 'webrtc') {
        this.activateRelayFallback();
      }
    }, RELAY_FALLBACK_DELAY_MS);

    // 2. Attempt direct PeerJS WebRTC P2P
    const peer = new Peer({
      config: ICE_CONFIG,
      debug: 0,
    });
    this.peer = peer;

    peer.on('open', () => {
      if (this.destroyed || this.peer !== peer || this.activeMode === 'relay') return;
      const conn = peer.connect(roomCodeToPeerId(code), {
        reliable: true,
        serialization: 'json',
      });
      this.attachWebRtcConnection(conn);
    });

    peer.on('error', () => {
      if (this.destroyed || this.peer !== peer) return;
      this.peerErrored = true;
      if (this.activeMode !== 'webrtc') {
        // Trigger relay immediately instead of making the user wait 3.5s
        this.activateRelayFallback();
      }
      if (this.relayErrored && !this.isConnected()) {
        this.events.onStatusChange('error', `Room ${code} was not found.`, null);
        this.cleanupAll();
      }
    });
  }

  private activateRelayFallback(): void {
    if (this.destroyed || this.activeMode === 'webrtc' || this.relayHandshakeActive) return;
    this.relayHandshakeActive = true;
    if (this.relay?.isReady()) {
      this.sendRelayHelloLoop();
    }
  }

  private sendRelayHelloLoop(): void {
    if (this.destroyed || this.activeMode === 'webrtc' || this.activeMode === 'relay') return;
    const sendHello = () => {
      if (this.destroyed || this.activeMode !== null) {
        this.stopRelayRetry();
        return;
      }
      const ctrl: RelayControlMessage = { __sbRelay: 'hello', nonce: this.relayNonce };
      this.relay?.publishJson(ctrl);
    };
    sendHello();
    this.stopRelayRetry();
    this.relayRetryTimer = window.setInterval(sendHello, RELAY_RETRY_INTERVAL_MS);
  }

  private stopRelayRetry(): void {
    if (this.relayRetryTimer !== null) {
      window.clearInterval(this.relayRetryTimer);
      this.relayRetryTimer = null;
    }
  }

  private handleRelayIncoming(rawJson: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return;
    }

    if (isRelayControl(parsed)) {
      if (parsed.__sbRelay === 'hello' && this.role === 'host') {
        if (this.activeMode === 'webrtc') return;
        const ack: RelayControlMessage = { __sbRelay: 'ack', nonce: parsed.nonce };
        this.relay?.publishJson(ack);
        if (this.activeMode !== 'relay' || this.lastAckedGuestNonce !== parsed.nonce) {
          this.lastAckedGuestNonce = parsed.nonce;
          this.promoteRelayConnection();
        }
      } else if (parsed.__sbRelay === 'ack' && this.role === 'guest') {
        if (parsed.nonce === this.relayNonce && this.activeMode !== 'webrtc') {
          this.promoteRelayConnection();
        }
      }
      return;
    }

    if (this.activeMode !== 'relay') return;
    this.handleNetMessage(parsed);
  }

  private promoteRelayConnection(): void {
    if (this.destroyed) return;
    this.activeMode = 'relay';
    this.lastRxAt = performance.now();
    this.clearConnectTimers();

    // Close any unused WebRTC objects so they cannot fire stale disconnect events
    if (this.conn) {
      const oldConn = this.conn;
      this.conn = null;
      try {
        oldConn.close();
      } catch {
        // Ignore
      }
    }
    if (this.peer) {
      const oldPeer = this.peer;
      this.peer = null;
      try {
        oldPeer.destroy();
      } catch {
        // Ignore
      }
    }

    this.events.onStatusChange('connected', undefined, 'relay');
    this.startPingLoop();
  }

  private attachWebRtcConnection(conn: DataConnection): void {
    this.conn = conn;

    // Monitor underlying RTCPeerConnection ICE state to fail over quickly on strict NATs
    const pc = (conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection;
    if (pc) {
      pc.addEventListener('iceconnectionstatechange', () => {
        if (this.destroyed || this.conn !== conn) return;
        if (pc.iceConnectionState === 'failed') {
          if (this.activeMode === null && this.role === 'guest') {
            this.activateRelayFallback();
          }
        }
      });
    }

    conn.on('open', () => {
      if (this.destroyed || this.conn !== conn || this.activeMode === 'relay') return;
      this.activeMode = 'webrtc';
      this.lastRxAt = performance.now();
      this.clearConnectTimers();
      if (this.relay) {
        this.relay.close();
        this.relay = null;
      }
      this.events.onStatusChange('connected', undefined, 'webrtc');
      this.startPingLoop();
    });

    conn.on('data', (raw) => {
      if (this.destroyed || this.conn !== conn || this.activeMode !== 'webrtc') return;
      this.handleNetMessage(raw);
    });

    conn.on('close', () => {
      if (this.destroyed || this.conn !== conn) return;
      this.conn = null;
      if (this.activeMode !== 'webrtc') {
        if (this.role === 'guest') this.activateRelayFallback();
        return;
      }
      this.stopPingLoop();
      this.activeMode = null;
      this.events.onPingUpdate(null);
      this.events.onStatusChange(
        'disconnected',
        this.role === 'host' ? 'Opponent left the room.' : 'Disconnected from host.',
        null
      );
    });

    conn.on('error', () => {
      if (this.destroyed || this.conn !== conn) return;
      if (this.activeMode !== 'webrtc') {
        if (this.role === 'guest') this.activateRelayFallback();
        return;
      }
      this.stopPingLoop();
      this.activeMode = null;
      this.events.onPingUpdate(null);
      this.events.onStatusChange('error', 'Peer connection error.', null);
    });
  }

  private handleNetMessage(raw: unknown): void {
    const msg = raw as NetMessage;
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return;
    this.lastRxAt = performance.now();

    if (msg.type === 'ping') {
      this.send({ type: 'pong', ts: msg.ts });
      return;
    }
    if (msg.type === 'pong') {
      const rtt = Math.max(1, Math.round(performance.now() - msg.ts));
      this.events.onPingUpdate(rtt);
      return;
    }
    this.events.onMessage(msg);
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.lastRxAt = performance.now();
    this.send({ type: 'ping', ts: performance.now() });
    this.pingTimer = window.setInterval(() => {
      if (!this.isConnected()) return;
      if (performance.now() - this.lastRxAt > HEARTBEAT_TIMEOUT_MS) {
        this.stopPingLoop();
        this.activeMode = null;
        this.events.onPingUpdate(null);
        this.events.onStatusChange(
          'disconnected',
          this.role === 'host' ? 'Opponent timed out.' : 'Lost connection to host.',
          null
        );
        return;
      }
      this.send({ type: 'ping', ts: performance.now() });
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearConnectTimers(): void {
    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    if (this.relayFallbackTimer !== null) {
      window.clearTimeout(this.relayFallbackTimer);
      this.relayFallbackTimer = null;
    }
    this.stopRelayRetry();
  }

  public send(msg: NetMessage): void {
    if (this.activeMode === 'webrtc') {
      if (this.conn && this.conn.open) {
        try {
          this.conn.send(msg);
        } catch {
          // Ignore transient closed-channel send race
        }
      }
    } else if (this.activeMode === 'relay') {
      this.relay?.publishJson(msg);
    }
  }

  private cleanupAll(): void {
    this.stopPingLoop();
    this.clearConnectTimers();
    this.activeMode = null;
    this.relayHandshakeActive = false;
    if (this.relay) {
      this.relay.close();
      this.relay = null;
    }
    if (this.conn) {
      try {
        this.conn.close();
      } catch {
        // Ignore
      }
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.cleanupAll();
    this.role = null;
    this.roomCode = '';
    this.events.onPingUpdate(null);
  }
}
