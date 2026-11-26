import { applyHit, boxesOverlap, getHurtbox, HitResolution } from './combat';
import {
  ActiveHazardState,
  FighterRuntime,
  RuntimePlatform,
  StageRuntime,
  StageSpec,
} from './types';

export interface StageHazardEvents {
  telegraphStarted: boolean;
  erupted: boolean;
  collapsedPlatforms: RuntimePlatform[];
  reformedPlatforms: RuntimePlatform[];
}

export function createStageRuntime(stage: StageSpec): StageRuntime {
  const platforms: RuntimePlatform[] = stage.platforms.map((p) => ({
    ...p,
    baseX: p.x,
    baseY: p.y,
    baseWidth: p.width,
    prevX: p.x,
    prevY: p.y,
    dx: 0,
    dy: 0,
    active: true,
    warningRatio: 0,
  }));

  const hazard: ActiveHazardState | null = stage.hazard
    ? {
        spec: stage.hazard,
        phase: 'idle',
        phaseProgress: 0,
        x: stage.hazard.xSpots[0] ?? 0,
        spotIndex: 0,
        hitSlots: [false, false],
      }
    : null;

  return {
    platforms,
    hazard,
    cycleTimer: 0,
  };
}

export function stepStageRuntime(
  runtime: StageRuntime,
  elapsed: number,
  options?: { hazardsEnabled?: boolean }
): StageHazardEvents {
  const hazardsEnabled = options?.hazardsEnabled ?? true;
  runtime.cycleTimer = elapsed;

  const events: StageHazardEvents = {
    telegraphStarted: false,
    erupted: false,
    collapsedPlatforms: [],
    reformedPlatforms: [],
  };

  for (const plat of runtime.platforms) {
    plat.prevX = plat.x;
    plat.prevY = plat.y;

    const behavior = plat.behavior;
    if (!behavior) {
      plat.dx = 0;
      plat.dy = 0;
      plat.active = true;
      plat.warningRatio = 0;
      continue;
    }

    if (behavior.kind === 'move') {
      const t = elapsed + (behavior.phase ?? 0);
      const wave = Math.sin((t / behavior.period) * Math.PI * 2);
      plat.x = plat.baseX + behavior.ampX * wave;
      plat.y = plat.baseY + behavior.ampY * wave;
      plat.width = plat.baseWidth;
      plat.active = true;
      plat.warningRatio = 0;
    } else if (behavior.kind === 'shrink') {
      if (!hazardsEnabled) {
        plat.x = plat.baseX;
        plat.y = plat.baseY;
        plat.width = plat.baseWidth;
        plat.active = true;
        plat.warningRatio = 0;
      } else {
        const wasActive = plat.active;
        const minW = behavior.minWidth ?? 40;
        const cycleT = ((elapsed + (behavior.phase ?? 0)) % behavior.period + behavior.period) % behavior.period;
        const warnEnd = behavior.solidDuration + behavior.warnDuration;
        const goneEnd = warnEnd + behavior.goneDuration;
        const centerX = plat.baseX + plat.baseWidth * 0.5;

        if (cycleT < behavior.solidDuration) {
          plat.width = plat.baseWidth;
          plat.active = true;
          plat.warningRatio = 0;
        } else if (cycleT < warnEnd) {
          const p = (cycleT - behavior.solidDuration) / Math.max(0.01, behavior.warnDuration);
          plat.width = plat.baseWidth - (plat.baseWidth - minW) * p;
          plat.active = true;
          plat.warningRatio = p;
        } else if (cycleT < goneEnd) {
          plat.width = 0;
          plat.active = false;
          plat.warningRatio = 0;
        } else {
          const reformDur = Math.max(0.05, behavior.period - goneEnd);
          const p = (cycleT - goneEnd) / reformDur;
          plat.width = minW + (plat.baseWidth - minW) * p;
          plat.active = true;
          plat.warningRatio = 0;
        }

        plat.x = centerX - plat.width * 0.5;
        plat.y = plat.baseY;

        if (wasActive && !plat.active) {
          events.collapsedPlatforms.push(plat);
        } else if (!wasActive && plat.active) {
          events.reformedPlatforms.push(plat);
        }
      }
    }

    plat.dx = plat.x - plat.prevX;
    plat.dy = plat.y - plat.prevY;
  }

  if (runtime.hazard) {
    const haz = runtime.hazard;
    const spec = haz.spec;
    const prevPhase = haz.phase;

    if (!hazardsEnabled || elapsed < spec.initialDelay) {
      haz.phase = 'idle';
      haz.phaseProgress = 0;
      haz.hitSlots = [false, false];
    } else {
      const t = elapsed - spec.initialDelay;
      const cycleIndex = Math.floor(t / spec.period);
      const cycleT = t % spec.period;
      const spotIndex = cycleIndex % Math.max(1, spec.xSpots.length);
      haz.spotIndex = spotIndex;
      haz.x = spec.xSpots[spotIndex] ?? 0;

      if (cycleT < spec.telegraphDuration) {
        haz.phase = 'telegraph';
        haz.phaseProgress = cycleT / Math.max(0.01, spec.telegraphDuration);
        haz.hitSlots = [false, false];
        if (prevPhase !== 'telegraph') {
          events.telegraphStarted = true;
        }
      } else if (cycleT < spec.telegraphDuration + spec.activeDuration) {
        haz.phase = 'active';
        haz.phaseProgress =
          (cycleT - spec.telegraphDuration) / Math.max(0.01, spec.activeDuration);
        if (prevPhase !== 'active') {
          events.erupted = true;
        }
      } else {
        haz.phase = 'idle';
        haz.phaseProgress = 0;
        haz.hitSlots = [false, false];
      }
    }
  }

  return events;
}

export function applyStageHazardEffects(
  runtime: StageRuntime,
  fighters: [FighterRuntime, FighterRuntime],
  dt: number
): HitResolution[] {
  const haz = runtime.hazard;
  if (!haz || haz.phase !== 'active') return [];

  const spec = haz.spec;
  const hazBox = {
    left: haz.x - spec.width * 0.5,
    right: haz.x + spec.width * 0.5,
    top: spec.yTop,
    bottom: spec.yBottom,
  };

  const hits: HitResolution[] = [];

  for (const f of fighters) {
    if (f.stocks <= 0 || f.respawnTimer > 0) continue;
    const hurtbox = getHurtbox(f);
    if (!boxesOverlap(hazBox, hurtbox)) continue;

    if (spec.kind === 'storm_updraft') {
      const lift = spec.liftAccel ?? 1900;
      if (!f.grounded && f.invulnTimer <= 0) {
        f.vy = Math.max(-460, f.vy - lift * dt);
        f.upSpecialUsed = false; // Updraft refreshes recovery opportunity!
      }
    } else {
      if (haz.hitSlots[f.slot]) continue;
      const opponentSlot: 0 | 1 = f.slot === 0 ? 1 : 0;
      const pushDir: 1 | -1 = f.x >= haz.x ? 1 : -1;
      const res = applyHit(
        null,
        opponentSlot,
        pushDir,
        f,
        spec.damage,
        spec.baseKnockback,
        spec.knockbackGrowth,
        spec.angleDeg,
        0.05
      );
      if (res.connected) {
        haz.hitSlots[f.slot] = true;
        hits.push(res);
      }
    }
  }

  return hits;
}
