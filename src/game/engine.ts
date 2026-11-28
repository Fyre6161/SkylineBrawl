import { SoundSynth } from './audio';
import { CpuBrainState, computeCpuInput, createCpuBrain } from './ai';
import {
  applyHit,
  boxesOverlap,
  checkBlastZone,
  checkProjectileHit,
  consumeRangedSpecialShot,
  coolRangedHeat,
  createFighterRuntime,
  getAttackHitbox,
  getHurtbox,
  isAttackActive,
  respawnFighter,
  tryReflectProjectiles,
} from './combat';
import { FIGHTERS } from './fighters';
import {
  applyStageHazardEffects,
  createStageRuntime,
  stepStageRuntime,
} from './hazards';
import {
  createEmptyGamepadEdgeState,
  createEmptyInput,
  GamepadEdgeState,
  getConnectedGamepads,
  mapGamepadToInput,
  mergeFighterInputs,
} from './gamepad';
import {
  cloneHotkeySettings,
  createDefaultHotkeys,
  HotkeySettings,
  isHotkeyBound,
  readInputFromBindings,
} from './hotkeys';
import { TouchInputBuffer } from './touchInput';
import {
  applyFighterState,
  deserializeProjectiles,
  NetEvent,
  NetEventKind,
  NetInputPayload,
  NetInputTracker,
  NetMatchStatePayload,
  NetMessage,
  serializeFighterState,
  serializeProjectiles,
} from './netcode';
import { ParticlePool } from './particles';
import { computeDynamicCamera, stepFighterPhysics } from './physics';
import { BlastBeamEffect, renderArena } from './renderer';
import { STAGES } from './stages';
import {
  FighterHudSnapshot,
  FighterInputState,
  FighterRuntime,
  GameScreenState,
  MatchConfig,
  MatchHudSnapshot,
  MatchResultSnapshot,
  ProjectileRuntime,
  StageRuntime,
  StageSpec,
} from './types';

export interface EngineCallbacks {
  onHudUpdate: (hud: MatchHudSnapshot) => void;
  onMatchEnd: (result: MatchResultSnapshot) => void;
  onScreenStateRequest?: (next: GameScreenState) => void;
  onSendNetMessage?: (msg: NetMessage) => void;
}

const EMPTY_INPUT: FighterInputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jumpJustPressed: false,
  jumpHeld: false,
  attackJustPressed: false,
  specialJustPressed: false,
  shieldHeld: false,
  dodgeJustPressed: false,
};

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  public readonly audio = new SoundSynth();
  private particles = new ParticlePool();

  private screenState: GameScreenState = 'title';
  private config: MatchConfig;
  private stage: StageSpec;
  private stageRuntime: StageRuntime;
  private fighters: [FighterRuntime, FighterRuntime];
  private projectiles: ProjectileRuntime[] = [];
  private blastBeams: BlastBeamEffect[] = [];
  private cpuBrain: CpuBrainState = createCpuBrain();

  private keysHeld = new Set<string>();
  private keysJustPressed = new Set<string>();
  private hotkeys: HotkeySettings = createDefaultHotkeys();
  public readonly touchInput = new TouchInputBuffer();
  private touchFrameInput: FighterInputState = { ...EMPTY_INPUT };
  private gamepadEdges: [GamepadEdgeState, GamepadEdgeState] = [
    createEmptyGamepadEdgeState(),
    createEmptyGamepadEdgeState(),
  ];
  private gamepadFrameInputs: [FighterInputState, FighterInputState] = [
    { ...EMPTY_INPUT },
    { ...EMPTY_INPUT },
  ];

  private rafId = 0;
  private paceTimerId = 0;
  private destroyed = false;
  private lastTime = 0;
  private worldTime = 0;
  private matchElapsed = 0;
  private countdownTimer = 0;
  private lastCountdownInt = 4;
  private hitstopTimer = 0;
  private trauma = 0;
  private koBannerTimer = 0;
  private koBannerText: string | null = null;
  private matchEndDelayTimer = -1;
  private winnerSlot: 0 | 1 | null = null;
  private nextProjId = 1;
  private lastHudKey = '';

  // Online P2P netcode state
  private remoteInputTracker = new NetInputTracker();
  private pendingNetEvents: NetEvent[] = [];
  private nextNetEventSeq = 1;
  private netStateSeq = 0;
  private netSyncAccum = 0;
  private lastRemoteStateSeq = 0;
  private lastRemoteEventSeq = 0;
  private guestJumpSeq = 0;
  private guestAttackSeq = 0;
  private guestSpecialSeq = 0;
  private guestDodgeSeq = 0;
  private lastSentInputKey = '';
  private guestInputAccum = 0;

  private camX = 0;
  private camY = 0;
  private camZoom = 1;
  private viewportW = 1280;
  private viewportH = 720;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLElement,
    initialConfig: MatchConfig,
    callbacks: EngineCallbacks
  ) {
    this.callbacks = callbacks;
    this.config = { ...initialConfig };
    this.stage = STAGES[this.config.stage];
    this.stageRuntime = createStageRuntime(this.stage);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'block w-full h-full outline-none';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('data-testid', 'game-canvas');
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize 2D context');
    this.ctx = ctx;

    this.fighters = this.spawnPair();
    this.setupResize(container);
    this.bindEvents();
    this.emitHudSnapshot();

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private spawnPair(): [FighterRuntime, FighterRuntime] {
    return [
      createFighterRuntime(0, FIGHTERS[this.config.p1Fighter], false, this.stage, this.config.stocks),
      createFighterRuntime(
        1,
        FIGHTERS[this.config.p2Fighter],
        this.config.mode === 'cpu',
        this.stage,
        this.config.stocks
      ),
    ];
  }

  private setupResize(container: HTMLElement): void {
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.viewportW = Math.max(320, rect.width);
      this.viewportH = Math.max(240, rect.height);
      this.canvas.width = Math.round(this.viewportW * dpr);
      this.canvas.height = Math.round(this.viewportH * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateSize();
    this.resizeObserver = new ResizeObserver(updateSize);
    this.resizeObserver.observe(container);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (
      this.screenState === 'playing' &&
      (code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        isHotkeyBound(this.hotkeys, this.config.mode, code))
    ) {
      e.preventDefault();
    }

    if (e.repeat) return;
    try {
      this.audio.unlock();
    } catch {
      // Ignore audio context restriction errors
    }

    if (this.screenState === 'playing') {
      const boundToGame = isHotkeyBound(this.hotkeys, this.config.mode, code);
      if (
        code === 'Escape' ||
        e.key === 'Escape' ||
        (!boundToGame && (code === 'KeyP' || e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
        this.callbacks.onScreenStateRequest?.('paused');
        return;
      }
      if (!boundToGame && code === 'KeyM') {
        this.audio.setMuted(!this.audio.isMuted());
        return;
      }
    }

    if (!this.keysHeld.has(code)) {
      this.keysJustPressed.add(code);
    }
    this.keysHeld.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = (): void => {
    this.clearInputs();
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.clearInputs();
    }
  };

  private handlePointerDown = (): void => {
    this.audio.unlock();
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  public destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.paceTimerId) window.clearTimeout(this.paceTimerId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.canvas.remove();
  }

  public clearInputs(): void {
    this.keysHeld.clear();
    this.keysJustPressed.clear();
    this.touchInput.clear();
    this.touchFrameInput = createEmptyInput();
    this.gamepadFrameInputs = [createEmptyInput(), createEmptyInput()];
    const pads = getConnectedGamepads();
    this.gamepadEdges = [
      { ...createEmptyGamepadEdgeState(), pause: Boolean(pads[0]?.buttons[9]?.pressed) },
      { ...createEmptyGamepadEdgeState(), pause: Boolean(pads[1]?.buttons[9]?.pressed) },
    ];
  }

  public setHotkeys(next: HotkeySettings): void {
    this.hotkeys = cloneHotkeySettings(next);
  }

  private isPausedFreeze(): boolean {
    return this.screenState === 'paused' && this.config.mode !== 'online';
  }

  public setScreenState(next: GameScreenState): void {
    const prev = this.screenState;
    const wasFrozen = prev === 'paused' && this.config.mode !== 'online';
    this.screenState = next;
    if (next === 'playing') {
      this.clearInputs();
      this.canvas.focus();
      if (wasFrozen) {
        this.lastTime = performance.now();
        this.scheduleNextFrame(0);
      }
    } else {
      this.clearInputs();
      if (next === 'paused' && this.config.mode !== 'online') {
        this.renderFrame();
      } else if (wasFrozen) {
        this.lastTime = performance.now();
        this.scheduleNextFrame(0);
      }
    }
  }

  public updatePreviewConfig(config: MatchConfig): void {
    this.config = { ...config };
    this.stage = STAGES[this.config.stage];
    this.stageRuntime = createStageRuntime(this.stage);
    if (this.screenState === 'title') {
      this.fighters = this.spawnPair();
      this.projectiles = [];
      this.particles.clear();
      this.emitHudSnapshot();
    }
  }

  public startNewMatch(config: MatchConfig, skipCountdown = false): void {
    this.config = { ...config };
    this.stage = STAGES[this.config.stage];
    this.stageRuntime = createStageRuntime(this.stage);
    this.fighters = this.spawnPair();
    this.projectiles = [];
    this.blastBeams = [];
    this.particles.clear();
    this.cpuBrain = createCpuBrain();
    this.matchElapsed = 0;
    this.countdownTimer = skipCountdown ? 0 : 1.5;
    this.lastCountdownInt = skipCountdown ? 0 : 4;
    this.hitstopTimer = 0;
    this.trauma = 0;
    this.koBannerTimer = 0;
    this.koBannerText = null;
    this.matchEndDelayTimer = -1;
    this.winnerSlot = null;

    this.remoteInputTracker.reset();
    this.pendingNetEvents = [];
    this.nextNetEventSeq = 1;
    this.netStateSeq = 0;
    this.netSyncAccum = 0;
    this.lastRemoteStateSeq = 0;
    this.lastRemoteEventSeq = 0;
    this.guestJumpSeq = 0;
    this.guestAttackSeq = 0;
    this.guestSpecialSeq = 0;
    this.guestDodgeSeq = 0;
    this.lastSentInputKey = '';
    this.guestInputAccum = 0;

    const wasFrozen = this.screenState === 'paused' && this.config.mode !== 'online';
    this.clearInputs();
    this.screenState = 'playing';
    this.canvas.focus();
    this.lastHudKey = '';
    this.emitHudSnapshot();
    if (wasFrozen) {
      this.lastTime = performance.now();
      this.scheduleNextFrame(0);
    }
  }

  public pushRemoteInput(payload: NetInputPayload): void {
    this.remoteInputTracker.pushRemote(payload);
  }

  public applyRemoteState(payload: NetMatchStatePayload): void {
    if (this.config.mode !== 'online' || this.config.onlineRole !== 'guest') return;
    if (payload.seq <= this.lastRemoteStateSeq) return;
    this.lastRemoteStateSeq = payload.seq;

    const prevCountdown = this.countdownTimer;
    this.matchElapsed = payload.t;
    this.countdownTimer = payload.cd;

    if (this.countdownTimer > 0) {
      const sec = Math.ceil(this.countdownTimer * 2);
      if (sec !== this.lastCountdownInt && sec > 0) {
        this.lastCountdownInt = sec;
        this.audio.playCountdown(false);
      }
    } else if (prevCountdown > 0 && this.countdownTimer === 0) {
      this.audio.playCountdown(true);
    }

    if (payload.banner && payload.banner !== this.koBannerText) {
      this.koBannerTimer = 0.85;
    } else if (!payload.banner && this.koBannerTimer <= 0) {
      this.koBannerText = null;
    }
    if (payload.banner) {
      this.koBannerText = payload.banner;
    }
    this.winnerSlot = payload.win;

    applyFighterState(this.fighters[0], payload.f[0]);
    applyFighterState(this.fighters[1], payload.f[1]);
    this.projectiles = deserializeProjectiles(payload.p);
    stepStageRuntime(this.stageRuntime, this.matchElapsed, {
      hazardsEnabled: this.countdownTimer <= 0,
    });

    for (const ev of payload.ev) {
      if (ev.seq <= this.lastRemoteEventSeq) continue;
      this.lastRemoteEventSeq = ev.seq;
      this.replayNetEvent(ev);
    }

    this.emitHudSnapshot();
  }

  public applyRemoteMatchEnd(result: MatchResultSnapshot): void {
    this.winnerSlot = result.winnerSlot;
    this.audio.playVictory();
    this.emitHudSnapshot();
    this.callbacks.onMatchEnd(result);
  }

  private queueNetEvent(
    kind: NetEventKind,
    x: number,
    y: number,
    extra?: Omit<NetEvent, 'seq' | 'kind' | 'x' | 'y'>
  ): void {
    if (this.config.mode !== 'online' || this.config.onlineRole !== 'host') return;
    this.pendingNetEvents.push({
      seq: this.nextNetEventSeq++,
      kind,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      ...extra,
    });
  }

  private replayNetEvent(ev: NetEvent): void {
    switch (ev.kind) {
      case 'jump':
        this.audio.playJump(false);
        this.particles.spawnDust(ev.x, ev.y, -(ev.dir ?? 1), 4);
        break;
      case 'doubleJump':
        this.audio.playJump(true);
        this.particles.spawnRing(ev.x, ev.y, ev.color ?? '#93C5FD', 8, 130);
        break;
      case 'land':
        this.audio.playLand();
        this.particles.spawnDust(ev.x, ev.y, 0, 5);
        break;
      case 'dodge':
        this.particles.spawnRing(ev.x, ev.y, '#E2E8F0', 10, 140);
        break;
      case 'ledgeGrab':
        this.audio.playLedgeGrab();
        this.particles.spawnRing(ev.x, ev.y, ev.color ?? '#FBBF24', 9, 130);
        this.particles.spawnBurst(ev.x, ev.y, 6, 180, ev.color ?? '#FBBF24', 'spark');
        break;
      case 'swing':
        this.audio.playSwing(Boolean(ev.heavy));
        break;
      case 'hit':
        this.audio.playHit(Boolean(ev.heavy), ev.dir ?? 20);
        this.particles.spawnBurst(
          ev.x,
          ev.y,
          ev.heavy ? 18 : 9,
          ev.heavy ? 480 : 280,
          ev.heavy ? '#FDE047' : '#F8FAFC',
          ev.heavy ? 'star' : 'spark'
        );
        this.particles.spawnRing(
          ev.x,
          ev.y,
          ev.heavy ? '#FB923C' : '#F8FAFC',
          10,
          ev.heavy ? 260 : 140
        );
        this.trauma = Math.min(1, this.trauma + (ev.heavy ? 0.45 : 0.2));
        break;
      case 'shieldBlock':
        this.audio.playShieldBlock(Boolean(ev.flag));
        this.particles.spawnRing(ev.x, ev.y, ev.flag ? '#FACC15' : '#93C5FD', 12, 180);
        if (ev.flag) {
          this.trauma = Math.min(1, this.trauma + 0.55);
        }
        break;
      case 'ko': {
        const victimSlot = ev.dir === 1 ? 1 : 0;
        const spec = this.fighters[victimSlot].spec;
        this.triggerKoSpectacle(
          ev.x,
          ev.y,
          ev.angle ?? 0,
          ev.color ?? spec.primaryColor,
          spec.accentColor,
          Boolean(ev.flag)
        );
        break;
      }
      case 'hazardTelegraph':
        this.audio.playHazardTelegraph();
        break;
      case 'hazardErupt': {
        const isWind = Boolean(ev.flag);
        this.audio.playHazardErupt(isWind);
        this.particles.spawnBurst(
          ev.x,
          ev.y,
          14,
          360,
          isWind ? '#67E8F9' : '#FEF08A',
          isWind ? 'spark' : 'star'
        );
        if (!isWind) {
          this.trauma = Math.min(1, this.trauma + 0.28);
        }
        break;
      }
    }
  }

  private pollExternalInputs(): boolean {
    this.touchFrameInput = this.touchInput.consumeFrameInput();
    const pads = getConnectedGamepads();
    let pauseRequested = false;

    if (this.config.mode === 'local') {
      const p1Tap = this.hotkeys.localP1TapJump;
      const p2Tap = this.hotkeys.localP2TapJump;
      const r0 = mapGamepadToInput(pads[0], this.gamepadEdges[0], p1Tap);
      const r1 = mapGamepadToInput(pads[1], this.gamepadEdges[1], p2Tap);
      this.gamepadEdges[0] = r0.nextEdge;
      this.gamepadEdges[1] = r1.nextEdge;
      this.gamepadFrameInputs = [r0.input, r1.input];
      pauseRequested = r0.pauseJustPressed || r1.pauseJustPressed;
    } else {
      const r0 = mapGamepadToInput(pads[0], this.gamepadEdges[0], this.hotkeys.singleTapJump);
      this.gamepadEdges[0] = r0.nextEdge;
      this.gamepadEdges[1] = createEmptyGamepadEdgeState();
      this.gamepadFrameInputs = [r0.input, createEmptyInput()];
      pauseRequested = r0.pauseJustPressed;
    }

    return pauseRequested;
  }

  private readPlayerInput(slot: 0 | 1): FighterInputState {
    if (this.screenState === 'paused') {
      return { ...EMPTY_INPUT };
    }

    if (this.config.mode === 'cpu' || this.config.mode === 'online') {
      const kb = readInputFromBindings(
        this.keysHeld,
        this.keysJustPressed,
        this.hotkeys.singlePrimary,
        this.hotkeys.singleSecondary,
        this.hotkeys.singleTapJump
      );
      return mergeFighterInputs(
        mergeFighterInputs(kb, this.gamepadFrameInputs[0]),
        this.touchFrameInput
      );
    }

    if (slot === 0) {
      const kb1 = readInputFromBindings(
        this.keysHeld,
        this.keysJustPressed,
        this.hotkeys.localP1,
        undefined,
        this.hotkeys.localP1TapJump
      );
      return mergeFighterInputs(
        mergeFighterInputs(kb1, this.gamepadFrameInputs[0]),
        this.touchFrameInput
      );
    }

    const kb2 = readInputFromBindings(
      this.keysHeld,
      this.keysJustPressed,
      this.hotkeys.localP2,
      undefined,
      this.hotkeys.localP2TapJump
    );
    return mergeFighterInputs(kb2, this.gamepadFrameInputs[1]);
  }

  private scheduleNextFrame(renderMs: number): void {
    if (this.destroyed) return;
    if (this.isPausedFreeze()) return;
    if (renderMs > 10) {
      this.paceTimerId = window.setTimeout(() => {
        if (!this.destroyed && !this.isPausedFreeze()) {
          this.rafId = requestAnimationFrame(this.loop);
        }
      }, 32);
    } else {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  private loop = (now: number): void => {
    if (this.destroyed) return;
    if (this.isPausedFreeze()) return;
    const frameStart = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.worldTime += dt;

    const gamepadPaused = this.pollExternalInputs();
    if (gamepadPaused && this.screenState === 'playing') {
      this.callbacks.onScreenStateRequest?.('paused');
    } else if (this.screenState === 'title') {
      this.stepTitlePreview(dt);
    } else if (
      this.screenState === 'playing' ||
      (this.screenState === 'paused' && this.config.mode === 'online')
    ) {
      this.stepPlaying(dt);
    }

    this.keysJustPressed.clear();
    this.renderFrame();

    const renderMs = performance.now() - frameStart;
    this.scheduleNextFrame(renderMs);
  };

  private stepTitlePreview(dt: number): void {
    // Gentle world pan + moving platform preview without damaging hazards
    stepStageRuntime(this.stageRuntime, this.worldTime, { hazardsEnabled: false });
    this.camX = Math.sin(this.worldTime * 0.35) * 70;
    this.camY = -12 + Math.cos(this.worldTime * 0.25) * 14;
    const baseScale = Math.min(this.viewportW / 1180, this.viewportH / 680);
    this.camZoom = baseScale * 1.02;
    this.particles.update(dt);
  }

  private stepGuestPlaying(dt: number): void {
    this.trauma = Math.max(0, this.trauma - 1.9 * dt);
    this.particles.update(dt);
    for (let i = this.blastBeams.length - 1; i >= 0; i--) {
      this.blastBeams[i].life += dt;
      if (this.blastBeams[i].life >= this.blastBeams[i].maxLife) {
        this.blastBeams.splice(i, 1);
      }
    }
    if (this.koBannerTimer > 0) {
      this.koBannerTimer = Math.max(0, this.koBannerTimer - dt);
      if (this.koBannerTimer === 0) this.koBannerText = null;
    }

    // Send local guest input state reliably whenever changed or at 30Hz heartbeat
    const input = this.readPlayerInput(1);
    if (input.jumpJustPressed) this.guestJumpSeq += 1;
    if (input.attackJustPressed) this.guestAttackSeq += 1;
    if (input.specialJustPressed) this.guestSpecialSeq += 1;
    if (input.dodgeJustPressed) this.guestDodgeSeq += 1;

    const payload: NetInputPayload = {
      left: input.left,
      right: input.right,
      up: input.up,
      down: input.down,
      jumpHeld: input.jumpHeld,
      shieldHeld: input.shieldHeld,
      jumpSeq: this.guestJumpSeq,
      attackSeq: this.guestAttackSeq,
      specialSeq: this.guestSpecialSeq,
      dodgeSeq: this.guestDodgeSeq,
    };

    const inputKey = `${payload.left ? 1 : 0}${payload.right ? 1 : 0}${payload.up ? 1 : 0}${payload.down ? 1 : 0}${payload.jumpHeld ? 1 : 0}${payload.shieldHeld ? 1 : 0}:${payload.jumpSeq}:${payload.attackSeq}:${payload.specialSeq}:${payload.dodgeSeq}`;
    this.guestInputAccum += dt;
    if (inputKey !== this.lastSentInputKey || this.guestInputAccum >= 0.033) {
      this.lastSentInputKey = inputKey;
      this.guestInputAccum = 0;
      this.callbacks.onSendNetMessage?.({ type: 'input', payload });
    }

    // Smooth visual interpolation between authoritative host snapshots
    if (this.countdownTimer <= 0) {
      this.matchElapsed += dt;
      stepStageRuntime(this.stageRuntime, this.matchElapsed, { hazardsEnabled: true });
      for (const f of this.fighters) {
        if (f.stocks <= 0 || f.respawnTimer > 0 || f.ledgeGrab) continue;
        f.x += f.vx * dt * 0.55;
        f.y += f.vy * dt * 0.55;
      }
      for (const p of this.projectiles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    } else {
      stepStageRuntime(this.stageRuntime, this.matchElapsed, { hazardsEnabled: false });
    }

    this.updateCamera(dt);
    this.emitHudSnapshot();
  }

  private broadcastHostState(force = false): void {
    if (this.config.mode !== 'online' || this.config.onlineRole !== 'host') return;
    if (!force && this.netSyncAccum < 1 / 30 && this.pendingNetEvents.length === 0) return;
    this.netSyncAccum = 0;
    const ev = this.pendingNetEvents;
    this.pendingNetEvents = [];
    this.callbacks.onSendNetMessage?.({
      type: 'state',
      payload: {
        seq: ++this.netStateSeq,
        t: Math.round(this.matchElapsed * 1000) / 1000,
        cd: Math.round(this.countdownTimer * 1000) / 1000,
        banner: this.koBannerText,
        win: this.winnerSlot,
        f: [serializeFighterState(this.fighters[0]), serializeFighterState(this.fighters[1])],
        p: serializeProjectiles(this.projectiles),
        ev,
      },
    });
  }

  private stepPlaying(dt: number): void {
    if (this.config.mode === 'online' && this.config.onlineRole === 'guest') {
      this.stepGuestPlaying(dt);
      return;
    }

    // Trauma decay & particle visual updates always tick in real dt even during hitstop
    this.trauma = Math.max(0, this.trauma - 1.9 * dt);
    this.particles.update(dt);
    for (let i = this.blastBeams.length - 1; i >= 0; i--) {
      this.blastBeams[i].life += dt;
      if (this.blastBeams[i].life >= this.blastBeams[i].maxLife) {
        this.blastBeams.splice(i, 1);
      }
    }

    if (this.koBannerTimer > 0) {
      this.koBannerTimer = Math.max(0, this.koBannerTimer - dt);
      if (this.koBannerTimer === 0) this.koBannerText = null;
    }

    this.netSyncAccum += dt;

    // Countdown before match starts
    if (this.countdownTimer > 0) {
      this.countdownTimer = Math.max(0, this.countdownTimer - dt);
      const sec = Math.ceil(this.countdownTimer * 2);
      if (sec !== this.lastCountdownInt && sec > 0) {
        this.lastCountdownInt = sec;
        this.audio.playCountdown(false);
      }
      if (this.countdownTimer === 0) {
        this.audio.playCountdown(true);
        this.koBannerText = 'FIGHT!';
        this.koBannerTimer = 0.75;
      }
      this.updateCamera(dt);
      this.emitHudSnapshot();
      this.broadcastHostState(this.countdownTimer === 0);
      return;
    }

    // Victory beat delay before showing modal
    if (this.matchEndDelayTimer > 0) {
      this.matchEndDelayTimer = Math.max(0, this.matchEndDelayTimer - dt);
      if (this.matchEndDelayTimer === 0 && this.winnerSlot !== null) {
        this.audio.playVictory();
        this.finalizeMatch(this.winnerSlot);
        return;
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateCamera(dt);
      this.broadcastHostState();
      return;
    }

    this.matchElapsed += dt;

    // Step dynamic stage platforms & hazards
    const stageEvents = stepStageRuntime(this.stageRuntime, this.matchElapsed, {
      hazardsEnabled: true,
    });
    if (stageEvents.telegraphStarted) {
      this.audio.playHazardTelegraph();
      this.queueNetEvent('hazardTelegraph', 0, 0);
    }
    if (stageEvents.erupted && this.stageRuntime.hazard) {
      const haz = this.stageRuntime.hazard;
      const isWind = haz.spec.kind === 'storm_updraft';
      const eruptY = isWind ? 80 : haz.spec.yBottom - 16;
      this.audio.playHazardErupt(isWind);
      this.particles.spawnBurst(
        haz.x,
        eruptY,
        14,
        360,
        isWind ? '#67E8F9' : '#FEF08A',
        isWind ? 'spark' : 'star'
      );
      if (!isWind) {
        this.trauma = Math.min(1, this.trauma + 0.28);
      }
      this.queueNetEvent('hazardErupt', haz.x, eruptY, { flag: isWind });
    }
    for (const collapsed of stageEvents.collapsedPlatforms) {
      this.particles.spawnDust(collapsed.baseX + collapsed.baseWidth * 0.5, collapsed.baseY, 0, 8);
    }
    for (const reformed of stageEvents.reformedPlatforms) {
      this.particles.spawnRing(
        reformed.baseX + reformed.baseWidth * 0.5,
        reformed.baseY + reformed.height * 0.5,
        '#94A3B8',
        12,
        140
      );
    }

    // Step fighters
    const inputs: [FighterInputState, FighterInputState] = [
      this.readPlayerInput(0),
      this.config.mode === 'cpu'
        ? computeCpuInput(
            this.fighters[1],
            this.fighters[0],
            this.stage,
            this.config.difficulty,
            this.cpuBrain,
            dt,
            this.stageRuntime.platforms,
            this.stageRuntime.hazard
          )
        : this.config.mode === 'online'
          ? this.remoteInputTracker.consumeFrameInput()
          : this.readPlayerInput(1),
    ];

    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i];
      if (f.stocks <= 0) continue;

      const ev = stepFighterPhysics(f, inputs[i], this.stage, dt, this.stageRuntime.platforms);
      if (ev.jumped) {
        this.audio.playJump(false);
        this.particles.spawnDust(f.x, f.y, -f.facing, 4);
        this.queueNetEvent('jump', f.x, f.y, { dir: f.facing });
      }
      if (ev.doubleJumped) {
        this.audio.playJump(true);
        this.particles.spawnRing(f.x, f.y, f.spec.accentColor, 8, 130);
        this.queueNetEvent('doubleJump', f.x, f.y, { color: f.spec.accentColor });
      }
      if (ev.landed) {
        this.audio.playLand();
        this.particles.spawnDust(f.x, f.y, 0, 5);
        this.queueNetEvent('land', f.x, f.y);
      }
      if (ev.dodged) {
        const dy = f.y - f.spec.height * 0.5;
        this.particles.spawnRing(f.x, dy, '#E2E8F0', 10, 140);
        this.queueNetEvent('dodge', f.x, dy);
      }
      if (ev.grabbedLedge) {
        this.audio.playLedgeGrab();
        this.particles.spawnRing(ev.grabbedLedge.x, ev.grabbedLedge.y, f.spec.accentColor, 9, 130);
        this.particles.spawnBurst(ev.grabbedLedge.x, ev.grabbedLedge.y, 6, 180, f.spec.accentColor, 'spark');
        this.queueNetEvent('ledgeGrab', ev.grabbedLedge.x, ev.grabbedLedge.y, { color: f.spec.accentColor });
      }
      if (ev.startedAttack) {
        const heavy = ev.startedAttack.includes('Special') || ev.startedAttack === 'sideTilt';
        this.audio.playSwing(heavy);
        this.queueNetEvent('swing', f.x, f.y, { heavy });
      }
      if (ev.spawnedProjectile && f.attack) {
        const spec = f.attack.spec;
        const scaled = consumeRangedSpecialShot(f, spec);
        this.projectiles.push({
          id: this.nextProjId++,
          ownerSlot: f.slot,
          visual: spec.projectileVisual ?? 'fireball',
          x: f.x + spec.offsetX * f.facing,
          y: f.y + spec.offsetY,
          vx: scaled.speed * f.facing,
          vy: scaled.vy,
          gravity: scaled.gravity,
          radius: scaled.radius,
          damage: scaled.damage,
          baseKnockback: scaled.baseKnockback,
          knockbackGrowth: scaled.knockbackGrowth,
          angleDeg: spec.angleDeg,
          color: f.spec.accentColor,
          life: 0,
          maxLife: scaled.maxLife,
          powerScale: scaled.powerScale,
        });
      }

      // Elemental special VFX bursts/trails during active frames
      if (f.attack && isAttackActive(f.attack) && Math.random() < 0.55) {
        const kind = f.attack.kind;
        if (kind === 'upSpecial' || kind === 'sideSpecial' || kind === 'downSpecial') {
          const sparkColor =
            f.spec.id === 'blaze'
              ? '#FB923C'
              : f.spec.id === 'gale'
                ? '#67E8F9'
                : f.spec.id === 'titan'
                  ? '#FACC15'
                  : f.spec.id === 'volt'
                    ? '#FACC15'
                    : '#38BDF8';
          this.particles.spawn(
            f.spec.id === 'titan' && kind === 'sideSpecial' ? 'dust' : 'spark',
            f.x + (Math.random() - 0.5) * 26,
            f.y - f.spec.height * 0.45 + (Math.random() - 0.5) * 22,
            -f.vx * 0.25 + (Math.random() - 0.5) * 80,
            -40 + (Math.random() - 0.5) * 70,
            f.spec.id === 'titan' ? 6 : 4.5,
            -2,
            0.22,
            sparkColor,
            0.9
          );
        }
      }

      // High-percent knockback smoke trail
      if (f.hitstunTimer > 0 && f.smokeTimer <= 0 && f.damage > 75) {
        f.smokeTimer = 0.045;
        this.particles.spawn(
          'smoke',
          f.x,
          f.y - f.spec.height * 0.5,
          (Math.random() - 0.5) * 35,
          (Math.random() - 0.5) * 35,
          9,
          12,
          0.34,
          f.damage > 120 ? '#94A3B8' : '#CBD5E1',
          0.75
        );
      }
    }

    // Melee Hitbox checks & Projectile Reflection
    this.resolveMeleePair(this.fighters[0], this.fighters[1]);
    this.resolveMeleePair(this.fighters[1], this.fighters[0]);

    for (const f of this.fighters) {
      if (f.stocks <= 0) continue;
      if (tryReflectProjectiles(f, this.projectiles) > 0) {
        const ry = f.y - f.spec.height * 0.5;
        this.audio.playShieldBlock(false);
        this.particles.spawnRing(f.x, ry, '#67E8F9', 16, 220);
        this.queueNetEvent('shieldBlock', f.x, ry, { flag: false });
      }
    }

    // Step Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.visual === 'fireball' && Math.random() < 0.45) {
        this.particles.spawn('spark', p.x, p.y, -p.vx * 0.15, -25, 4, -4, 0.18, '#FB923C', 0.85);
      }

      const target = this.fighters[p.ownerSlot === 0 ? 1 : 0];
      const attacker = this.fighters[p.ownerSlot];
      const res = target.stocks > 0 ? checkProjectileHit(p, target, attacker) : null;
      if (res && res.connected) {
        this.onHitConnected(res, p.visual === 'boulder');
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life >= p.maxLife || Math.abs(p.x) > 1000 || p.y > this.stage.blastZones.bottom) {
        this.projectiles.splice(i, 1);
      }
    }

    // Apply Stage Hazard Hits / Updraft Lift
    const hazardHits = applyStageHazardEffects(this.stageRuntime, this.fighters, dt);
    for (const hRes of hazardHits) {
      this.onHitConnected(hRes, true);
    }

    // Check Blast Zone KOs
    for (const f of this.fighters) {
      if (f.stocks <= 0) continue;
      const side = checkBlastZone(f, this.stage);
      if (side) {
        this.handleBlastKo(f, side);
      }
    }

    this.updateCamera(dt);
    this.emitHudSnapshot();
    this.broadcastHostState();
  }

  private resolveMeleePair(attacker: FighterRuntime, defender: FighterRuntime): void {
    if (
      attacker.stocks <= 0 ||
      defender.stocks <= 0 ||
      !attacker.attack ||
      attacker.attack.hasHit ||
      attacker.attack.spec.projectileSpeed
    ) {
      return;
    }
    if (!isAttackActive(attacker.attack)) return;

    const hitbox = getAttackHitbox(attacker, attacker.attack.spec);
    const hurtbox = getHurtbox(defender);
    if (!boxesOverlap(hitbox, hurtbox)) return;

    attacker.attack.hasHit = true;
    const spec = attacker.attack.spec;
    const res = applyHit(
      attacker,
      attacker.slot,
      attacker.facing,
      defender,
      spec.damage,
      spec.baseKnockback,
      spec.knockbackGrowth,
      spec.angleDeg,
      spec.hitstop
    );

    if (res.connected) {
      if (!res.blocked) {
        coolRangedHeat(attacker, 0.18);
      }
      const heavy = spec.damage >= 12 || defender.damage > 95;
      this.onHitConnected(res, heavy);
    }
  }

  private onHitConnected(
    res: ReturnType<typeof applyHit>,
    heavy: boolean
  ): void {
    if (res.blocked) {
      this.audio.playShieldBlock(res.shieldBroken);
      this.particles.spawnRing(res.impactX, res.impactY, res.shieldBroken ? '#FACC15' : '#93C5FD', 12, 180);
      this.hitstopTimer = Math.max(this.hitstopTimer, res.hitstop);
      if (res.shieldBroken) {
        this.trauma = Math.min(1, this.trauma + 0.55);
        this.koBannerText = 'SHIELD BREAK!';
        this.koBannerTimer = 1.0;
      }
      this.queueNetEvent('shieldBlock', res.impactX, res.impactY, { flag: res.shieldBroken });
    } else {
      const pitchMag = Math.round(res.knockbackMagnitude * 0.15);
      this.audio.playHit(heavy, pitchMag);
      this.particles.spawnBurst(
        res.impactX,
        res.impactY,
        heavy ? 18 : 9,
        heavy ? 480 : 280,
        heavy ? '#FDE047' : '#F8FAFC',
        heavy ? 'star' : 'spark'
      );
      this.particles.spawnRing(
        res.impactX,
        res.impactY,
        heavy ? '#FB923C' : '#F8FAFC',
        10,
        heavy ? 260 : 140
      );
      this.hitstopTimer = Math.max(this.hitstopTimer, res.hitstop);
      this.trauma = Math.min(1, this.trauma + (heavy ? 0.45 : 0.2));
      this.queueNetEvent('hit', res.impactX, res.impactY, { heavy, dir: pitchMag });
    }
    this.emitHudSnapshot();
  }

  private handleBlastKo(
    victim: FighterRuntime,
    side: 'left' | 'right' | 'top' | 'bottom'
  ): void {
    victim.stocks = Math.max(0, victim.stocks - 1);
    victim.deaths += 1;

    const other = this.fighters[victim.slot === 0 ? 1 : 0];
    if (victim.lastHitBySlot === other.slot || victim.lastHitBySlot === null) {
      other.kos += 1;
    }

    // Blast beam pointing inward from KO edge
    const angle =
      side === 'left'
        ? 0
        : side === 'right'
          ? Math.PI
          : side === 'top'
            ? Math.PI * 0.5
            : -Math.PI * 0.5;
    const bx = Math.max(this.stage.blastZones.left, Math.min(this.stage.blastZones.right, victim.x));
    const by = Math.max(this.stage.blastZones.top, Math.min(this.stage.blastZones.bottom, victim.y));

    const isFinal = victim.stocks === 0;
    this.triggerKoSpectacle(
      bx,
      by,
      angle,
      victim.spec.primaryColor,
      victim.spec.accentColor,
      isFinal
    );
    this.hitstopTimer = isFinal ? 0.16 : 0.11;
    this.queueNetEvent('ko', bx, by, {
      angle: Math.round(angle * 100) / 100,
      color: victim.spec.primaryColor,
      dir: victim.slot,
      flag: isFinal,
    });

    if (victim.stocks > 0) {
      respawnFighter(victim, this.stage);
      this.koBannerText = 'KO!';
      this.koBannerTimer = 1.05;
    } else {
      this.winnerSlot = other.slot;
      this.koBannerText = 'GAME!';
      this.koBannerTimer = 1.45;
      this.matchEndDelayTimer = 1.05;
    }
    this.emitHudSnapshot();
    this.broadcastHostState(true);
  }

  private triggerKoSpectacle(
    x: number,
    y: number,
    angle: number,
    primaryColor: string,
    accentColor: string,
    isFinal: boolean
  ): void {
    this.blastBeams.push({
      x,
      y,
      angle,
      color: primaryColor,
      accentColor,
      isFinal,
      life: 0,
      maxLife: isFinal ? 0.95 : 0.78,
    });
    this.particles.spawnKoFireworks(x, y, angle, primaryColor, accentColor, isFinal);
    this.audio.playBlastKo(isFinal);
    this.trauma = isFinal ? 1.0 : 0.92;
  }

  private finalizeMatch(winnerSlot: 0 | 1): void {
    const f1 = this.fighters[0];
    const f2 = this.fighters[1];
    const winner = this.fighters[winnerSlot];
    const loser = this.fighters[winnerSlot === 0 ? 1 : 0];

    const result: MatchResultSnapshot = {
      winnerSlot,
      winnerName: winner.slot === 0 ? `P1 · ${winner.spec.name}` : `${winner.isCpu ? 'CPU' : 'P2'} · ${winner.spec.name}`,
      loserName: loser.slot === 0 ? `P1 · ${loser.spec.name}` : `${loser.isCpu ? 'CPU' : 'P2'} · ${loser.spec.name}`,
      mode: this.config.mode,
      stageName: this.stage.name,
      durationSeconds: Math.round(this.matchElapsed),
      p1Stats: {
        name: f1.spec.name,
        fighterId: f1.spec.id,
        kos: f1.kos,
        stocksLeft: f1.stocks,
        damageDealt: Math.round(f1.damageDealt),
        peakDamage: Math.round(f1.peakDamage),
      },
      p2Stats: {
        name: f2.spec.name,
        fighterId: f2.spec.id,
        kos: f2.kos,
        stocksLeft: f2.stocks,
        damageDealt: Math.round(f2.damageDealt),
        peakDamage: Math.round(f2.peakDamage),
      },
    };

    this.broadcastHostState(true);
    if (this.config.mode === 'online' && this.config.onlineRole === 'host') {
      this.callbacks.onSendNetMessage?.({ type: 'match_end', result });
    }

    this.emitHudSnapshot();
    this.callbacks.onMatchEnd(result);
  }

  private updateCamera(dt: number): void {
    const target = computeDynamicCamera(
      this.fighters[0],
      this.fighters[1],
      this.stage,
      this.viewportW,
      this.viewportH
    );
    const rate = 1 - Math.exp(-7.5 * dt);
    this.camX += (target.x - this.camX) * rate;
    this.camY += (target.y - this.camY) * rate;
    this.camZoom += (target.zoom - this.camZoom) * rate;
  }

  private renderFrame(): void {
    const shakeMag = this.trauma * this.trauma * 18;
    const shakeX = (Math.random() * 2 - 1) * shakeMag;
    const shakeY = (Math.random() * 2 - 1) * shakeMag;

    renderArena(this.ctx, this.viewportW, this.viewportH, {
      stage: this.stage,
      platforms: this.stageRuntime.platforms,
      activeHazard: this.stageRuntime.hazard,
      fighters: this.fighters,
      projectiles: this.projectiles,
      particles: this.particles,
      blastBeams: this.blastBeams,
      camX: this.camX,
      camY: this.camY,
      camZoom: this.camZoom,
      shakeX,
      shakeY,
      worldTime: this.worldTime,
      isTitleTour: this.screenState === 'title',
    });
  }

  private toHudFighter(f: FighterRuntime): FighterHudSnapshot {
    const isLocalControl =
      this.config.mode === 'online'
        ? f.slot === (this.config.onlineRole === 'guest' ? 1 : 0)
        : undefined;

    return {
      slot: f.slot,
      id: f.spec.id,
      name: f.spec.name,
      isCpu: f.isCpu,
      isLocalControl,
      damage: Math.round(f.damage),
      stocks: f.stocks,
      maxStocks: this.config.stocks,
      shieldRatio: f.shieldHealth / 100,
      hitFlash: f.hitFlashTimer > 0,
      respawning: f.respawnTimer > 0,
      primaryColor: f.spec.primaryColor,
      accentColor: f.spec.accentColor,
    };
  }

  private emitHudSnapshot(): void {
    let countdownText: string | null = null;
    if (this.countdownTimer > 0) {
      const sec = Math.ceil(this.countdownTimer * 2);
      countdownText = sec > 0 ? String(sec) : null;
    }
    const f1 = this.toHudFighter(this.fighters[0]);
    const f2 = this.toHudFighter(this.fighters[1]);
    const elapsedSeconds = Math.floor(this.matchElapsed);
    const s1 = Math.round(f1.shieldRatio * 20);
    const s2 = Math.round(f2.shieldRatio * 20);
    const hudKey = `${f1.id}:${f1.damage}:${f1.stocks}:${s1}:${f1.isLocalControl ?? ''}|${f2.id}:${f2.damage}:${f2.stocks}:${s2}:${f2.isLocalControl ?? ''}|${elapsedSeconds}|${countdownText ?? ''}|${this.koBannerText ?? ''}|${this.winnerSlot ?? ''}`;
    if (hudKey === this.lastHudKey) return;
    this.lastHudKey = hudKey;

    this.callbacks.onHudUpdate({
      fighters: [f1, f2],
      elapsedSeconds,
      countdownText,
      winnerSlot: this.winnerSlot,
      koBannerText: this.koBannerText,
    });
  }
}
