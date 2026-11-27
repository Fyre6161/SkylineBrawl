import Peer, { DataConnection } from 'peerjs';
import {
  generateRoomCode,
  isValidRoomCode,
  NetMessage,
  normalizeRoomCode,
  roomCodeToPeerId,
} from './netcode';
import { OnlineConnectionStatus, OnlineRole } from './types';

export interface P2PEvents {
  onStatusChange: (status: OnlineConnectionStatus, detail?: string) => void;
  onRoomReady: (roomCode: string) => void;
  onMessage: (msg: NetMessage) => void;
  onPingUpdate: (pingMs: number | null) => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class P2PTransport {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private events: P2PEvents;
  private role: OnlineRole | null = null;
  private roomCode = '';
  private pingTimer: number | null = null;
  private connectTimeout: number | null = null;
  private destroyed = false;

  constructor(events: P2PEvents) {
    this.events = events;
  }

  public getRole(): OnlineRole | null {
    return this.role;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public isConnected(): boolean {
    return Boolean(this.conn && this.conn.open);
  }

  public hostRoom(preferredCode?: string): void {
    this.cleanupPeer();
    this.destroyed = false;
    this.role = 'host';
    this.roomCode = preferredCode ? normalizeRoomCode(preferredCode) : generateRoomCode(6);
    this.events.onStatusChange('creating');
    this.events.onPingUpdate(null);

    const peer = new Peer(roomCodeToPeerId(this.roomCode), {
      config: ICE_CONFIG,
      debug: 0,
    });
    this.peer = peer;

    peer.on('open', () => {
      if (this.destroyed || this.peer !== peer) return;
      this.events.onRoomReady(this.roomCode);
      this.events.onStatusChange('waiting');
    });

    peer.on('connection', (incoming) => {
      if (this.destroyed || this.peer !== peer) {
        incoming.close();
        return;
      }
      if (this.conn && this.conn.open) {
        incoming.close();
        return;
      }
      this.attachConnection(incoming);
    });

    peer.on('error', (err) => {
      if (this.destroyed || this.peer !== peer) return;
      const errType = (err as { type?: string })?.type;
      if (errType === 'unavailable-id' && !preferredCode) {
        // Collision on public server; pick a fresh code once automatically
        this.hostRoom();
        return;
      }
      this.events.onStatusChange(
        'error',
        err?.message || 'Could not reach room signaling service.'
      );
    });
  }

  public joinRoom(rawCode: string): void {
    const code = normalizeRoomCode(rawCode);
    if (!isValidRoomCode(code)) {
      this.events.onStatusChange('error', 'Enter a valid 4–8 character room code.');
      return;
    }

    this.cleanupPeer();
    this.destroyed = false;
    this.role = 'guest';
    this.roomCode = code;
    this.events.onStatusChange('connecting');
    this.events.onPingUpdate(null);

    const peer = new Peer({
      config: ICE_CONFIG,
      debug: 0,
    });
    this.peer = peer;

    this.connectTimeout = window.setTimeout(() => {
      if (this.destroyed || this.peer !== peer) return;
      if (!this.conn || !this.conn.open) {
        this.events.onStatusChange(
          'error',
          `Room ${code} did not respond. Check the code and ensure the host is waiting.`
        );
        this.cleanupPeer();
      }
    }, 14000);

    peer.on('open', () => {
      if (this.destroyed || this.peer !== peer) return;
      const conn = peer.connect(roomCodeToPeerId(code), {
        reliable: true,
        serialization: 'json',
      });
      this.attachConnection(conn);
    });

    peer.on('error', (err) => {
      if (this.destroyed || this.peer !== peer) return;
      const errType = (err as { type?: string })?.type;
      const msg =
        errType === 'peer-unavailable'
          ? `Room ${code} was not found.`
          : err?.message || 'Connection failed.';
      this.events.onStatusChange('error', msg);
    });
  }

  private attachConnection(conn: DataConnection): void {
    this.conn = conn;

    conn.on('open', () => {
      if (this.destroyed || this.conn !== conn) return;
      if (this.connectTimeout !== null) {
        window.clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.events.onStatusChange('connected');
      this.startPingLoop();
    });

    conn.on('data', (raw) => {
      if (this.destroyed || this.conn !== conn) return;
      const msg = raw as NetMessage;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

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
    });

    conn.on('close', () => {
      if (this.destroyed || this.conn !== conn) return;
      this.stopPingLoop();
      this.conn = null;
      this.events.onPingUpdate(null);
      if (this.role === 'host') {
        this.events.onStatusChange('disconnected', 'Opponent left the room.');
      } else {
        this.events.onStatusChange('disconnected', 'Disconnected from host.');
      }
    });

    conn.on('error', () => {
      if (this.destroyed || this.conn !== conn) return;
      this.stopPingLoop();
      this.events.onPingUpdate(null);
      this.events.onStatusChange('error', 'Peer connection error.');
    });
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.send({ type: 'ping', ts: performance.now() });
    this.pingTimer = window.setInterval(() => {
      if (this.conn?.open) {
        this.send({ type: 'ping', ts: performance.now() });
      }
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public send(msg: NetMessage): void {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch {
        // Ignore transient closed-channel send race
      }
    }
  }

  private cleanupPeer(): void {
    this.stopPingLoop();
    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
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
    this.cleanupPeer();
    this.role = null;
    this.roomCode = '';
    this.events.onPingUpdate(null);
  }
}
