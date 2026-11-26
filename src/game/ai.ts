import {
  ActiveHazardState,
  CpuDifficulty,
  FighterInputState,
  FighterRuntime,
  Platform,
  RuntimePlatform,
  StageSpec,
} from './types';

export interface CpuBrainState {
  decisionTimer: number;
  attackCooldown: number;
  shieldTimer: number;
  desiredDir: -1 | 0 | 1;
}

export function createCpuBrain(): CpuBrainState {
  return {
    decisionTimer: 0.35,
    attackCooldown: 0.9,
    shieldTimer: 0,
    desiredDir: 0,
  };
}

function isPlatActive(p: Platform | RuntimePlatform): boolean {
  return !('active' in p) || p.active;
}

function findNearestSolidPlatform(
  x: number,
  platforms: (Platform | RuntimePlatform)[]
): Platform {
  const solids = platforms.filter((p) => !p.passThrough && isPlatActive(p));
  let best = solids[0] ?? platforms[0];
  let bestDist = Infinity;
  for (const p of solids) {
    const cx = p.x + p.width * 0.5;
    const dist = Math.abs(x - cx);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

export function isOverStagePlatform(
  x: number,
  stageOrPlatforms: StageSpec | (Platform | RuntimePlatform)[]
): boolean {
  const platforms = Array.isArray(stageOrPlatforms)
    ? stageOrPlatforms
    : stageOrPlatforms.platforms;
  return platforms.some(
    (p) => !p.passThrough && isPlatActive(p) && x >= p.x + 16 && x <= p.x + p.width - 16
  );
}

export function computeCpuInput(
  cpu: FighterRuntime,
  opponent: FighterRuntime,
  stage: StageSpec,
  difficulty: CpuDifficulty,
  brain: CpuBrainState,
  dt: number,
  platformsOverride?: RuntimePlatform[],
  activeHazard?: ActiveHazardState | null
): FighterInputState {
  const input: FighterInputState = {
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

  if (cpu.respawnTimer > 0 || cpu.hitstunTimer > 0) {
    return input;
  }

  // Ledge getup decision when hanging on a ledge
  if (cpu.ledgeGrab) {
    if (cpu.ledgeGrab.timer >= 0.2) {
      const distToOpp = Math.abs(opponent.x - cpu.x);
      if (distToOpp < 110 && Math.abs(opponent.y - cpu.ledgeGrab.ledgeY) < 60 && Math.random() < 0.45) {
        input.attackJustPressed = true;
      } else if (opponent.y < cpu.ledgeGrab.ledgeY - 40 || Math.random() < 0.35) {
        input.jumpJustPressed = true;
        input.jumpHeld = true;
      } else {
        if (cpu.ledgeGrab.side === -1) input.right = true;
        else input.left = true;
      }
    }
    return input;
  }

  brain.decisionTimer = Math.max(0, brain.decisionTimer - dt);
  brain.attackCooldown = Math.max(0, brain.attackCooldown - dt);
  brain.shieldTimer = Math.max(0, brain.shieldTimer - dt);

  const reactionCadence = difficulty === 'fierce' ? 0.08 : difficulty === 'standard' ? 0.16 : 0.28;
  const attackCadence = difficulty === 'fierce' ? 0.28 : difficulty === 'standard' ? 0.48 : 0.8;

  const platforms = platformsOverride ?? stage.platforms;
  const nearestSolid = findNearestSolidPlatform(cpu.x, platforms);
  const leftLedgeX = nearestSolid.x;
  const rightLedgeX = nearestSolid.x + nearestSolid.width;
  const targetLedgeX =
    Math.abs(cpu.x - leftLedgeX) <= Math.abs(cpu.x - rightLedgeX) ? leftLedgeX : rightLedgeX;
  const offstage = !isOverStagePlatform(cpu.x, platforms);

  // Priority 1: Offstage Recovery toward nearest ledge!
  if (offstage) {
    const horizDistToLedge = Math.abs(targetLedgeX - cpu.x);
    if (cpu.x < targetLedgeX) {
      input.right = true;
    } else {
      input.left = true;
    }

    const belowDeck = cpu.y > nearestSolid.y + 18;
    // Use Side-Special horizontally if far out and roughly near deck height
    if (
      horizDistToLedge > 165 &&
      cpu.y <= nearestSolid.y + 55 &&
      cpu.y >= nearestSolid.y - 90 &&
      !cpu.attack &&
      cpu.jumpsRemaining <= 1
    ) {
      input.specialJustPressed = true;
      return input;
    }

    if (belowDeck) {
      if (cpu.jumpsRemaining > 0 && cpu.vy > -60) {
        input.jumpJustPressed = true;
        input.jumpHeld = true;
      } else if (!cpu.upSpecialUsed && cpu.vy > 80) {
        input.up = true;
        input.specialJustPressed = true;
      }
    } else if (cpu.y > nearestSolid.y - 40 && cpu.vy > 180 && cpu.jumpsRemaining > 0) {
      input.jumpJustPressed = true;
      input.jumpHeld = true;
    }
    return input;
  }

  // Priority 2: Defensive Shielding if opponent is attacking nearby
  if (brain.shieldTimer > 0) {
    input.shieldHeld = true;
    return input;
  }

  const dx = opponent.x - cpu.x;
  const dy = opponent.y - cpu.y;
  const dist = Math.hypot(dx, dy);

  if (
    cpu.grounded &&
    opponent.attack &&
    dist < 115 &&
    brain.decisionTimer <= 0 &&
    difficulty !== 'chill'
  ) {
    const blockChance = difficulty === 'fierce' ? 0.45 : 0.25;
    if (Math.random() < blockChance) {
      brain.shieldTimer = 0.28;
      brain.decisionTimer = reactionCadence;
      input.shieldHeld = true;
      return input;
    }
  }

  // Priority 3: Positioning toward opponent (while staying safe from ledges)
  if (brain.decisionTimer <= 0) {
    brain.decisionTimer = reactionCadence;
    if (Math.abs(dx) > 58) {
      brain.desiredDir = dx > 0 ? 1 : -1;
    } else {
      brain.desiredDir = 0;
    }
  }

  // Dodge telegraphed Solar Pillar floor hazard when grounded
  if (
    activeHazard &&
    activeHazard.spec.kind === 'solar_pillar' &&
    activeHazard.phase !== 'idle' &&
    Math.abs(cpu.x - activeHazard.x) < activeHazard.spec.width * 0.68
  ) {
    brain.desiredDir = cpu.x >= activeHazard.x ? 1 : -1;
  }

  // Avoid running blind off edge unless chasing cleanly
  const nextEdgeLeft = nearestSolid.x + 28;
  const nextEdgeRight = nearestSolid.x + nearestSolid.width - 28;
  if (cpu.grounded && cpu.x < nextEdgeLeft && brain.desiredDir === -1) {
    brain.desiredDir = 1;
  } else if (cpu.grounded && cpu.x > nextEdgeRight && brain.desiredDir === 1) {
    brain.desiredDir = -1;
  }

  if (brain.desiredDir === -1) input.left = true;
  if (brain.desiredDir === 1) input.right = true;

  // Jump up to pursue aerial or upper-platform opponents
  if (dy < -75 && cpu.grounded && Math.abs(dx) < 220) {
    input.jumpJustPressed = true;
    input.jumpHeld = true;
  } else if (dy > 75 && cpu.grounded && cpu.onPassThrough) {
    input.down = true;
  }

  // Priority 4: Attack Selection
  if (brain.attackCooldown <= 0 && !cpu.attack) {
    if (dist < 88) {
      // Close-quarters combat
      if (dy < -42) {
        input.up = true;
        input.attackJustPressed = true;
      } else if (!cpu.grounded && dy > 32) {
        input.down = true;
        input.attackJustPressed = true;
      } else if (opponent.damage > 75 || Math.random() < 0.35) {
        if (dx !== 0) {
          input.left = dx < 0;
          input.right = dx > 0;
        }
        input.specialJustPressed = Math.random() < 0.45;
        input.attackJustPressed = !input.specialJustPressed;
      } else {
        if (dx !== 0 && Math.abs(dx) > 48) {
          input.left = dx < 0;
          input.right = dx > 0;
        }
        input.attackJustPressed = true;
      }
      brain.attackCooldown = attackCadence;
    } else if (dist > 180 && dist < 440 && Math.abs(dy) < 55 && cpu.grounded) {
      // Mid/long-range projectile poke
      if (difficulty !== 'chill' || Math.random() < 0.5) {
        input.left = false;
        input.right = false;
        cpu.facing = dx >= 0 ? 1 : -1;
        input.specialJustPressed = true;
        brain.attackCooldown = attackCadence * 1.45;
      }
    }
  }

  return input;
}
