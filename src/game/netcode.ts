import { FIGHTERS } from './fighters';
import {
  AttackKind,
  FighterId,
  FighterInputState,
  FighterRuntime,
  LedgeGrabState,
  MatchResultSnapshot,
  ProjectileRuntime,
  ProjectileVisual,
  StageId,
} from './types';

const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PEER_PREFIX = 'skyline-brawl-';

export function generateRoomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function isValidRoomCode(code: string): boolean {
  const norm = normalizeRoomCode(code);
  return norm.length >= 4 && norm.length <= 8;
}

export function roomCodeToPeerId(code: string): string {
  return `${PEER_PREFIX}${normalizeRoomCode(code)}`;
}

export function buildRoomInviteUrl(currentHref: string, roomCode: string): string {
  const url = new URL(currentHref);
  url.searchParams.delete('autostart');
  url.searchParams.set('room', normalizeRoomCode(roomCode));
  return url.toString();
}

export function parseRoomFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('room');
  if (!raw) return null;
  const norm = normalizeRoomCode(raw);
  return isValidRoomCode(norm) ? norm : null;
}

export interface NetInputPayload {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpHeld: boolean;
  shieldHeld: boolean;
  jumpSeq: number;
  attackSeq: number;
  specialSeq: number;
  dodgeSeq: number;
}

export class NetInputTracker {
  private lastJumpSeq = 0;
  private lastAttackSeq = 0;
  private lastSpecialSeq = 0;
  private lastDodgeSeq = 0;
  private latestHeld: Omit<
    NetInputPayload,
    'jumpSeq' | 'attackSeq' | 'specialSeq' | 'dodgeSeq'
  > = {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpHeld: false,
    shieldHeld: false,
  };
  private pending: NetInputPayload | null = null;

  public reset(): void {
    this.lastJumpSeq = 0;
    this.lastAttackSeq = 0;
    this.lastSpecialSeq = 0;
    this.lastDodgeSeq = 0;
    this.latestHeld = {
      left: false,
      right: false,
      up: false,
      down: false,
      jumpHeld: false,
      shieldHeld: false,
    };
    this.pending = null;
  }

  public pushRemote(payload: NetInputPayload): void {
    this.latestHeld = {
      left: payload.left,
      right: payload.right,
      up: payload.up,
      down: payload.down,
      jumpHeld: payload.jumpHeld,
      shieldHeld: payload.shieldHeld,
    };
    this.pending = payload;
  }

  public consumeFrameInput(): FighterInputState {
    const p = this.pending;
    let jumpJustPressed = false;
    let attackJustPressed = false;
    let specialJustPressed = false;
    let dodgeJustPressed = false;

    if (p) {
      if (p.jumpSeq > this.lastJumpSeq) {
        this.lastJumpSeq = p.jumpSeq;
        jumpJustPressed = true;
      }
      if (p.attackSeq > this.lastAttackSeq) {
        this.lastAttackSeq = p.attackSeq;
        attackJustPressed = true;
      }
      if (p.specialSeq > this.lastSpecialSeq) {
        this.lastSpecialSeq = p.specialSeq;
        specialJustPressed = true;
      }
      if (p.dodgeSeq > this.lastDodgeSeq) {
        this.lastDodgeSeq = p.dodgeSeq;
        dodgeJustPressed = true;
      }
    }

    return {
      ...this.latestHeld,
      jumpJustPressed,
      attackJustPressed,
      specialJustPressed,
      dodgeJustPressed,
    };
  }
}

export interface NetFighterState {
  id: FighterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  damage: number;
  stocks: number;
  hitstunTimer: number;
  hitFlashTimer: number;
  invulnTimer: number;
  respawnTimer: number;
  shieldHealth: number;
  shieldBrokenTimer: number;
  shielding: boolean;
  dodgeTimer: number;
  squashX: number;
  squashY: number;
  walkPhase: number;
  attackKind: AttackKind | null;
  attackElapsed: number;
  ledgeGrab: LedgeGrabState | null;
}

export interface NetProjectileState {
  id: number;
  ownerSlot: 0 | 1;
  visual: ProjectileVisual;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export type NetEventKind =
  | 'jump'
  | 'doubleJump'
  | 'land'
  | 'dodge'
  | 'ledgeGrab'
  | 'swing'
  | 'hit'
  | 'shieldBlock'
  | 'ko'
  | 'hazardTelegraph'
  | 'hazardErupt';

export interface NetEvent {
  seq: number;
  kind: NetEventKind;
  x: number;
  y: number;
  color?: string;
  heavy?: boolean;
  flag?: boolean;
  dir?: number;
  angle?: number;
}

export interface NetMatchStatePayload {
  seq: number;
  t: number;
  cd: number;
  banner: string | null;
  win: 0 | 1 | null;
  f: [NetFighterState, NetFighterState];
  p: NetProjectileState[];
  ev: NetEvent[];
}

export type NetMessage =
  | {
      type: 'lobby';
      stage: StageId;
      stocks: number;
      p1Fighter: FighterId;
      p2Fighter: FighterId;
      hostReady: boolean;
      guestReady: boolean;
    }
  | {
      type: 'guest_choice';
      fighter: FighterId;
      ready: boolean;
    }
  | {
      type: 'start_match';
      stage: StageId;
      stocks: number;
      p1Fighter: FighterId;
      p2Fighter: FighterId;
    }
  | {
      type: 'input';
      payload: NetInputPayload;
    }
  | {
      type: 'state';
      payload: NetMatchStatePayload;
    }
  | {
      type: 'match_end';
      result: MatchResultSnapshot;
    }
  | {
      type: 'rematch_request';
    }
  | {
      type: 'return_lobby';
    }
  | {
      type: 'ping';
      ts: number;
    }
  | {
      type: 'pong';
      ts: number;
    };

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function serializeFighterState(f: FighterRuntime): NetFighterState {
  return {
    id: f.spec.id,
    x: r1(f.x),
    y: r1(f.y),
    vx: r1(f.vx),
    vy: r1(f.vy),
    facing: f.facing,
    grounded: f.grounded,
    damage: Math.round(f.damage),
    stocks: f.stocks,
    hitstunTimer: r2(f.hitstunTimer),
    hitFlashTimer: r2(f.hitFlashTimer),
    invulnTimer: r2(f.invulnTimer),
    respawnTimer: r2(f.respawnTimer),
    shieldHealth: Math.round(f.shieldHealth),
    shieldBrokenTimer: r2(f.shieldBrokenTimer),
    shielding: f.shielding,
    dodgeTimer: r2(f.dodgeTimer),
    squashX: r2(f.squashX),
    squashY: r2(f.squashY),
    walkPhase: r2(f.walkPhase),
    attackKind: f.attack ? f.attack.kind : null,
    attackElapsed: f.attack ? r2(f.attack.elapsed) : 0,
    ledgeGrab: f.ledgeGrab ? { ...f.ledgeGrab } : null,
  };
}

export function applyFighterState(target: FighterRuntime, snap: NetFighterState): void {
  if (target.spec.id !== snap.id) {
    target.spec = FIGHTERS[snap.id];
  }
  target.x = snap.x;
  target.y = snap.y;
  target.vx = snap.vx;
  target.vy = snap.vy;
  target.facing = snap.facing;
  target.grounded = snap.grounded;
  target.damage = snap.damage;
  target.stocks = snap.stocks;
  target.hitstunTimer = snap.hitstunTimer;
  target.hitFlashTimer = snap.hitFlashTimer;
  target.invulnTimer = snap.invulnTimer;
  target.respawnTimer = snap.respawnTimer;
  target.shieldHealth = snap.shieldHealth;
  target.shieldBrokenTimer = snap.shieldBrokenTimer;
  target.shielding = snap.shielding;
  target.dodgeTimer = snap.dodgeTimer;
  target.squashX = snap.squashX;
  target.squashY = snap.squashY;
  target.walkPhase = snap.walkPhase;
  target.ledgeGrab = snap.ledgeGrab ? { ...snap.ledgeGrab } : null;

  if (snap.attackKind) {
    const spec = target.spec.attacks[snap.attackKind];
    target.attack = {
      kind: snap.attackKind,
      elapsed: snap.attackElapsed,
      hasHit: false,
      spec,
    };
  } else {
    target.attack = null;
  }
}

export function serializeProjectiles(projectiles: ProjectileRuntime[]): NetProjectileState[] {
  return projectiles.map((p) => ({
    id: p.id,
    ownerSlot: p.ownerSlot,
    visual: p.visual,
    x: r1(p.x),
    y: r1(p.y),
    vx: r1(p.vx),
    vy: r1(p.vy),
    radius: p.radius,
    color: p.color,
  }));
}

export function deserializeProjectiles(items: NetProjectileState[]): ProjectileRuntime[] {
  return items.map((p) => ({
    id: p.id,
    ownerSlot: p.ownerSlot,
    visual: p.visual,
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
    gravity: 0,
    radius: p.radius,
    damage: 0,
    baseKnockback: 0,
    knockbackGrowth: 0,
    angleDeg: 0,
    color: p.color,
    life: 0,
    maxLife: 1.6,
  }));
}
