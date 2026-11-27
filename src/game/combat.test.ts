import test from 'node:test';
import assert from 'node:assert/strict';
import { FIGHTERS } from './fighters';
import { STAGES } from './stages';
import {
  applyHit,
  calculateKnockback,
  checkBlastZone,
  createFighterRuntime,
  respawnFighter,
} from './combat';
import { stepFighterPhysics } from './physics';
import { computeCpuInput, createCpuBrain } from './ai';
import { FighterInputState } from './types';

function emptyInput(): FighterInputState {
  return {
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
}

test('knockback increases significantly with target damage percentage and inversely with weight', () => {
  const lowPctKb = calculateKnockback(10, 1.0, 220, 4.5);
  const highPctKb = calculateKnockback(140, 1.0, 220, 4.5);
  const heavyKb = calculateKnockback(140, 1.25, 220, 4.5);

  assert.ok(highPctKb > lowPctKb * 2, `Expected ${highPctKb} to be > 2x ${lowPctKb}`);
  assert.ok(heavyKb < highPctKb, `Expected heavy weight ${heavyKb} < baseline ${highPctKb}`);
});

test('applyHit updates damage %, applies launch velocity, and respects shield block', () => {
  const stage = STAGES.sky_temple;
  const attacker = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  const target = createFighterRuntime(1, FIGHTERS.gale, true, stage, 3);

  // Shielded hit should deal 0% damage and reduce shield health
  target.shielding = true;
  const blockedRes = applyHit(attacker, 0, 1, target, 14, 260, 4.5, 36, 0.05);
  assert.equal(blockedRes.blocked, true);
  assert.equal(target.damage, 0);
  assert.ok(target.shieldHealth < 100);

  // Unshielded hit increases damage and launches target upward and right
  target.shielding = false;
  const hitRes = applyHit(attacker, 0, 1, target, 14, 260, 4.5, 45, 0.05);
  assert.equal(hitRes.connected, true);
  assert.equal(hitRes.blocked, false);
  assert.equal(target.damage, 14);
  assert.equal(attacker.damageDealt, 14);
  assert.ok(target.vx > 0);
  assert.ok(target.vy < 0);
});

test('blast zone detection triggers KO beyond bounds and respawn resets damage to 0%', () => {
  const stage = STAGES.sky_temple;
  const f = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  f.damage = 125;

  assert.equal(checkBlastZone(f, stage), null);

  f.x = stage.blastZones.right + 15;
  assert.equal(checkBlastZone(f, stage), 'right');

  f.stocks -= 1;
  respawnFighter(f, stage);
  assert.equal(f.stocks, 2);
  assert.equal(f.damage, 0);
  assert.ok(f.invulnTimer > 0);
});

test('platform physics support jump, coyote time, landing, and pass-through drop', () => {
  const stage = STAGES.sky_temple;
  const f = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  // Put fighter on upper pass-through platform
  const topAltar = stage.platforms.find((p) => p.id === 'top_altar')!;
  f.x = 0;
  f.y = topAltar.y;
  f.grounded = true;
  f.onPassThrough = true;

  // Drop through pass-through platform when holding down
  const dropInput = { ...emptyInput(), down: true };
  stepFighterPhysics(f, dropInput, stage, 1 / 60);
  assert.equal(f.grounded, false);
  assert.ok(f.dropThroughTimer > 0);

  // Walk off main deck and verify coyote jump still works within 0.1s
  f.x = 0;
  f.y = stage.platforms[0].y;
  f.grounded = true;
  f.onPassThrough = false;
  f.coyoteTimer = 0.1;
  f.grounded = false; // Simulate just stepped off ledge
  const jumpInput = { ...emptyInput(), jumpJustPressed: true, jumpHeld: true };
  const ev = stepFighterPhysics(f, jumpInput, stage, 1 / 60);
  assert.equal(ev.jumped, true);
  assert.ok(f.vy < -500);
});

test('CPU AI recovers toward stage when knocked offstage below main deck', () => {
  const stage = STAGES.sky_temple;
  const p1 = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  const cpu = createFighterRuntime(1, FIGHTERS.gale, true, stage, 3);
  const brain = createCpuBrain();

  // Place CPU offstage left and falling below main platform
  cpu.x = -520;
  cpu.y = 240;
  cpu.grounded = false;
  cpu.vy = 180;
  cpu.jumpsRemaining = 1;

  const input1 = computeCpuInput(cpu, p1, stage, 'standard', brain, 1 / 60);
  assert.equal(input1.right, true, 'CPU should steer right back toward stage');
  assert.equal(input1.jumpJustPressed, true, 'CPU should use remaining double jump');

  // If out of jumps and still falling, CPU should trigger Up-Special recovery
  cpu.jumpsRemaining = 0;
  cpu.vy = 200;
  const input2 = computeCpuInput(cpu, p1, stage, 'standard', brain, 1 / 60);
  assert.equal(input2.up, true);
  assert.equal(input2.specialJustPressed, true);
});

import { tryReflectProjectiles } from './combat';
import { ProjectileRuntime } from './types';

test('Titan Tectonic Ram super armor absorbs damage without hitstun or knockback', () => {
  const stage = STAGES.sky_temple;
  const attacker = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  const titan = createFighterRuntime(1, FIGHTERS.titan, false, stage, 3);

  const ramSpec = FIGHTERS.titan.attacks.sideSpecial;
  titan.attack = {
    kind: 'sideSpecial',
    elapsed: ramSpec.windup + 0.02, // active frame
    hasHit: false,
    spec: ramSpec,
  };
  titan.vx = -450;

  const res = applyHit(attacker, 0, 1, titan, 12, 260, 4.5, 45, 0.05);
  assert.equal(res.connected, true);
  assert.equal(titan.damage, 12);
  assert.equal(titan.hitstunTimer, 0);
  assert.ok(titan.attack !== null, 'Super armor should preserve active charge attack');
  assert.equal(titan.vx, -450, 'Super armor should ignore knockback velocity');
});

test('Gale Reflector reverses enemy projectile ownership, direction, and boosts damage', () => {
  const stage = STAGES.sky_temple;
  const gale = createFighterRuntime(1, FIGHTERS.gale, false, stage, 3);
  gale.x = 120;
  gale.y = stage.platforms[0].y;

  const refSpec = FIGHTERS.gale.attacks.downSpecial;
  gale.attack = {
    kind: 'downSpecial',
    elapsed: refSpec.windup + 0.02,
    hasHit: false,
    spec: refSpec,
  };

  const fireball: ProjectileRuntime = {
    id: 1,
    ownerSlot: 0,
    visual: 'fireball',
    x: 130,
    y: gale.y - 34,
    vx: 500,
    vy: 0,
    gravity: 0,
    radius: 14,
    damage: 10,
    baseKnockback: 200,
    knockbackGrowth: 2.8,
    angleDeg: 40,
    color: '#FDBA74',
    life: 0.2,
    maxLife: 1.4,
  };

  const count = tryReflectProjectiles(gale, [fireball]);
  assert.equal(count, 1);
  assert.equal(fireball.ownerSlot, 1);
  assert.ok(fireball.vx < -600);
  assert.ok(fireball.damage > 10);
});

import {
  applyStageHazardEffects,
  createStageRuntime,
  stepStageRuntime,
} from './hazards';

test('moving platform carries grounded fighter along its X and Y motion', () => {
  const stage = STAGES.sky_temple;
  const runtime = createStageRuntime(stage);
  const f = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);

  const leftPerch = runtime.platforms.find((p) => p.id === 'left_perch')!;
  f.x = leftPerch.x + leftPerch.width * 0.5;
  f.y = leftPerch.y;
  f.grounded = true;
  f.onPassThrough = true;
  f.groundedPlatformId = leftPerch.id;

  const startX = f.x;
  const startY = f.y;

  // Step forward over 1.2s in 60Hz ticks
  let elapsed = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 72; i++) {
    elapsed += dt;
    stepStageRuntime(runtime, elapsed, { hazardsEnabled: true });
    stepFighterPhysics(f, emptyInput(), stage, dt, runtime.platforms);
  }

  assert.equal(f.grounded, true);
  assert.equal(f.groundedPlatformId, 'left_perch');
  assert.ok(Math.abs(f.x - startX) > 20, 'Fighter X should ride moving platform');
  assert.ok(Math.abs(f.y - startY) > 10, 'Fighter Y should ride moving platform');
  assert.ok(Math.abs(f.y - leftPerch.y) < 0.01, 'Fighter feet should stay flush on moving platform');
});

test('shrinking platform warns, vanishes (releasing grounded fighter), and reforms', () => {
  const stage = STAGES.sky_temple;
  const runtime = createStageRuntime(stage);
  const f = createFighterRuntime(0, FIGHTERS.gale, false, stage, 3);

  const topAltar = runtime.platforms.find((p) => p.id === 'top_altar')!;
  f.x = 0;
  f.y = topAltar.y;
  f.grounded = true;
  f.onPassThrough = true;
  f.groundedPlatformId = topAltar.id;

  // Warning phase at t = 5.5s (solidDuration 4.5, warnDuration 1.6)
  stepStageRuntime(runtime, 5.5, { hazardsEnabled: true });
  assert.equal(topAltar.active, true);
  assert.ok(topAltar.warningRatio > 0.5);
  assert.ok(topAltar.width < topAltar.baseWidth);

  // Collapsed phase at t = 7.0s
  const collapseEv = stepStageRuntime(runtime, 7.0, { hazardsEnabled: true });
  assert.equal(topAltar.active, false);
  assert.equal(collapseEv.collapsedPlatforms.length, 1);

  stepFighterPhysics(f, emptyInput(), stage, 1 / 60, runtime.platforms);
  assert.equal(f.grounded, false, 'Fighter should lose footing when shrinking platform vanishes');

  // Reforming phase at t = 9.3s -> back to full at t = 10.1s
  const reformEv = stepStageRuntime(runtime, 9.3, { hazardsEnabled: true });
  assert.equal(topAltar.active, true);
  assert.equal(reformEv.reformedPlatforms.length, 1);
  stepStageRuntime(runtime, 10.1, { hazardsEnabled: true });
  assert.equal(topAltar.width, topAltar.baseWidth);
});

test('Sky Temple solar pillar telegraphs before erupting and launches fighters inside', () => {
  const stage = STAGES.sky_temple;
  const runtime = createStageRuntime(stage);
  const f1 = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  const f2 = createFighterRuntime(1, FIGHTERS.titan, true, stage, 3);

  // Opening seconds must stay idle/safe
  stepStageRuntime(runtime, 2.0, { hazardsEnabled: true });
  assert.equal(runtime.hazard?.phase, 'idle');

  // Telegraph at t = 4.9s (initialDelay 4.5, telegraphDuration 1.1)
  const telEv = stepStageRuntime(runtime, 4.9, { hazardsEnabled: true });
  assert.equal(telEv.telegraphStarted, true);
  assert.equal(runtime.hazard?.phase, 'telegraph');

  // Place P1 inside center pillar x=0
  f1.x = 0;
  f1.y = stage.platforms[0].y;
  const noHitsDuringTel = applyStageHazardEffects(runtime, [f1, f2], 1 / 60);
  assert.equal(noHitsDuringTel.length, 0, 'Telegraph must not deal damage yet');

  // Active eruption at t = 5.75s
  const eruptEv = stepStageRuntime(runtime, 5.75, { hazardsEnabled: true });
  assert.equal(eruptEv.erupted, true);
  assert.equal(runtime.hazard?.phase, 'active');

  const hits = applyStageHazardEffects(runtime, [f1, f2], 1 / 60);
  assert.equal(hits.length, 1);
  assert.ok(f1.damage > 0);
  assert.ok(f1.vy < -200);

  // Should not multi-hit same fighter within same eruption
  const secondHits = applyStageHazardEffects(runtime, [f1, f2], 1 / 60);
  assert.equal(secondHits.length, 0);
});

test('Twin Spires storm updraft lifts airborne fighters inside the central pit', () => {
  const stage = STAGES.twin_pillars;
  const runtime = createStageRuntime(stage);
  const f1 = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  const f2 = createFighterRuntime(1, FIGHTERS.gale, true, stage, 3);

  // Center pit updraft active at t = 5.2s (initialDelay 4.0, telegraph 0.9, active 2.4)
  stepStageRuntime(runtime, 5.2, { hazardsEnabled: true });
  assert.equal(runtime.hazard?.phase, 'active');
  assert.equal(runtime.hazard?.spec.kind, 'storm_updraft');

  f1.x = 0;
  f1.y = 140;
  f1.grounded = false;
  f1.vy = 220;
  f1.upSpecialUsed = true;

  applyStageHazardEffects(runtime, [f1, f2], 0.1);
  assert.ok(f1.vy < 220, 'Updraft should accelerate airborne fighter upward');
  assert.equal(f1.upSpecialUsed, false, 'Updraft should refresh Up-Special recovery');
});

test('fighter near solid ledge grabs it, refreshes recovery, and supports climb, jump, attack, and drop', () => {
  const stage = STAGES.sky_temple;
  const mainDeck = stage.platforms[0]; // x: -360..360, y: 120

  // 1. Snap to left ledge while falling offstage
  const f = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  f.x = mainDeck.x - 22;
  f.y = mainDeck.y + 42;
  f.grounded = false;
  f.vy = 180;
  f.jumpsRemaining = 0;
  f.upSpecialUsed = true;

  const grabEv = stepFighterPhysics(f, emptyInput(), stage, 1 / 60);
  assert.ok(grabEv.grabbedLedge !== null);
  assert.ok(f.ledgeGrab !== null);
  assert.equal(f.ledgeGrab?.side, -1);
  assert.equal(f.facing, 1, 'Should face inward toward stage');
  assert.equal(f.jumpsRemaining, 2, 'Grabbing ledge should refresh jumps');
  assert.equal(f.upSpecialUsed, false, 'Grabbing ledge should refresh Up-Special');
  assert.ok(f.invulnTimer > 0.3, 'Ledge grab should grant brief invulnerability');

  // 2. Ledge Climb (hold inward right after 0.14s grace)
  for (let i = 0; i < 10; i++) {
    stepFighterPhysics(f, emptyInput(), stage, 1 / 60);
  }
  stepFighterPhysics(f, { ...emptyInput(), right: true }, stage, 1 / 60);
  assert.equal(f.ledgeGrab, null);
  assert.equal(f.grounded, true);
  assert.equal(f.y, mainDeck.y);
  assert.ok(f.x > mainDeck.x, 'Climb should place fighter cleanly on top of stage');

  // 3. Ledge Jump from right ledge
  const f2 = createFighterRuntime(1, FIGHTERS.gale, false, stage, 3);
  f2.x = mainDeck.x + mainDeck.width + 20;
  f2.y = mainDeck.y + 36;
  f2.grounded = false;
  f2.vy = 120;
  stepFighterPhysics(f2, emptyInput(), stage, 1 / 60);
  assert.equal(f2.ledgeGrab?.side, 1);

  for (let i = 0; i < 6; i++) {
    stepFighterPhysics(f2, emptyInput(), stage, 1 / 60);
  }
  const jumpEv = stepFighterPhysics(
    f2,
    { ...emptyInput(), jumpJustPressed: true, jumpHeld: true },
    stage,
    1 / 60
  );
  assert.equal(jumpEv.jumped, true);
  assert.equal(f2.ledgeGrab, null);
  assert.ok(f2.vy < -500);
  assert.ok(f2.vx < 0, 'Ledge jump should drift inward onto stage');

  // 4. Ledge Attack from left ledge
  const f3 = createFighterRuntime(0, FIGHTERS.titan, false, stage, 3);
  f3.x = mainDeck.x - 18;
  f3.y = mainDeck.y + 40;
  f3.grounded = false;
  f3.vy = 90;
  stepFighterPhysics(f3, emptyInput(), stage, 1 / 60);
  for (let i = 0; i < 6; i++) {
    stepFighterPhysics(f3, emptyInput(), stage, 1 / 60);
  }
  const atkEv = stepFighterPhysics(f3, { ...emptyInput(), attackJustPressed: true }, stage, 1 / 60);
  assert.equal(atkEv.startedAttack, 'sideTilt');
  assert.equal(f3.ledgeGrab, null);
  assert.equal(f3.grounded, true);
});

test('holding Down bypasses ledge grab and Ledge Drop sets cooldown', () => {
  const stage = STAGES.sky_temple;
  const mainDeck = stage.platforms[0];
  const f = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  f.x = mainDeck.x - 20;
  f.y = mainDeck.y + 40;
  f.grounded = false;
  f.vy = 150;

  // Holding Down should pass right by without grabbing
  stepFighterPhysics(f, { ...emptyInput(), down: true }, stage, 1 / 60);
  assert.equal(f.ledgeGrab, null);

  // Grab without Down, then drop after 0.14s
  stepFighterPhysics(f, emptyInput(), stage, 1 / 60);
  assert.ok(f.ledgeGrab !== null);
  for (let i = 0; i < 10; i++) {
    stepFighterPhysics(f, emptyInput(), stage, 1 / 60);
  }
  stepFighterPhysics(f, { ...emptyInput(), down: true }, stage, 1 / 60);
  assert.equal(f.ledgeGrab, null);
  assert.ok(f.ledgeCooldown > 0.2);
  assert.ok(f.vy > 0);
});

test('CPU hanging on ledge executes getup recovery option', () => {
  const stage = STAGES.sky_temple;
  const p1 = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  const cpu = createFighterRuntime(1, FIGHTERS.gale, true, stage, 3);
  const brain = createCpuBrain();
  const mainDeck = stage.platforms[0];

  cpu.x = mainDeck.x + mainDeck.width + 18;
  cpu.y = mainDeck.y + 35;
  cpu.grounded = false;
  cpu.vy = 100;
  stepFighterPhysics(cpu, emptyInput(), stage, 1 / 60);
  assert.ok(cpu.ledgeGrab !== null);

  // Advance hang timer >= 0.22s
  for (let i = 0; i < 15; i++) {
    stepFighterPhysics(cpu, emptyInput(), stage, 1 / 60);
  }

  const cpuIn = computeCpuInput(cpu, p1, stage, 'standard', brain, 1 / 60);
  const acted = cpuIn.left || cpuIn.right || cpuIn.jumpJustPressed || cpuIn.attackJustPressed;
  assert.equal(acted, true, 'CPU should choose a ledge getup option instead of stalling');
});

test('knockback stays controlled at 0%, scales to KO strength at 120%, and caps cleanly at extreme %', () => {
  const blazeJab = FIGHTERS.blaze.attacks.jab;
  const blazeNova = FIGHTERS.blaze.attacks.downSpecial;

  const zeroPctJab = calculateKnockback(0, 1.0, blazeJab.baseKnockback, blazeJab.knockbackGrowth);
  const highPctJab = calculateKnockback(120, 1.0, blazeJab.baseKnockback, blazeJab.knockbackGrowth);
  const koNova = calculateKnockback(120, 1.0, blazeNova.baseKnockback, blazeNova.knockbackGrowth);
  const extremeCap = calculateKnockback(300, 0.88, blazeNova.baseKnockback, blazeNova.knockbackGrowth);

  assert.ok(zeroPctJab <= 160, `0% jab knockback (${zeroPctJab}) should stay light for spacing`);
  assert.ok(highPctJab < 500, `120% jab (${highPctJab}) should not instantly KO from center`);
  assert.ok(koNova >= 850 && koNova <= 1250, `120% Solar Nova (${koNova}) should be a clean KO launch`);
  assert.ok(extremeCap <= 1650, `Extreme knockback (${extremeCap}) must remain capped`);
});

import {
  applyFighterState,
  buildRoomInviteUrl,
  deserializeProjectiles,
  generateRoomCode,
  isValidRoomCode,
  NetInputTracker,
  normalizeRoomCode,
  parseRoomFromSearch,
  roomCodeToPeerId,
  serializeFighterState,
  serializeProjectiles,
} from './netcode';

test('room code normalization, validation, peer IDs, and invite URL roundtrip', () => {
  const generated = generateRoomCode(6);
  assert.equal(generated.length, 6);
  assert.equal(isValidRoomCode(generated), true);

  assert.equal(normalizeRoomCode(' ab-94z! '), 'AB94Z');
  assert.equal(isValidRoomCode('abc'), false);
  assert.equal(isValidRoomCode('AB94Z'), true);
  assert.equal(roomCodeToPeerId('ab94z'), 'skyline-brawl-AB94Z');

  const invite = buildRoomInviteUrl('https://user.github.io/skyline-brawl/?autostart=1', 'ab94z');
  assert.equal(invite, 'https://user.github.io/skyline-brawl/?room=AB94Z');

  const parsed = parseRoomFromSearch(new URL(invite).search);
  assert.equal(parsed, 'AB94Z');
  assert.equal(parseRoomFromSearch('?room=xx'), null);
});

test('NetInputTracker triggers sequenced taps once without double-firing or dropping', () => {
  const tracker = new NetInputTracker();

  tracker.pushRemote({
    left: true,
    right: false,
    up: false,
    down: false,
    jumpHeld: true,
    shieldHeld: false,
    jumpSeq: 1,
    attackSeq: 1,
    specialSeq: 0,
    dodgeSeq: 0,
  });

  const frame1 = tracker.consumeFrameInput();
  assert.equal(frame1.left, true);
  assert.equal(frame1.jumpHeld, true);
  assert.equal(frame1.jumpJustPressed, true);
  assert.equal(frame1.attackJustPressed, true);
  assert.equal(frame1.specialJustPressed, false);

  // Consuming again without a newer packet must keep held keys but NOT re-fire edge taps
  const frame2 = tracker.consumeFrameInput();
  assert.equal(frame2.left, true);
  assert.equal(frame2.jumpHeld, true);
  assert.equal(frame2.jumpJustPressed, false);
  assert.equal(frame2.attackJustPressed, false);

  // Advancing specialSeq triggers only specialJustPressed
  tracker.pushRemote({
    left: false,
    right: true,
    up: true,
    down: false,
    jumpHeld: false,
    shieldHeld: true,
    jumpSeq: 1,
    attackSeq: 1,
    specialSeq: 1,
    dodgeSeq: 1,
  });

  const frame3 = tracker.consumeFrameInput();
  assert.equal(frame3.right, true);
  assert.equal(frame3.shieldHeld, true);
  assert.equal(frame3.jumpJustPressed, false);
  assert.equal(frame3.attackJustPressed, false);
  assert.equal(frame3.specialJustPressed, true);
  assert.equal(frame3.dodgeJustPressed, true);
});

test('fighter and projectile net serialization roundtrips accurately', () => {
  const stage = STAGES.sky_temple;
  const source = createFighterRuntime(0, FIGHTERS.blaze, false, stage, 3);
  source.x = 142.36;
  source.y = -48.12;
  source.vx = 285.44;
  source.vy = -410.67;
  source.facing = -1;
  source.damage = 87.6;
  source.stocks = 2;
  source.attack = {
    kind: 'upSpecial',
    elapsed: 0.14,
    hasHit: false,
    spec: FIGHTERS.blaze.attacks.upSpecial,
  };
  source.ledgeGrab = {
    platformId: 'main_deck',
    side: -1,
    ledgeX: -360,
    ledgeY: 120,
    timer: 0.3,
  };

  const snap = serializeFighterState(source);
  const target = createFighterRuntime(0, FIGHTERS.titan, false, stage, 3);
  applyFighterState(target, snap);

  assert.equal(target.spec.id, 'blaze');
  assert.equal(target.x, 142.4);
  assert.equal(target.y, -48.1);
  assert.equal(target.facing, -1);
  assert.equal(target.damage, 88);
  assert.equal(target.stocks, 2);
  assert.equal(target.attack?.kind, 'upSpecial');
  assert.equal(target.attack?.elapsed, 0.14);
  assert.equal(target.ledgeGrab?.platformId, 'main_deck');

  const projs: ProjectileRuntime[] = [
    {
      id: 7,
      ownerSlot: 0,
      visual: 'fireball',
      x: 55.25,
      y: 80.75,
      vx: 520,
      vy: -12,
      gravity: 0,
      radius: 13,
      damage: 9,
      baseKnockback: 180,
      knockbackGrowth: 2.5,
      angleDeg: 35,
      color: '#FDBA74',
      life: 0.2,
      maxLife: 1.6,
    },
  ];

  const deserialized = deserializeProjectiles(serializeProjectiles(projs));
  assert.equal(deserialized.length, 1);
  assert.equal(deserialized[0].id, 7);
  assert.equal(deserialized[0].visual, 'fireball');
  assert.equal(deserialized[0].x, 55.3);
  assert.equal(deserialized[0].y, 80.8);
});
