export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type FighterId = 'blaze' | 'gale' | 'titan';
export type StageId = 'sky_temple' | 'twin_pillars';
export type GameMode = 'cpu' | 'local' | 'online';
export type OnlineRole = 'host' | 'guest';
export type OnlineConnectionStatus =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';
export type CpuDifficulty = 'chill' | 'standard' | 'fierce';
export type ProjectileVisual = 'fireball' | 'windblade' | 'boulder';

export type AttackKind =
  | 'jab'
  | 'sideTilt'
  | 'upAir'
  | 'downAir'
  | 'neutralSpecial'
  | 'sideSpecial'
  | 'upSpecial'
  | 'downSpecial';

export interface AttackSpec {
  kind: AttackKind;
  name: string;
  windup: number; // seconds
  active: number; // seconds
  recovery: number; // seconds
  damage: number;
  baseKnockback: number;
  knockbackGrowth: number;
  angleDeg: number; // 0 = forward horizontal, 90 = straight up, -90 = meteor down
  rangeX: number;
  rangeY: number;
  offsetX: number;
  offsetY: number;
  hitstop: number;
  selfVx?: number;
  selfVy?: number;
  projectileSpeed?: number;
  projectileVy?: number;
  projectileGravity?: number;
  projectileRadius?: number;
  projectileVisual?: ProjectileVisual;
  superArmor?: boolean;
  reflectsProjectiles?: boolean;
  isRecovery?: boolean;
  isMeteor?: boolean;
}

export interface FighterSpec {
  id: FighterId;
  name: string;
  archetype: string;
  tagline: string;
  weight: number; // 1.0 baseline; higher = harder to launch
  maxSpeed: number;
  groundAccel: number;
  airAccel: number;
  jumpForce: number;
  doubleJumpForce: number;
  gravity: number;
  fallSpeedMax: number;
  fastFallMax: number;
  width: number;
  height: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  attacks: Record<AttackKind, AttackSpec>;
}

export type PlatformBehavior =
  | {
      kind: 'move';
      ampX: number;
      ampY: number;
      period: number;
      phase?: number;
    }
  | {
      kind: 'shrink';
      period: number;
      solidDuration: number;
      warnDuration: number;
      goneDuration: number;
      minWidth?: number;
      phase?: number;
    };

export interface Platform {
  id: string;
  x: number; // left edge in world units
  y: number; // top surface in world units (Y+ down)
  width: number;
  height: number;
  passThrough: boolean;
  behavior?: PlatformBehavior;
}

export interface RuntimePlatform extends Platform {
  baseX: number;
  baseY: number;
  baseWidth: number;
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;
  active: boolean;
  warningRatio: number; // 0 = stable, >0..1 = shrinking/warning intensity
}

export type StageHazardKind = 'solar_pillar' | 'storm_updraft';

export interface StageHazardSpec {
  kind: StageHazardKind;
  period: number;
  initialDelay: number;
  telegraphDuration: number;
  activeDuration: number;
  width: number;
  yTop: number;
  yBottom: number;
  xSpots: number[];
  damage: number;
  baseKnockback: number;
  knockbackGrowth: number;
  angleDeg: number;
  liftAccel?: number;
}

export interface ActiveHazardState {
  spec: StageHazardSpec;
  phase: 'idle' | 'telegraph' | 'active';
  phaseProgress: number; // 0..1 within current phase
  x: number;
  spotIndex: number;
  hitSlots: [boolean, boolean];
}

export interface StageRuntime {
  platforms: RuntimePlatform[];
  hazard: ActiveHazardState | null;
  cycleTimer: number;
}

export interface StageSpec {
  id: StageId;
  name: string;
  subtitle: string;
  platforms: Platform[];
  hazard?: StageHazardSpec;
  spawns: [ { x: number; y: number; facing: 1 | -1 }, { x: number; y: number; facing: 1 | -1 } ];
  blastZones: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  stoneMain: string;
  stoneTrim: string;
}

export interface FighterInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpJustPressed: boolean;
  jumpHeld: boolean;
  attackJustPressed: boolean;
  specialJustPressed: boolean;
  shieldHeld: boolean;
  dodgeJustPressed: boolean;
}

export interface ActiveAttackState {
  kind: AttackKind;
  elapsed: number;
  hasHit: boolean;
  spec: AttackSpec;
}

export interface LedgeGrabState {
  platformId: string;
  side: -1 | 1; // -1 = left ledge of platform, 1 = right ledge of platform
  ledgeX: number;
  ledgeY: number;
  timer: number;
}

export interface FighterRuntime {
  slot: 0 | 1;
  spec: FighterSpec;
  isCpu: boolean;
  x: number; // center X
  y: number; // feet Y
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  onPassThrough: boolean;
  groundedPlatformId: string | null;
  ledgeGrab: LedgeGrabState | null;
  ledgeCooldown: number;
  dropThroughTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  jumpsRemaining: number;
  upSpecialUsed: boolean;
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
  attack: ActiveAttackState | null;
  squashX: number;
  squashY: number;
  walkPhase: number;
  smokeTimer: number;
  // Match stats
  kos: number;
  deaths: number;
  damageDealt: number;
  peakDamage: number;
  lastHitBySlot: 0 | 1 | null;
}

export interface ProjectileRuntime {
  id: number;
  ownerSlot: 0 | 1;
  visual: ProjectileVisual;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  damage: number;
  baseKnockback: number;
  knockbackGrowth: number;
  angleDeg: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface MatchConfig {
  mode: GameMode;
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  stage: StageId;
  stocks: number;
  difficulty: CpuDifficulty;
  onlineRole?: OnlineRole;
}

export interface FighterHudSnapshot {
  slot: 0 | 1;
  id: FighterId;
  name: string;
  isCpu: boolean;
  isLocalControl?: boolean;
  damage: number;
  stocks: number;
  maxStocks: number;
  shieldRatio: number;
  hitFlash: boolean;
  respawning: boolean;
  primaryColor: string;
  accentColor: string;
}

export interface MatchHudSnapshot {
  fighters: [FighterHudSnapshot, FighterHudSnapshot];
  elapsedSeconds: number;
  countdownText: string | null;
  winnerSlot: 0 | 1 | null;
  koBannerText: string | null;
}

export interface MatchResultSnapshot {
  winnerSlot: 0 | 1;
  winnerName: string;
  loserName: string;
  mode: GameMode;
  stageName: string;
  durationSeconds: number;
  p1Stats: {
    name: string;
    fighterId: FighterId;
    kos: number;
    stocksLeft: number;
    damageDealt: number;
    peakDamage: number;
  };
  p2Stats: {
    name: string;
    fighterId: FighterId;
    kos: number;
    stocksLeft: number;
    damageDealt: number;
    peakDamage: number;
  };
}
