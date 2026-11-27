import {
  FighterInputState,
  FighterRuntime,
  Platform,
  RuntimePlatform,
  StageSpec,
} from './types';
import {
  chooseAttackKind,
  getAttackTotalDuration,
  RANGED_DECAY_RATE_PER_SEC,
} from './combat';

export interface StepPhysicsEvents {
  jumped: boolean;
  doubleJumped: boolean;
  landed: boolean;
  dodged: boolean;
  grabbedLedge: { x: number; y: number; side: -1 | 1 } | null;
  startedAttack: string | null;
  spawnedProjectile: boolean;
}

export function stepFighterPhysics(
  fighter: FighterRuntime,
  input: FighterInputState,
  stage: StageSpec,
  dt: number,
  platformsOverride?: RuntimePlatform[]
): StepPhysicsEvents {
  const events: StepPhysicsEvents = {
    jumped: false,
    doubleJumped: false,
    landed: false,
    dodged: false,
    grabbedLedge: null,
    startedAttack: null,
    spawnedProjectile: false,
  };

  // Timers
  if (fighter.hitFlashTimer > 0) fighter.hitFlashTimer = Math.max(0, fighter.hitFlashTimer - dt);
  if (fighter.invulnTimer > 0) fighter.invulnTimer = Math.max(0, fighter.invulnTimer - dt);
  if (fighter.ledgeCooldown > 0) fighter.ledgeCooldown = Math.max(0, fighter.ledgeCooldown - dt);
  if (fighter.dropThroughTimer > 0)
    fighter.dropThroughTimer = Math.max(0, fighter.dropThroughTimer - dt);
  if (fighter.dodgeTimer > 0) fighter.dodgeTimer = Math.max(0, fighter.dodgeTimer - dt);
  if (fighter.rangedDecayDelay > 0) {
    fighter.rangedDecayDelay = Math.max(0, fighter.rangedDecayDelay - dt);
  } else if (fighter.rangedHeat > 0) {
    fighter.rangedHeat = Math.max(0, fighter.rangedHeat - RANGED_DECAY_RATE_PER_SEC * dt);
  }

  // Squash & stretch exponential damping back to 1
  const squashRate = 1 - Math.exp(-16 * dt);
  fighter.squashX += (1 - fighter.squashX) * squashRate;
  fighter.squashY += (1 - fighter.squashY) * squashRate;

  // Respawn halo hover
  if (fighter.respawnTimer > 0) {
    fighter.respawnTimer = Math.max(0, fighter.respawnTimer - dt);
    fighter.vy = 0;
    fighter.vx = 0;
    if (
      input.left ||
      input.right ||
      input.jumpJustPressed ||
      input.attackJustPressed ||
      input.specialJustPressed
    ) {
      fighter.respawnTimer = 0;
    } else {
      return events;
    }
  }

  if (fighter.shieldBrokenTimer > 0) {
    fighter.shieldBrokenTimer = Math.max(0, fighter.shieldBrokenTimer - dt);
  }

  // Hitstun state
  if (fighter.hitstunTimer > 0) {
    fighter.hitstunTimer = Math.max(0, fighter.hitstunTimer - dt);
    fighter.shielding = false;
    fighter.ledgeGrab = null;
    // Directional influence (DI) during hitstun
    const diX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const diY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    fighter.vx += diX * 320 * dt;
    fighter.vy += diY * 180 * dt;
    fighter.vx *= Math.pow(0.72, dt);
    fighter.vy += fighter.spec.gravity * 0.9 * dt;
    fighter.smokeTimer -= dt;
    applyMovementAndPlatforms(fighter, platformsOverride ?? stage.platforms, dt, events);
    return events;
  }

  // Ledge hang state
  if (fighter.ledgeGrab) {
    stepLedgeHang(fighter, input, dt, events);
    return events;
  }

  // Coyote time & Jump buffer
  if (fighter.grounded) {
    fighter.coyoteTimer = 0.1;
    fighter.jumpsRemaining = 2;
    fighter.upSpecialUsed = false;
  } else {
    fighter.coyoteTimer = Math.max(0, fighter.coyoteTimer - dt);
  }

  if (input.jumpJustPressed) {
    fighter.jumpBufferTimer = 0.12;
  } else {
    fighter.jumpBufferTimer = Math.max(0, fighter.jumpBufferTimer - dt);
  }

  // Shielding (ground only) or Air Dodge
  const canAct = !fighter.attack && fighter.shieldBrokenTimer <= 0;

  if (canAct && !fighter.grounded && input.dodgeJustPressed && fighter.dodgeTimer <= 0) {
    fighter.dodgeTimer = 0.22;
    fighter.invulnTimer = Math.max(fighter.invulnTimer, 0.2);
    const dirX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dirY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dirX !== 0 || dirY !== 0) {
      const len = Math.hypot(dirX, dirY);
      fighter.vx = (dirX / len) * 440;
      fighter.vy = (dirY / len) * 380;
    } else {
      fighter.vx *= 0.4;
      fighter.vy = Math.min(fighter.vy, 60);
    }
    fighter.squashX = 1.15;
    fighter.squashY = 0.85;
    events.dodged = true;
  }

  fighter.shielding =
    canAct &&
    fighter.grounded &&
    input.shieldHeld &&
    fighter.shieldHealth > 2 &&
    fighter.dodgeTimer <= 0;

  if (fighter.shielding) {
    fighter.shieldHealth = Math.max(0, fighter.shieldHealth - 22 * dt);
    fighter.vx *= Math.pow(0.02, dt);
  } else {
    fighter.shieldHealth = Math.min(100, fighter.shieldHealth + 14 * dt);
  }

  // Facing update when idle / moving
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (canAct && !fighter.shielding && moveDir !== 0) {
    fighter.facing = moveDir > 0 ? 1 : -1;
  }

  // Drop through pass-through platforms
  if (canAct && fighter.grounded && fighter.onPassThrough && input.down && !input.attackJustPressed && !input.specialJustPressed) {
    fighter.grounded = false;
    fighter.onPassThrough = false;
    fighter.groundedPlatformId = null;
    fighter.dropThroughTimer = 0.22;
    fighter.y += 4;
    fighter.vy = Math.max(fighter.vy, 180);
  }

  // Jump execution (coyote or double jump)
  if (canAct && !fighter.shielding && fighter.jumpBufferTimer > 0) {
    if (fighter.coyoteTimer > 0) {
      fighter.vy = -fighter.spec.jumpForce;
      fighter.grounded = false;
      fighter.groundedPlatformId = null;
      fighter.coyoteTimer = 0;
      fighter.jumpBufferTimer = 0;
      fighter.jumpsRemaining = 1;
      fighter.squashX = 0.82;
      fighter.squashY = 1.22;
      events.jumped = true;
    } else if (fighter.jumpsRemaining > 0) {
      fighter.vy = -fighter.spec.doubleJumpForce;
      fighter.jumpsRemaining -= 1;
      fighter.jumpBufferTimer = 0;
      if (moveDir !== 0) {
        fighter.vx = moveDir * fighter.spec.maxSpeed * 0.9;
      }
      fighter.squashX = 0.8;
      fighter.squashY = 1.25;
      events.doubleJumped = true;
    }
  }

  // Variable jump height cut on release
  if (!input.jumpHeld && fighter.vy < -220 && !fighter.attack) {
    fighter.vy *= Math.pow(0.08, dt * 8);
  }

  // Attack initiation
  if (canAct && !fighter.shielding && fighter.dodgeTimer <= 0) {
    if (input.specialJustPressed || input.attackJustPressed) {
      const kind = chooseAttackKind(fighter, input, input.specialJustPressed);
      if (kind) {
        const spec = fighter.spec.attacks[kind];
        fighter.attack = {
          kind,
          elapsed: 0,
          hasHit: false,
          spec,
        };
        if (kind === 'upSpecial') {
          fighter.upSpecialUsed = true;
        }
        if (spec.selfVx !== undefined) {
          fighter.vx = spec.selfVx * fighter.facing;
        }
        if (spec.selfVy !== undefined) {
          fighter.vy = spec.selfVy;
          fighter.grounded = false;
          fighter.groundedPlatformId = null;
        }
        events.startedAttack = kind;
      }
    }
  }

  // Active attack progression
  if (fighter.attack) {
    const prevElapsed = fighter.attack.elapsed;
    fighter.attack.elapsed += dt;
    const spec = fighter.attack.spec;

    if (
      spec.projectileSpeed &&
      prevElapsed < spec.windup &&
      fighter.attack.elapsed >= spec.windup
    ) {
      events.spawnedProjectile = true;
    }

    if (fighter.attack.elapsed >= getAttackTotalDuration(spec)) {
      fighter.attack = null;
    }
  }

  // Horizontal velocity
  if (!fighter.shielding) {
    const accel = fighter.grounded ? fighter.spec.groundAccel : fighter.spec.airAccel;
    const attackControlScale = fighter.attack
      ? fighter.attack.spec.isRecovery
        ? 0.95
        : fighter.grounded
          ? 0.2
          : 0.6
      : 1;

    if (moveDir !== 0) {
      const targetVx = moveDir * fighter.spec.maxSpeed;
      const step = accel * attackControlScale * dt;
      if (fighter.vx < targetVx) {
        fighter.vx = Math.min(targetVx, fighter.vx + step);
      } else if (fighter.vx > targetVx) {
        fighter.vx = Math.max(targetVx, fighter.vx - step);
      }
    } else if (fighter.grounded && !fighter.attack) {
      // Crisp ground stopping friction
      const friction = 2600 * dt;
      if (Math.abs(fighter.vx) <= friction) {
        fighter.vx = 0;
      } else {
        fighter.vx -= Math.sign(fighter.vx) * friction;
      }
    } else {
      // Subtle air drag
      fighter.vx *= Math.pow(0.65, dt);
    }
  }

  // Walk cycle tied to horizontal distance traveled (zero foot skating)
  if (fighter.grounded && Math.abs(fighter.vx) > 20 && !fighter.attack) {
    fighter.walkPhase += Math.abs(fighter.vx) * dt * 0.042;
  }

  // Gravity & fast fall
  if (!fighter.grounded) {
    const isUpSpecialRise =
      fighter.attack?.kind === 'upSpecial' &&
      fighter.attack.elapsed < fighter.attack.spec.windup + fighter.attack.spec.active;
    const gravScale = isUpSpecialRise ? 0.48 : 1.0;
    fighter.vy += fighter.spec.gravity * gravScale * dt;

    const maxFall =
      input.down && !fighter.attack ? fighter.spec.fastFallMax : fighter.spec.fallSpeedMax;
    if (fighter.vy > maxFall) {
      fighter.vy = maxFall;
    }
  }

  const activePlatforms = platformsOverride ?? stage.platforms;
  applyMovementAndPlatforms(fighter, activePlatforms, dt, events);
  tryGrabLedge(fighter, activePlatforms, input, events);
  return events;
}

function stepLedgeHang(
  fighter: FighterRuntime,
  input: FighterInputState,
  dt: number,
  events: StepPhysicsEvents
): void {
  const lg = fighter.ledgeGrab;
  if (!lg) return;

  lg.timer += dt;
  const halfW = fighter.spec.width * 0.5;
  fighter.x = lg.ledgeX + lg.side * halfW * 0.65;
  fighter.y = lg.ledgeY + fighter.spec.height * 0.72;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.grounded = false;
  fighter.facing = lg.side === -1 ? 1 : -1;

  // Ledge Jump
  if (lg.timer >= 0.08 && (input.jumpJustPressed || input.up)) {
    fighter.ledgeGrab = null;
    fighter.ledgeCooldown = 0.28;
    fighter.vy = -fighter.spec.jumpForce * 0.96;
    fighter.vx = -lg.side * fighter.spec.maxSpeed * 0.48;
    fighter.jumpsRemaining = 1;
    fighter.squashX = 0.82;
    fighter.squashY = 1.22;
    events.jumped = true;
    return;
  }

  // Ledge Getup Attack
  if (lg.timer >= 0.08 && (input.attackJustPressed || input.specialJustPressed)) {
    fighter.x = lg.ledgeX - lg.side * (halfW + 18);
    fighter.y = lg.ledgeY;
    fighter.grounded = true;
    fighter.onPassThrough = false;
    fighter.groundedPlatformId = lg.platformId;
    fighter.ledgeGrab = null;
    fighter.ledgeCooldown = 0.35;
    fighter.invulnTimer = Math.max(fighter.invulnTimer, 0.22);
    const tiltSpec = fighter.spec.attacks.sideTilt;
    fighter.attack = {
      kind: 'sideTilt',
      elapsed: 0,
      hasHit: false,
      spec: tiltSpec,
    };
    fighter.vx = (tiltSpec.selfVx ?? 140) * fighter.facing;
    events.startedAttack = 'sideTilt';
    return;
  }

  const inwardPressed = (lg.side === -1 && input.right) || (lg.side === 1 && input.left);
  const outwardPressed = (lg.side === -1 && input.left) || (lg.side === 1 && input.right);

  // Ledge Climb onto stage
  if (lg.timer >= 0.14 && (inwardPressed || input.shieldHeld || input.dodgeJustPressed)) {
    fighter.x = lg.ledgeX - lg.side * (halfW + 14);
    fighter.y = lg.ledgeY;
    fighter.grounded = true;
    fighter.onPassThrough = false;
    fighter.groundedPlatformId = lg.platformId;
    fighter.ledgeGrab = null;
    fighter.ledgeCooldown = 0.35;
    fighter.invulnTimer = Math.max(fighter.invulnTimer, 0.25);
    fighter.squashX = 1.16;
    fighter.squashY = 0.84;
    events.landed = true;
    return;
  }

  // Ledge Drop or Hang Timeout
  if ((lg.timer >= 0.14 && (input.down || outwardPressed)) || lg.timer >= 2.4) {
    fighter.ledgeGrab = null;
    fighter.ledgeCooldown = 0.4;
    fighter.vy = 140;
    fighter.jumpsRemaining = 2;
  }
}

function tryGrabLedge(
  fighter: FighterRuntime,
  platforms: (Platform | RuntimePlatform)[],
  input: FighterInputState,
  events: StepPhysicsEvents
): void {
  if (
    fighter.grounded ||
    fighter.ledgeGrab ||
    fighter.ledgeCooldown > 0 ||
    fighter.hitstunTimer > 0 ||
    input.down
  ) {
    return;
  }

  const isRecovery = Boolean(fighter.attack?.spec.isRecovery);
  if (fighter.vy < -460 && !isRecovery) {
    return;
  }

  const halfW = fighter.spec.width * 0.5;

  for (const plat of platforms) {
    if (plat.passThrough || !isPlatformActive(plat)) continue;

    // Check left ledge (side = -1) and right ledge (side = 1)
    const edges: { side: -1 | 1; lx: number }[] = [
      { side: -1, lx: plat.x },
      { side: 1, lx: plat.x + plat.width },
    ];

    for (const edge of edges) {
      const inX =
        edge.side === -1
          ? fighter.x >= edge.lx - 48 && fighter.x <= edge.lx + 18
          : fighter.x >= edge.lx - 18 && fighter.x <= edge.lx + 48;
      const inY = fighter.y >= plat.y + 8 && fighter.y <= plat.y + 96;

      if (inX && inY) {
        fighter.ledgeGrab = {
          platformId: plat.id,
          side: edge.side,
          ledgeX: edge.lx,
          ledgeY: plat.y,
          timer: 0,
        };
        fighter.x = edge.lx + edge.side * halfW * 0.65;
        fighter.y = plat.y + fighter.spec.height * 0.72;
        fighter.vx = 0;
        fighter.vy = 0;
        fighter.facing = edge.side === -1 ? 1 : -1;
        fighter.attack = null;
        fighter.shielding = false;
        fighter.jumpsRemaining = 2;
        fighter.upSpecialUsed = false;
        fighter.invulnTimer = Math.max(fighter.invulnTimer, 0.55);
        fighter.squashX = 0.9;
        fighter.squashY = 1.08;
        events.grabbedLedge = { x: edge.lx, y: plat.y, side: edge.side };
        return;
      }
    }
  }
}

function isPlatformActive(plat: Platform | RuntimePlatform): boolean {
  return !('active' in plat) || plat.active;
}

function applyMovementAndPlatforms(
  fighter: FighterRuntime,
  platforms: (Platform | RuntimePlatform)[],
  dt: number,
  events: StepPhysicsEvents
): void {
  // Carry grounded fighter along moving platform delta before stepping movement
  if (fighter.grounded && fighter.groundedPlatformId) {
    const riding = platforms.find(
      (p) => p.id === fighter.groundedPlatformId && isPlatformActive(p)
    ) as RuntimePlatform | undefined;
    if (riding) {
      fighter.x += riding.dx ?? 0;
      fighter.y += riding.dy ?? 0;
    }
  }

  const prevY = fighter.y;
  const prevX = fighter.x;
  fighter.x += fighter.vx * dt;
  fighter.y += fighter.vy * dt;

  const halfW = fighter.spec.width * 0.5;
  let landedPlatform: Platform | RuntimePlatform | null = null;

  // Check landing onto platform top surfaces when descending (or staying grounded)
  if (fighter.vy >= 0) {
    for (const plat of platforms) {
      if (!isPlatformActive(plat)) continue;
      if (plat.passThrough && fighter.dropThroughTimer > 0) continue;

      const withinX = fighter.x + halfW * 0.72 > plat.x && fighter.x - halfW * 0.72 < plat.x + plat.width;
      if (!withinX) continue;

      const prevPlatY = 'prevY' in plat ? plat.prevY : plat.y;
      const crossedTop = prevY <= prevPlatY + 10 && fighter.y >= plat.y;
      if (crossedTop) {
        if (!landedPlatform || plat.y < landedPlatform.y) {
          landedPlatform = plat;
        }
      }
    }
  }

  if (landedPlatform) {
    const wasAirborne = !fighter.grounded;
    const impactVy = fighter.vy;
    fighter.y = landedPlatform.y;
    fighter.vy = 0;
    fighter.grounded = true;
    fighter.onPassThrough = landedPlatform.passThrough;
    fighter.groundedPlatformId = landedPlatform.id;
    if (wasAirborne && impactVy > 120) {
      fighter.squashX = 1.22;
      fighter.squashY = 0.78;
      events.landed = true;
    }
  } else {
    fighter.grounded = false;
    fighter.onPassThrough = false;
    fighter.groundedPlatformId = null;
  }

  // Solid platform side-wall collision (prevents walking horizontally through thick stone stage)
  for (const plat of platforms) {
    if (!isPlatformActive(plat)) continue;
    if (plat.passThrough) continue;
    const verticalOverlap =
      fighter.y > plat.y + 6 && fighter.y - fighter.spec.height < plat.y + plat.height;
    if (!verticalOverlap) continue;

    if (prevX + halfW <= plat.x + 4 && fighter.x + halfW > plat.x) {
      fighter.x = plat.x - halfW;
      if (fighter.vx > 0) fighter.vx = 0;
    } else if (prevX - halfW >= plat.x + plat.width - 4 && fighter.x - halfW < plat.x + plat.width) {
      fighter.x = plat.x + plat.width + halfW;
      if (fighter.vx < 0) fighter.vx = 0;
    }
  }
}

export interface CameraTarget {
  x: number;
  y: number;
  zoom: number;
}

export function computeDynamicCamera(
  f1: FighterRuntime,
  f2: FighterRuntime,
  stage: StageSpec,
  viewportW: number,
  viewportH: number
): CameraTarget {
  const clampX = (val: number) =>
    Math.max(stage.blastZones.left * 0.45, Math.min(stage.blastZones.right * 0.45, val));
  const clampY = (val: number) =>
    Math.max(stage.blastZones.top * 0.45, Math.min(stage.blastZones.bottom * 0.35, val));

  const x1 = clampX(f1.x);
  const y1 = clampY(f1.y - 36);
  const x2 = clampX(f2.x);
  const y2 = clampY(f2.y - 36);

  const midX = (x1 + x2) * 0.5;
  const midY = (y1 + y2) * 0.5 - 22;

  const spanX = Math.max(460, Math.abs(x1 - x2) + 360);
  const spanY = Math.max(300, Math.abs(y1 - y2) + 260);

  const zoomX = viewportW / spanX;
  const zoomY = viewportH / spanY;
  const baseScale = Math.min(viewportW / 1180, viewportH / 680);
  const zoom = Math.max(baseScale * 0.72, Math.min(baseScale * 1.18, Math.min(zoomX, zoomY)));

  return {
    x: midX * 0.55,
    y: midY * 0.55,
    zoom,
  };
}
