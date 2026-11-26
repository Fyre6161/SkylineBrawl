import {
  ActiveAttackState,
  AttackKind,
  AttackSpec,
  FighterInputState,
  FighterRuntime,
  FighterSpec,
  ProjectileRuntime,
  StageSpec,
} from './types';

export function createFighterRuntime(
  slot: 0 | 1,
  spec: FighterSpec,
  isCpu: boolean,
  stage: StageSpec,
  stocks: number
): FighterRuntime {
  const spawn = stage.spawns[slot];
  return {
    slot,
    spec,
    isCpu,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    facing: spawn.facing,
    grounded: true,
    onPassThrough: false,
    groundedPlatformId: null,
    ledgeGrab: null,
    ledgeCooldown: 0,
    dropThroughTimer: 0,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    jumpsRemaining: 2,
    upSpecialUsed: false,
    damage: 0,
    stocks,
    hitstunTimer: 0,
    hitFlashTimer: 0,
    invulnTimer: 0,
    respawnTimer: 0,
    shieldHealth: 100,
    shieldBrokenTimer: 0,
    shielding: false,
    dodgeTimer: 0,
    attack: null,
    squashX: 1,
    squashY: 1,
    walkPhase: 0,
    smokeTimer: 0,
    kos: 0,
    deaths: 0,
    damageDealt: 0,
    peakDamage: 0,
    lastHitBySlot: null,
  };
}

/**
 * Classic Smash-inspired knockback formula:
 * Knockback scales nonlinearly with target's current damage percentage and inversely with fighter weight.
 */
export function calculateKnockback(
  targetDamage: number,
  targetWeight: number,
  baseKnockback: number,
  knockbackGrowth: number
): number {
  const safeDamage = Math.max(0, Math.min(350, targetDamage));
  const scaled =
    baseKnockback + safeDamage * knockbackGrowth * (1 + Math.min(180, safeDamage) * 0.0018);
  return Math.min(1650, scaled / Math.max(0.8, targetWeight));
}

export function chooseAttackKind(
  fighter: FighterRuntime,
  input: FighterInputState,
  isSpecial: boolean
): AttackKind | null {
  if (isSpecial) {
    if (input.up) {
      if (fighter.upSpecialUsed && !fighter.grounded) {
        return null;
      }
      return 'upSpecial';
    }
    if (input.down) return 'downSpecial';
    if (input.left || input.right) return 'sideSpecial';
    return 'neutralSpecial';
  }

  if (input.up) return 'upAir';
  if (input.down && !fighter.grounded) return 'downAir';
  if (input.left || input.right) return 'sideTilt';
  return 'jab';
}

export function getAttackHitbox(
  fighter: FighterRuntime,
  spec: AttackSpec
): { left: number; right: number; top: number; bottom: number } {
  const cx = fighter.x + spec.offsetX * fighter.facing;
  const cy = fighter.y + spec.offsetY;
  return {
    left: cx - spec.rangeX * 0.5,
    right: cx + spec.rangeX * 0.5,
    top: cy - spec.rangeY * 0.5,
    bottom: cy + spec.rangeY * 0.5,
  };
}

export function getHurtbox(fighter: FighterRuntime): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const halfW = fighter.spec.width * 0.5;
  return {
    left: fighter.x - halfW,
    right: fighter.x + halfW,
    top: fighter.y - fighter.spec.height,
    bottom: fighter.y,
  };
}

export function boxesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function isAttackActive(attack: ActiveAttackState): boolean {
  return (
    attack.elapsed >= attack.spec.windup &&
    attack.elapsed < attack.spec.windup + attack.spec.active
  );
}

export function getAttackTotalDuration(spec: AttackSpec): number {
  return spec.windup + spec.active + spec.recovery;
}

export interface HitResolution {
  connected: boolean;
  blocked: boolean;
  shieldBroken: boolean;
  knockbackMagnitude: number;
  launchVx: number;
  launchVy: number;
  hitstop: number;
  impactX: number;
  impactY: number;
}

export function applyHit(
  attacker: FighterRuntime | null,
  attackerSlot: 0 | 1,
  attackerFacing: 1 | -1,
  target: FighterRuntime,
  damage: number,
  baseKnockback: number,
  knockbackGrowth: number,
  angleDeg: number,
  hitstop: number
): HitResolution {
  const impactX = target.x;
  const impactY = target.y - target.spec.height * 0.52;

  if (target.invulnTimer > 0 || target.dodgeTimer > 0 || target.respawnTimer > 0) {
    return {
      connected: false,
      blocked: false,
      shieldBroken: false,
      knockbackMagnitude: 0,
      launchVx: 0,
      launchVy: 0,
      hitstop: 0,
      impactX,
      impactY,
    };
  }

  // Check shield block
  if (target.shielding && target.shieldHealth > 0) {
    target.shieldHealth = Math.max(0, target.shieldHealth - damage * 2.4);
    target.vx = attackerFacing * (180 + damage * 8);
    if (target.shieldHealth <= 0) {
      target.shielding = false;
      target.shieldBrokenTimer = 2.0;
      target.vy = -420;
      target.grounded = false;
      target.hitstunTimer = 2.0;
      return {
        connected: true,
        blocked: true,
        shieldBroken: true,
        knockbackMagnitude: 420,
        launchVx: target.vx,
        launchVy: target.vy,
        hitstop: 0.08,
        impactX,
        impactY,
      };
    }
    return {
      connected: true,
      blocked: true,
      shieldBroken: false,
      knockbackMagnitude: 150,
      launchVx: target.vx,
      launchVy: 0,
      hitstop: Math.min(0.04, hitstop * 0.65),
      impactX,
      impactY,
    };
  }

  target.damage = Math.min(999, target.damage + damage);
  target.peakDamage = Math.max(target.peakDamage, target.damage);
  target.lastHitBySlot = attackerSlot;
  if (attacker) {
    attacker.damageDealt += damage;
  }

  // Super Armor: takes damage and hit flash, but refuses knockback & keeps attacking
  if (target.attack && target.attack.spec.superArmor && isAttackActive(target.attack)) {
    target.hitFlashTimer = 0.06;
    return {
      connected: true,
      blocked: false,
      shieldBroken: false,
      knockbackMagnitude: 0,
      launchVx: target.vx,
      launchVy: target.vy,
      hitstop: Math.min(0.04, hitstop * 0.5),
      impactX,
      impactY,
    };
  }

  const kb = calculateKnockback(
    target.damage,
    target.spec.weight,
    baseKnockback,
    knockbackGrowth
  );

  // Convert Smash angle (0 = horizontal forward, +90 = up, -90 = down) to screen coords (Y+ down)
  const rad = (angleDeg * Math.PI) / 180;
  let dirX = Math.cos(rad) * attackerFacing;
  let dirY = -Math.sin(rad);

  // If grounded and hit by a meteor smash (-angle), bounce upward off stage floor
  if (target.grounded && dirY > 0.25) {
    dirY = -Math.abs(dirY) * 0.72;
  }

  const launchVx = dirX * kb;
  const launchVy = dirY * kb;

  target.vx = launchVx;
  target.vy = launchVy;
  target.grounded = false;
  target.groundedPlatformId = null;
  if (target.ledgeGrab) {
    target.ledgeGrab = null;
    target.ledgeCooldown = 0.4;
  }
  target.attack = null;
  target.shielding = false;
  target.hitFlashTimer = 0.09;
  target.hitstunTimer = Math.min(0.85, 0.11 + kb / 1500);
  target.squashX = 0.78;
  target.squashY = 1.24;

  return {
    connected: true,
    blocked: false,
    shieldBroken: false,
    knockbackMagnitude: kb,
    launchVx,
    launchVy,
    hitstop: Math.min(0.11, hitstop + (target.damage > 100 ? 0.02 : 0)),
    impactX,
    impactY,
  };
}

export function checkBlastZone(
  fighter: FighterRuntime,
  stage: StageSpec
): 'left' | 'right' | 'top' | 'bottom' | null {
  if (fighter.respawnTimer > 0) return null;
  if (fighter.x < stage.blastZones.left) return 'left';
  if (fighter.x > stage.blastZones.right) return 'right';
  if (fighter.y - fighter.spec.height > stage.blastZones.bottom) return 'bottom';
  // Top blast zone only KOs when the fighter is being launched upward in hitstun
  if (fighter.y < stage.blastZones.top && fighter.hitstunTimer > 0) return 'top';
  return null;
}

export function respawnFighter(fighter: FighterRuntime, stage: StageSpec): void {
  const spawnX = fighter.slot === 0 ? -90 : 90;
  fighter.x = spawnX;
  fighter.y = -180;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.facing = fighter.slot === 0 ? 1 : -1;
  fighter.grounded = false;
  fighter.onPassThrough = false;
  fighter.groundedPlatformId = null;
  fighter.ledgeGrab = null;
  fighter.ledgeCooldown = 0;
  fighter.damage = 0;
  fighter.hitstunTimer = 0;
  fighter.hitFlashTimer = 0;
  fighter.shieldHealth = 100;
  fighter.shieldBrokenTimer = 0;
  fighter.shielding = false;
  fighter.dodgeTimer = 0;
  fighter.attack = null;
  fighter.jumpsRemaining = 2;
  fighter.upSpecialUsed = false;
  fighter.invulnTimer = 2.0;
  fighter.respawnTimer = 1.35;
  fighter.lastHitBySlot = null;
  void stage;
}

export function checkProjectileHit(
  proj: ProjectileRuntime,
  target: FighterRuntime,
  attacker: FighterRuntime | null
): HitResolution | null {
  if (proj.ownerSlot === target.slot) return null;
  const projBox = {
    left: proj.x - proj.radius,
    right: proj.x + proj.radius,
    top: proj.y - proj.radius,
    bottom: proj.y + proj.radius,
  };
  if (!boxesOverlap(projBox, getHurtbox(target))) return null;

  const facing: 1 | -1 = proj.vx >= 0 ? 1 : -1;
  return applyHit(
    attacker,
    proj.ownerSlot,
    facing,
    target,
    proj.damage,
    proj.baseKnockback,
    proj.knockbackGrowth,
    proj.angleDeg,
    0.04
  );
}

export function tryReflectProjectiles(
  reflector: FighterRuntime,
  projectiles: ProjectileRuntime[]
): number {
  if (
    !reflector.attack ||
    !reflector.attack.spec.reflectsProjectiles ||
    !isAttackActive(reflector.attack)
  ) {
    return 0;
  }

  const hitbox = getAttackHitbox(reflector, reflector.attack.spec);
  let reflectedCount = 0;

  for (const proj of projectiles) {
    if (proj.ownerSlot === reflector.slot) continue;
    const projBox = {
      left: proj.x - proj.radius,
      right: proj.x + proj.radius,
      top: proj.y - proj.radius,
      bottom: proj.y + proj.radius,
    };
    if (boxesOverlap(hitbox, projBox)) {
      proj.ownerSlot = reflector.slot;
      proj.vx = -proj.vx * 1.45;
      proj.vy = proj.vy !== 0 ? proj.vy * 0.85 : 0;
      proj.damage = Math.round(proj.damage * 1.35);
      proj.life = 0;
      proj.color = reflector.spec.accentColor;
      reflectedCount += 1;
    }
  }

  return reflectedCount;
}
