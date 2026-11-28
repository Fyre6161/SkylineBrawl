import { ParticlePool } from './particles';
import { isAttackActive } from './combat';
import {
  ActiveHazardState,
  FighterRuntime,
  ProjectileRuntime,
  RuntimePlatform,
  StageSpec,
} from './types';

export interface BlastBeamEffect {
  x: number;
  y: number;
  angle: number;
  color: string;
  accentColor?: string;
  isFinal?: boolean;
  life: number;
  maxLife: number;
}

export interface RenderState {
  stage: StageSpec;
  platforms: RuntimePlatform[];
  activeHazard: ActiveHazardState | null;
  fighters: [FighterRuntime, FighterRuntime];
  projectiles: ProjectileRuntime[];
  particles: ParticlePool;
  blastBeams: BlastBeamEffect[];
  camX: number;
  camY: number;
  camZoom: number;
  shakeX: number;
  shakeY: number;
  worldTime: number;
  isTitleTour: boolean;
}

let cachedBgCanvas: HTMLCanvasElement | null = null;
let cachedBgKey = '';

function getStaticBackdrop(
  width: number,
  height: number,
  stage: StageSpec
): HTMLCanvasElement {
  const key = `${stage.id}:${width}:${height}`;
  if (cachedBgCanvas && cachedBgKey === key) {
    return cachedBgCanvas;
  }

  if (!cachedBgCanvas) {
    cachedBgCanvas = document.createElement('canvas');
  }
  cachedBgCanvas.width = width;
  cachedBgCanvas.height = height;
  cachedBgKey = key;

  const bctx = cachedBgCanvas.getContext('2d');
  if (!bctx) return cachedBgCanvas;

  const skyGrad = bctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, stage.skyTop);
  skyGrad.addColorStop(0.58, stage.skyMid);
  skyGrad.addColorStop(1, stage.skyBottom);
  bctx.fillStyle = skyGrad;
  bctx.fillRect(0, 0, width, height);

  const sunX = width * 0.5;
  const sunY = height * 0.42;
  const sunGrad = bctx.createRadialGradient(
    sunX,
    sunY,
    20,
    sunX,
    sunY,
    Math.min(width, height) * 0.48
  );
  sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
  sunGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.06)');
  sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  bctx.fillStyle = sunGrad;
  bctx.fillRect(0, 0, width, height);

  return cachedBgCanvas;
}

export function renderArena(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderState
): void {
  const { stage, platforms, activeHazard, fighters, projectiles, particles, blastBeams, worldTime } =
    state;

  const bg = getStaticBackdrop(width, height, stage);
  ctx.drawImage(bg, 0, 0, width, height);

  ctx.save();
  ctx.translate(width * 0.5 + state.shakeX, height * 0.52 + state.shakeY);
  ctx.scale(state.camZoom, state.camZoom);
  ctx.translate(-state.camX, -state.camY);

  if (activeHazard && activeHazard.phase !== 'idle') {
    drawStageHazard(ctx, activeHazard, worldTime);
  }

  drawStagePlatforms(ctx, stage, platforms, worldTime);

  for (const beam of blastBeams) {
    drawBlastBeamSpectacle(ctx, beam);
  }

  for (const fighter of fighters) {
    if (fighter.stocks <= 0) continue;
    drawFighter(ctx, fighter, worldTime, state.isTitleTour);
  }

  for (const proj of projectiles) {
    drawProjectile(ctx, proj, worldTime);
  }

  drawParticles(ctx, particles);

  ctx.restore();

  // Brief high-contrast KO impact flash across screen
  for (const beam of blastBeams) {
    if (beam.life < 0.14) {
      const flashAlpha = (1 - beam.life / 0.14) * (beam.isFinal ? 0.42 : 0.26);
      ctx.save();
      ctx.fillStyle = `rgba(255, 250, 230, ${flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  if (!state.isTitleTour) {
    for (const fighter of fighters) {
      if (fighter.stocks <= 0 || fighter.respawnTimer > 0) continue;
      drawOffstageIndicator(ctx, width, height, fighter, state);
    }
  }
}

function drawBlastBeamSpectacle(
  ctx: CanvasRenderingContext2D,
  beam: BlastBeamEffect
): void {
  const t = Math.min(1, beam.life / beam.maxLife);
  const alpha = Math.max(0, 1 - t * t);
  const flareBoost = beam.isFinal ? 1.25 : 1;
  const accent = beam.accentColor ?? '#FEF08A';

  ctx.save();
  ctx.translate(beam.x, beam.y);
  ctx.rotate(beam.angle);

  // Outer energetic blast cone
  const halfOuter = (1 - t * 0.45) * 96 * flareBoost;
  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = beam.color;
  ctx.beginPath();
  ctx.moveTo(0, -halfOuter * 0.18);
  ctx.lineTo(960, -halfOuter * 1.65);
  ctx.lineTo(960, halfOuter * 1.65);
  ctx.lineTo(0, halfOuter * 0.18);
  ctx.closePath();
  ctx.fill();

  // Mid bright accent beam
  const halfMid = (1 - t * 0.55) * 52 * flareBoost;
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, -halfMid * 0.14);
  ctx.lineTo(940, -halfMid * 1.35);
  ctx.lineTo(940, halfMid * 1.35);
  ctx.lineTo(0, halfMid * 0.14);
  ctx.closePath();
  ctx.fill();

  // Blazing white-hot core lance
  const halfCore = (1 - t * 0.65) * 22 * flareBoost;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, -halfCore * 0.25);
  ctx.lineTo(900, -halfCore * 0.9);
  ctx.lineTo(900, halfCore * 0.9);
  ctx.lineTo(0, halfCore * 0.25);
  ctx.closePath();
  ctx.fill();

  // Rotating 8-point starburst crown at the blast edge
  ctx.rotate(t * 1.8);
  const spikeCount = 8;
  const outerR = (52 + t * 95) * flareBoost;
  const innerR = outerR * 0.24;
  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  for (let i = 0; i < spikeCount * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / spikeCount;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawStageHazard(
  ctx: CanvasRenderingContext2D,
  hazard: ActiveHazardState,
  worldTime: number
): void {
  const { spec, phase, phaseProgress, x } = hazard;
  const halfW = spec.width * 0.5;
  const height = spec.yBottom - spec.yTop;

  ctx.save();
  if (spec.kind === 'solar_pillar') {
    if (phase === 'telegraph') {
      const pulse = 0.55 + Math.sin(worldTime * 22) * 0.3;
      const beamAlpha = 0.1 + phaseProgress * 0.22;
      ctx.fillStyle = `rgba(251, 146, 60, ${beamAlpha})`;
      ctx.fillRect(x - halfW, spec.yTop, spec.width, height);

      // Floor warning rune strip
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.fillRect(x - halfW, spec.yBottom - 6, spec.width, 8);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(x - halfW * phaseProgress, spec.yBottom - 4, spec.width * phaseProgress, 4);
    } else if (phase === 'active') {
      const fade = Math.max(0.2, 1 - phaseProgress * 0.65);
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#FB923C';
      ctx.fillRect(x - halfW, spec.yTop, spec.width, height);

      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(x - halfW * 0.52, spec.yTop, spec.width * 0.52 * 2, height);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - halfW * 0.2, spec.yTop, spec.width * 0.4, height);
    }
  } else if (spec.kind === 'storm_updraft') {
    const isTel = phase === 'telegraph';
    ctx.fillStyle = isTel
      ? `rgba(103, 232, 249, ${0.06 + phaseProgress * 0.1})`
      : 'rgba(103, 232, 249, 0.14)';
    ctx.fillRect(x - halfW, spec.yTop, spec.width, height);

    // Rising wind streamlines & upward chevrons
    const streamCount = 4;
    ctx.strokeStyle = isTel ? 'rgba(103, 232, 249, 0.45)' : 'rgba(186, 230, 253, 0.72)';
    ctx.lineWidth = isTel ? 2 : 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < streamCount; i++) {
      const sx = x - halfW * 0.65 + (i / (streamCount - 1)) * spec.width * 0.65;
      const offset = ((worldTime * (isTel ? 140 : 340) + i * 95) % height);
      const sy = spec.yBottom - offset;
      const len = isTel ? 28 : 48;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, Math.max(spec.yTop, sy - len));
      ctx.stroke();
    }

    if (!isTel) {
      // Subtle upward arrow chevron in gap center
      const chevY = spec.yBottom - 40 - ((worldTime * 200) % (height - 80));
      ctx.beginPath();
      ctx.moveTo(x - 18, chevY + 12);
      ctx.lineTo(x, chevY);
      ctx.lineTo(x + 18, chevY + 12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStagePlatforms(
  ctx: CanvasRenderingContext2D,
  stage: StageSpec,
  platforms: RuntimePlatform[],
  worldTime: number
): void {
  for (const plat of platforms) {
    // Draw subtle motion rail track for moving platforms
    if (plat.behavior?.kind === 'move') {
      const { ampX, ampY } = plat.behavior;
      const cx0 = plat.baseX + plat.baseWidth * 0.5;
      const cy0 = plat.baseY + plat.height * 0.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cx0 - ampX, cy0 - ampY);
      ctx.lineTo(cx0 + ampX, cy0 + ampY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw ghost outline when a shrinking platform has vanished
    if (!plat.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(plat.baseX, plat.baseY, plat.baseWidth, plat.height);
      ctx.restore();
      continue;
    }

    if (plat.passThrough) {
      const warn = plat.warningRatio;
      const pulse = warn > 0 ? 0.5 + Math.sin(worldTime * 22) * 0.5 : 0;

      ctx.fillStyle = warn > 0 ? (pulse > 0.5 ? '#991B1B' : '#7C2D12') : '#475569';
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.fill();

      ctx.fillStyle = warn > 0 ? '#FCA5A5' : '#E2E8F0';
      ctx.fillRect(plat.x + 2, plat.y, Math.max(0, plat.width - 4), 4);

      if (plat.behavior?.kind === 'move') {
        // Subtle sky-glow underside bar indicating active glide platform
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(plat.x + plat.width * 0.25, plat.y + plat.height - 3, plat.width * 0.5, 3);
      } else if (warn > 0) {
        // Shrinking edge markers
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(plat.x, plat.y, 6, plat.height);
        ctx.fillRect(plat.x + plat.width - 6, plat.y, 6, plat.height);
      }
    } else {
      const cx = plat.x + plat.width * 0.5;
      const underDepth = 64;

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(plat.x + 14, plat.y + plat.height - 2);
      ctx.lineTo(plat.x + plat.width - 14, plat.y + plat.height - 2);
      ctx.lineTo(cx + plat.width * 0.18, plat.y + plat.height + underDepth);
      ctx.lineTo(cx - plat.width * 0.18, plat.y + plat.height + underDepth);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = stage.stoneMain;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(plat.x + 4, plat.y, plat.width - 8, 5);

      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(plat.x + 4, plat.y + 5, 12, 4);
      ctx.fillRect(plat.x + plat.width - 16, plat.y + 5, 12, 4);
    }
  }
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number,
  isTitleTour: boolean
): void {
  ctx.save();

  if (f.invulnTimer > 0 && Math.floor(time * 18) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  if (f.respawnTimer > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + 6, 36, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = f.spec.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  if (f.grounded) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + 2, f.spec.width * 0.55, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (f.ledgeGrab) {
    ctx.save();
    ctx.strokeStyle = f.slot === 0 ? '#FCA5A5' : '#93C5FD';
    ctx.fillStyle = f.spec.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(f.ledgeGrab.ledgeX, f.ledgeGrab.ledgeY + 2, 7 + Math.sin(time * 12) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(f.ledgeGrab.ledgeX, f.ledgeGrab.ledgeY + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.translate(f.x, f.y);
  ctx.scale(f.facing * f.squashX, f.squashY);

  const isHitFlash = f.hitFlashTimer > 0;
  const stride = f.grounded && Math.abs(f.vx) > 25 ? Math.sin(f.walkPhase) : 0;
  const idleBob = f.grounded && Math.abs(f.vx) <= 25 ? Math.sin(time * 4.5 + f.slot) * 1.8 : 0;

  if (f.spec.id === 'blaze') {
    drawBlazeSprite(ctx, f, time, stride, idleBob, isHitFlash);
  } else if (f.spec.id === 'gale') {
    drawGaleSprite(ctx, f, time, stride, idleBob, isHitFlash);
  } else if (f.spec.id === 'titan') {
    drawTitanSprite(ctx, f, time, stride, idleBob, isHitFlash);
  } else if (f.spec.id === 'volt') {
    drawVoltSprite(ctx, f, time, stride, idleBob, isHitFlash);
  } else {
    drawFrostSprite(ctx, f, time, stride, idleBob, isHitFlash);
  }

  // Raised gripping hand toward ledge when hanging
  if (f.ledgeGrab) {
    ctx.save();
    ctx.fillStyle = f.spec.accentColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(13, -f.spec.height * 0.7, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Elemental Attack VFX
  if (f.attack) {
    drawAttackEffects(ctx, f, time);
  }

  // Energy Shield Bubble
  if (f.shielding && f.shieldHealth > 0) {
    const ratio = Math.max(0.25, f.shieldHealth / 100);
    const shieldR = Math.max(f.spec.width, f.spec.height) * 0.68 * ratio;
    ctx.fillStyle = f.slot === 0 ? 'rgba(239, 68, 68, 0.28)' : 'rgba(59, 130, 246, 0.28)';
    ctx.strokeStyle = f.slot === 0 ? '#FCA5A5' : '#93C5FD';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -f.spec.height * 0.5, shieldR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (f.shieldBrokenTimer > 0) {
    ctx.fillStyle = '#FACC15';
    for (let i = 0; i < 3; i++) {
      const ang = time * 6 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 18, -f.spec.height - 10 + Math.sin(ang) * 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  if (!isTitleTour) {
    ctx.save();
    const tagY = f.y - f.spec.height - 22;
    const label = f.slot === 0 ? 'P1' : f.isCpu ? 'CPU' : 'P2';
    const tagColor = f.slot === 0 ? '#EF4444' : '#3B82F6';

    ctx.fillStyle = tagColor;
    ctx.beginPath();
    ctx.moveTo(f.x - 6, tagY + 4);
    ctx.lineTo(f.x + 6, tagY + 4);
    ctx.lineTo(f.x, tagY + 11);
    ctx.closePath();
    ctx.fill();

    ctx.font = '700 12px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0B1120';
    ctx.strokeText(label, f.x, tagY);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(label, f.x, tagY);
    ctx.restore();
  }
}

function drawBlazeSprite(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number,
  stride: number,
  idleBob: number,
  flash: boolean
): void {
  const mainCol = flash ? '#FFFFFF' : '#EF4444';
  const darkCol = flash ? '#F8FAFC' : '#7F1D1D';
  const flameCol = flash ? '#FFFFFF' : '#FB923C';
  const goldCol = flash ? '#FFFFFF' : '#FDE047';

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.8;

  // Flowing flame-tail headband ribbons behind head
  const ribbonWave = Math.sin(time * 9) * 3;
  ctx.fillStyle = flameCol;
  ctx.beginPath();
  ctx.moveTo(-6, -54 + idleBob);
  ctx.lineTo(-24, -58 + ribbonWave);
  ctx.lineTo(-19, -49 + ribbonWave);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Martial arts pants legs
  const legF = f.grounded ? stride * 10 : 8;
  const legB = f.grounded ? -stride * 10 : -7;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(-8 + legB, -22, 10, 22, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-2 + legF, -22, 10, 22, 4);
  ctx.fill();
  ctx.stroke();

  // Red boots / wraps
  ctx.fillStyle = mainCol;
  ctx.fillRect(-8 + legB, -6, 10, 6);
  ctx.fillRect(-2 + legF, -6, 10, 6);

  // Tapered Sleeveless Gi Torso
  ctx.fillStyle = mainCol;
  ctx.beginPath();
  ctx.moveTo(-13, -47 + idleBob);
  ctx.lineTo(13, -47 + idleBob);
  ctx.lineTo(10, -21 + idleBob);
  ctx.lineTo(-10, -21 + idleBob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden Flame Sash Belt
  ctx.fillStyle = goldCol;
  ctx.fillRect(-10, -26 + idleBob, 20, 4.5);

  // Head
  const headY = -54 + idleBob;
  ctx.fillStyle = darkCol;
  ctx.beginPath();
  ctx.arc(0, headY, 12.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spiky Flickering Flame Hair Crest
  const flicker = Math.sin(time * 14) * 1.6;
  ctx.fillStyle = flameCol;
  ctx.beginPath();
  ctx.moveTo(-10, headY - 6);
  ctx.lineTo(-12, headY - 19 + flicker);
  ctx.lineTo(-4, headY - 13);
  ctx.lineTo(2, headY - 24 - flicker);
  ctx.lineTo(7, headY - 13);
  ctx.lineTo(13, headY - 18 + flicker * 0.5);
  ctx.lineTo(9, headY - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Ember Eyes
  ctx.fillStyle = goldCol;
  ctx.beginPath();
  ctx.moveTo(2, headY - 2);
  ctx.lineTo(10, headY - 4);
  ctx.lineTo(9, headY + 1);
  ctx.lineTo(2, headY + 1);
  ctx.closePath();
  ctx.fill();

  // Wrapped Brawler Fist
  if (!f.attack) {
    ctx.fillStyle = flameCol;
    ctx.beginPath();
    ctx.arc(14, -34 + idleBob - stride * 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawGaleSprite(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number,
  stride: number,
  idleBob: number,
  flash: boolean
): void {
  const mainCol = flash ? '#FFFFFF' : '#2563EB';
  const darkCol = flash ? '#F8FAFC' : '#1E3A8A';
  const windCol = flash ? '#FFFFFF' : '#67E8F9';

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.6;

  // Twin Flowing Tailwind Scarf Ribbons
  const waveA = Math.sin(time * 8) * 4;
  const waveB = Math.cos(time * 7) * 3;
  ctx.fillStyle = windCol;
  ctx.beginPath();
  ctx.moveTo(-5, -46 + idleBob);
  ctx.quadraticCurveTo(-22, -48 + waveA, -32, -34 + waveB);
  ctx.lineTo(-16, -37 + waveA * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Slim Agile Legs
  const legF = f.grounded ? stride * 11 : 9;
  const legB = f.grounded ? -stride * 11 : -7;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-6 + legB, -23, 8, 23, 3.5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-1 + legF, -23, 8, 23, 3.5);
  ctx.fill();
  ctx.stroke();

  // Sleek Tunic Torso with V-cloak
  ctx.fillStyle = mainCol;
  ctx.beginPath();
  ctx.moveTo(-11, -47 + idleBob);
  ctx.lineTo(11, -47 + idleBob);
  ctx.lineTo(13, -18 + idleBob);
  ctx.lineTo(-12, -20 + idleBob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Silver Aero Chest Stripe
  ctx.fillStyle = windCol;
  ctx.beginPath();
  ctx.moveTo(-2, -45 + idleBob);
  ctx.lineTo(8, -45 + idleBob);
  ctx.lineTo(2, -24 + idleBob);
  ctx.lineTo(-5, -24 + idleBob);
  ctx.closePath();
  ctx.fill();

  // Pointed Aerodynamic Wind Hood / Helmet
  const headY = -54 + idleBob;
  ctx.fillStyle = darkCol;
  ctx.beginPath();
  ctx.moveTo(-18, headY - 8);
  ctx.lineTo(4, headY - 14);
  ctx.lineTo(12, headY - 2);
  ctx.lineTo(9, headY + 9);
  ctx.lineTo(-10, headY + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Cyan Visor Slit
  ctx.fillStyle = windCol;
  ctx.fillRect(1, headY - 3, 9, 3.5);

  // Curved Wind-Katana held ready when not attacking
  if (!f.attack) {
    ctx.save();
    ctx.translate(9, -32 + idleBob);
    ctx.rotate(-0.45 + stride * 0.08);
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(16, -5, 28, -11);
    ctx.quadraticCurveTo(18, -1, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawTitanSprite(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number,
  stride: number,
  idleBob: number,
  flash: boolean
): void {
  const mainCol = flash ? '#FFFFFF' : '#D97706';
  const armorCol = flash ? '#FFFFFF' : '#78350F';
  const stoneCol = flash ? '#FFFFFF' : '#475569';
  const goldCol = flash ? '#FFFFFF' : '#FEF08A';

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.2;

  // Heavy Thick Greaves / Legs
  const legF = f.grounded ? stride * 8 : 6;
  const legB = f.grounded ? -stride * 8 : -6;
  ctx.fillStyle = stoneCol;
  ctx.beginPath();
  ctx.roundRect(-13 + legB, -24, 14, 24, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-1 + legF, -24, 14, 24, 4);
  ctx.fill();
  ctx.stroke();

  // Massive Broad-Shouldered Trapezoid Armor Torso
  ctx.fillStyle = armorCol;
  ctx.beginPath();
  ctx.moveTo(-22, -56 + idleBob);
  ctx.lineTo(22, -56 + idleBob);
  ctx.lineTo(16, -22 + idleBob);
  ctx.lineTo(-16, -22 + idleBob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pauldron Shoulder Plates
  ctx.fillStyle = mainCol;
  ctx.beginPath();
  ctx.roundRect(-24, -58 + idleBob, 15, 16, 4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(9, -58 + idleBob, 15, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Glowing Core Rune on Chest
  const pulse = 0.8 + Math.sin(time * 4) * 0.2;
  ctx.fillStyle = goldCol;
  ctx.globalAlpha *= pulse;
  ctx.beginPath();
  ctx.moveTo(0, -49 + idleBob);
  ctx.lineTo(7, -39 + idleBob);
  ctx.lineTo(0, -29 + idleBob);
  ctx.lineTo(-7, -39 + idleBob);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Horned Juggernaut Steel Helm
  const headY = -61 + idleBob;
  ctx.fillStyle = stoneCol;
  ctx.beginPath();
  ctx.roundRect(-12, headY - 11, 24, 20, 5);
  ctx.fill();
  ctx.stroke();

  // Twin Horns
  ctx.fillStyle = goldCol;
  ctx.beginPath();
  ctx.moveTo(-9, headY - 10);
  ctx.lineTo(-15, headY - 21);
  ctx.lineTo(-3, headY - 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5, headY - 10);
  ctx.lineTo(14, headY - 21);
  ctx.lineTo(10, headY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Visor Bar
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-4, headY - 4, 14, 6);
  ctx.fillStyle = goldCol;
  ctx.fillRect(1, headY - 2.5, 7, 3);

  // Oversized Heavy Stone Gauntlet Fist
  if (!f.attack) {
    ctx.fillStyle = mainCol;
    ctx.beginPath();
    ctx.roundRect(13, -40 + idleBob - stride * 3, 14, 15, 4);
    ctx.fill();
    ctx.stroke();
  }
}

function drawVoltSprite(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number,
  stride: number,
  idleBob: number,
  flash: boolean
): void {
  const mainCol = flash ? '#FFFFFF' : '#8B5CF6';
  const darkCol = flash ? '#FFFFFF' : '#4C1D95';
  const sparkCol = flash ? '#FFFFFF' : '#FACC15';
  const suitCol = flash ? '#FFFFFF' : '#1E1B4B';

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.8;

  // Agile ninja shinobi legs
  const legF = f.grounded ? stride * 9 : 4;
  const legB = f.grounded ? -stride * 9 : -4;

  ctx.fillStyle = darkCol;
  ctx.beginPath();
  ctx.roundRect(-9 + legB, -24, 8, 24, 3);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(1 + legF, -24, 8, 24, 3);
  ctx.fill();
  ctx.stroke();

  // Yellow conduction bands on shins
  ctx.fillStyle = sparkCol;
  ctx.fillRect(-8 + legB, -12, 6, 3);
  ctx.fillRect(2 + legF, -12, 6, 3);

  // Sleek Ninja Torso & Electric Tunic
  ctx.fillStyle = suitCol;
  ctx.beginPath();
  ctx.roundRect(-12, -50 + idleBob, 24, 28, 4);
  ctx.fill();
  ctx.stroke();

  // Violet ninja vest / sash
  ctx.fillStyle = mainCol;
  ctx.beginPath();
  ctx.moveTo(-11, -50 + idleBob);
  ctx.lineTo(11, -50 + idleBob);
  ctx.lineTo(5, -24 + idleBob);
  ctx.lineTo(-5, -24 + idleBob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing lightning crest on chest
  ctx.fillStyle = sparkCol;
  ctx.beginPath();
  ctx.moveTo(3, -45 + idleBob);
  ctx.lineTo(-4, -37 + idleBob);
  ctx.lineTo(1, -37 + idleBob);
  ctx.lineTo(-2, -28 + idleBob);
  ctx.lineTo(5, -35 + idleBob);
  ctx.lineTo(0, -35 + idleBob);
  ctx.closePath();
  ctx.fill();

  // Head: Ninja Hood & Mask
  const headY = -54 + idleBob;
  ctx.fillStyle = darkCol;
  ctx.beginPath();
  ctx.roundRect(-9, headY - 14, 18, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Headband tails fluttering behind
  const flutter = Math.sin(time * 12) * 4;
  ctx.fillStyle = mainCol;
  ctx.beginPath();
  ctx.moveTo(-9, headY - 6);
  ctx.quadraticCurveTo(-18, headY - 10 + flutter, -26, headY - 4 + flutter);
  ctx.lineTo(-24, headY + flutter);
  ctx.quadraticCurveTo(-16, headY - 4 + flutter, -9, headY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Electric Eye Visor
  ctx.fillStyle = sparkCol;
  ctx.beginPath();
  ctx.moveTo(-6, headY - 7);
  ctx.lineTo(8, -6 + headY);
  ctx.lineTo(6, -3 + headY);
  ctx.lineTo(-6, -4 + headY);
  ctx.closePath();
  ctx.fill();

  // Twin Electric Storm Kunai held ready when not attacking
  if (!f.attack) {
    ctx.save();
    ctx.translate(11, -32 + idleBob);
    ctx.rotate(0.35 + stride * 0.06);
    ctx.fillStyle = sparkCol;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(14, -8);
    ctx.lineTo(11, 0);
    ctx.lineTo(14, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Spark halo
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFrostSprite(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number,
  stride: number,
  idleBob: number,
  flash: boolean
): void {
  const coatCol = flash ? '#FFFFFF' : '#06B6D4';
  const navyCol = flash ? '#FFFFFF' : '#164E63';
  const iceCol = flash ? '#FFFFFF' : '#E0F2FE';
  const trimCol = flash ? '#FFFFFF' : '#BAE6FD';

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.8;

  // Glacial Boots / Legs
  const legF = f.grounded ? stride * 8 : 4;
  const legB = f.grounded ? -stride * 8 : -4;

  ctx.fillStyle = navyCol;
  ctx.beginPath();
  ctx.roundRect(-9 + legB, -24, 8, 24, 3);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(1 + legF, -24, 8, 24, 3);
  ctx.fill();
  ctx.stroke();

  // Silver Ice boot caps
  ctx.fillStyle = iceCol;
  ctx.fillRect(-9 + legB, -8, 8, 4);
  ctx.fillRect(1 + legF, -8, 8, 4);

  // Flowing Glacial Trench Coat
  const coatWave = Math.sin(time * 6 + f.vx * 0.01) * 3;
  ctx.fillStyle = coatCol;
  ctx.beginPath();
  ctx.moveTo(-12, -49 + idleBob);
  ctx.lineTo(12, -49 + idleBob);
  ctx.lineTo(15, -16 + idleBob);
  ctx.lineTo(-18 + coatWave, -14 + idleBob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White Fur / Silver Trim on Coat Hem
  ctx.fillStyle = iceCol;
  ctx.beginPath();
  ctx.moveTo(-19 + coatWave, -14 + idleBob);
  ctx.lineTo(15, -16 + idleBob);
  ctx.lineTo(15, -12 + idleBob);
  ctx.lineTo(-20 + coatWave, -10 + idleBob);
  ctx.closePath();
  ctx.fill();

  // Arctic Undersuit & Diamond Brooch
  ctx.fillStyle = navyCol;
  ctx.fillRect(-6, -46 + idleBob, 12, 16);
  ctx.fillStyle = iceCol;
  ctx.beginPath();
  ctx.moveTo(0, -44 + idleBob);
  ctx.lineTo(4, -39 + idleBob);
  ctx.lineTo(0, -34 + idleBob);
  ctx.lineTo(-4, -39 + idleBob);
  ctx.closePath();
  ctx.fill();

  // Head & Crystalline Frost Crown
  const headY = -54 + idleBob;
  ctx.fillStyle = trimCol;
  ctx.beginPath();
  ctx.roundRect(-9, headY - 13, 18, 15, 4);
  ctx.fill();
  ctx.stroke();

  // Pointed Ice Crystal Crown / Tiara
  ctx.fillStyle = iceCol;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, headY - 12);
  ctx.lineTo(-6, headY - 21);
  ctx.lineTo(-2, headY - 14);
  ctx.lineTo(0, headY - 23);
  ctx.lineTo(2, headY - 14);
  ctx.lineTo(6, headY - 21);
  ctx.lineTo(8, headY - 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Pale Cyan Eyes
  ctx.fillStyle = '#0891B2';
  ctx.fillRect(-4, headY - 6, 3, 3);
  ctx.fillRect(3, headY - 6, 3, 3);

  // Translucent Crystalline Ice Rapier held in duelist stance
  if (!f.attack) {
    ctx.save();
    ctx.translate(10, -33 + idleBob);
    ctx.rotate(-0.4 + stride * 0.05);
    ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(26, -3);
    ctx.lineTo(30, 0);
    ctx.lineTo(26, 3);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Guard
    ctx.fillStyle = coatCol;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawAttackEffects(
  ctx: CanvasRenderingContext2D,
  f: FighterRuntime,
  time: number
): void {
  const atk = f.attack;
  if (!atk) return;
  const active = isAttackActive(atk);
  const windupRatio = Math.min(1, atk.elapsed / Math.max(0.01, atk.spec.windup));

  ctx.save();
  if (!active && atk.elapsed < atk.spec.windup) {
    // Windup charge telegraph
    ctx.fillStyle = f.spec.accentColor;
    ctx.globalAlpha = 0.65 * windupRatio;
    ctx.beginPath();
    ctx.arc(8, -f.spec.height * 0.55, 10 + windupRatio * 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (!active) {
    ctx.restore();
    return;
  }

  const cx = atk.spec.offsetX;
  const cy = atk.spec.offsetY;

  if (f.spec.id === 'blaze') {
    if (atk.kind === 'upSpecial') {
      // Rising Phoenix Flame Wings
      ctx.fillStyle = '#FB923C';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -68);
      ctx.lineTo(36, -34);
      ctx.lineTo(12, -16);
      ctx.lineTo(0, -28);
      ctx.lineTo(-28, -18);
      ctx.lineTo(-32, -40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (atk.kind === 'downSpecial') {
      // Solar Nova Flame Pillar Ring
      ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, cy, atk.spec.rangeX * 0.5, atk.spec.rangeY * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Flame Comet / Kick Arc
      ctx.fillStyle = '#FB923C';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(cx, cy, atk.spec.rangeX * 0.52, atk.spec.rangeY * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy, atk.spec.rangeX * 0.28, atk.spec.rangeY * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.spec.id === 'gale') {
    if (atk.kind === 'downSpecial') {
      // Gale Reflector Expanding Vortex
      ctx.strokeStyle = '#67E8F9';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(103, 232, 249, 0.24)';
      ctx.beginPath();
      ctx.arc(0, -34, atk.spec.rangeX * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -34, atk.spec.rangeX * 0.32, time * 12, time * 12 + Math.PI * 1.3);
      ctx.stroke();
    } else if (atk.kind === 'upSpecial') {
      // Updraft Cyclone Whirlwind Cone
      ctx.strokeStyle = '#67E8F9';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(8, -14 - i * 20, 28 - i * 4, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Razor Crescent Blade Slash
      ctx.strokeStyle = '#67E8F9';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(cx - 10, cy, atk.spec.rangeX * 0.58, atk.spec.rangeY * 0.46, 0, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy, atk.spec.rangeX * 0.54, atk.spec.rangeY * 0.42, 0, -0.95, 0.95);
      ctx.stroke();
    }
  } else if (f.spec.id === 'titan') {
    // Titan Earth / Stone Attack VFX
    if (atk.kind === 'downSpecial') {
      // Quake Slam Jagged Stone Spikes erupting left and right
      ctx.fillStyle = '#94A3B8';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      for (const dir of [-1, 1]) {
        for (let i = 1; i <= 3; i++) {
          const sx = dir * (22 * i);
          const sh = 46 - i * 8;
          ctx.beginPath();
          ctx.moveTo(sx - 11, 0);
          ctx.lineTo(sx, -sh);
          ctx.lineTo(sx + 11, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (atk.kind === 'sideSpecial') {
      // Tectonic Ram Super-Armor Golden Aura Shield
      ctx.fillStyle = 'rgba(254, 240, 138, 0.42)';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, -70);
      ctx.lineTo(42, -38);
      ctx.lineTo(10, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Giant Stone Gauntlet Smash Impact
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - atk.spec.rangeX * 0.45, cy - atk.spec.rangeY * 0.4, atk.spec.rangeX * 0.9, atk.spec.rangeY * 0.8, 8);
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.spec.id === 'volt') {
    // Volt Lightning / Thunder Attack VFX
    if (atk.kind === 'downSpecial') {
      // Static Discharge 360-Degree Electric Dome
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3.5;
      ctx.fillStyle = 'rgba(139, 92, 246, 0.28)';
      ctx.beginPath();
      ctx.arc(0, -34, atk.spec.rangeX * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Jagged radiating lightning spokes
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3 + Math.sin(time * 24 + i) * 0.25;
        const r1 = atk.spec.rangeX * 0.18;
        const r2 = atk.spec.rangeX * 0.35;
        const r3 = atk.spec.rangeX * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r1, -34 + Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang + 0.15) * r2, -34 + Math.sin(ang + 0.15) * r2);
        ctx.lineTo(Math.cos(ang) * r3, -34 + Math.sin(ang) * r3);
        ctx.stroke();
      }
    } else if (atk.kind === 'upSpecial') {
      // Storm Bolt Zigzag Thunder Ascent
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, -30);
      ctx.lineTo(-10, -55);
      ctx.lineTo(16, -85);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, -30);
      ctx.lineTo(-10, -55);
      ctx.lineTo(16, -85);
      ctx.stroke();
    } else if (atk.kind === 'sideSpecial') {
      // Flash Warp Lightning Streak
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.beginPath();
      ctx.moveTo(-35, -34);
      ctx.lineTo(cx, cy - 14);
      ctx.lineTo(cx + 25, cy);
      ctx.lineTo(cx, cy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Spark Palm / Volt Kick Lightning Slash Arc
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy, atk.spec.rangeX * 0.52, atk.spec.rangeY * 0.44, 0, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx - 4, cy, atk.spec.rangeX * 0.48, atk.spec.rangeY * 0.4, 0, -1.0, 1.0);
      ctx.stroke();
    }
  } else {
    // Frost Glacial Ice Attack VFX
    if (atk.kind === 'downSpecial') {
      // Blizzard Barrier Rotating Crystal Nova
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.28)';
      ctx.beginPath();
      ctx.arc(0, -34, atk.spec.rangeX * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Orbiting sharp crystal diamond shards
      ctx.fillStyle = '#E0F2FE';
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        const ang = time * 7 + (i * Math.PI * 2) / 5;
        const dist = atk.spec.rangeX * 0.4;
        const px = Math.cos(ang) * dist;
        const py = -34 + Math.sin(ang) * dist;
        ctx.beginPath();
        ctx.moveTo(px, py - 9);
        ctx.lineTo(px + 6, py);
        ctx.lineTo(px, py + 9);
        ctx.lineTo(px - 6, py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (atk.kind === 'upSpecial') {
      // Permafrost Spire Erupting Glacial Column
      ctx.fillStyle = '#06B6D4';
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-12, -50);
      ctx.lineTo(0, -90); // spire tip
      ctx.lineTo(12, -50);
      ctx.lineTo(16, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Inner glistening diamond core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-4, -20);
      ctx.lineTo(0, -82);
      ctx.lineTo(4, -20);
      ctx.closePath();
      ctx.fill();
    } else if (atk.kind === 'sideSpecial') {
      // Glacial Slide Ground Ice Sheet
      ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(cx + 20, 0);
      ctx.lineTo(cx + 10, -18);
      ctx.lineTo(cx - 15, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Chill Thrust / Glacial Slash Crystalline Arc
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy, atk.spec.rangeX * 0.54, atk.spec.rangeY * 0.44, 0, -1.15, 1.15);
      ctx.stroke();
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy, atk.spec.rangeX * 0.5, atk.spec.rangeY * 0.4, 0, -0.95, 0.95);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: ProjectileRuntime, time: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  const power = p.powerScale ?? 1;
  ctx.globalAlpha = 0.48 + 0.52 * Math.max(0, Math.min(1, power));

  if (p.visual === 'fireball') {
    const dir = p.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(p.radius, 0);
    ctx.quadraticCurveTo(0, -p.radius * 1.1, -p.radius * 1.9, -3);
    ctx.lineTo(-p.radius * 1.3, 0);
    ctx.lineTo(-p.radius * 1.9, 5);
    ctx.quadraticCurveTo(0, p.radius * 1.1, p.radius, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(2, 0, p.radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.visual === 'windblade') {
    ctx.rotate(time * 16 * (p.vx >= 0 ? 1 : -1));
    ctx.strokeStyle = '#67E8F9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, -1.3, 1.3);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.72, 1.8, 4.4);
    ctx.stroke();
  } else if (p.visual === 'boulder') {
    // Jagged spinning boulder
    ctx.rotate(time * 8 * (p.vx >= 0 ? 1 : -1));
    ctx.fillStyle = '#78350F';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const sides = 7;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const r = p.radius * (i % 2 === 0 ? 1.05 : 0.85);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(-3, -3, p.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.visual === 'thunderorb') {
    // Crackling plasma sphere with rotating jagged electric lightning arcs
    ctx.rotate(time * 14 * (p.vx >= 0 ? 1 : -1));
    // Outer electric corona
    ctx.fillStyle = 'rgba(139, 92, 246, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.35, 0, Math.PI * 2);
    ctx.fill();
    // Inner vibrant lightning core
    ctx.fillStyle = '#8B5CF6';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Crackling zigzag lightning forks
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.sin(time * 20 + i) * 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (p.radius * 0.4), Math.sin(ang) * (p.radius * 0.4));
      ctx.lineTo(Math.cos(ang + 0.3) * (p.radius * 0.9), Math.sin(ang + 0.3) * (p.radius * 0.9));
      ctx.lineTo(Math.cos(ang) * (p.radius * 1.4), Math.sin(ang) * (p.radius * 1.4));
      ctx.stroke();
    }
  } else {
    // 'iceshard' (Frost) - sharp faceted diamond ice crystal
    const dir = p.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);
    ctx.rotate((p.vy / (Math.abs(p.vx) + 1)) * 0.5);
    // Outer faceted crystalline ice shard
    ctx.fillStyle = '#06B6D4';
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(p.radius * 1.8, 0); // sharp tip
    ctx.lineTo(0, -p.radius * 0.7);
    ctx.lineTo(-p.radius * 1.4, -p.radius * 0.4);
    ctx.lineTo(-p.radius * 1.1, 0);
    ctx.lineTo(-p.radius * 1.4, p.radius * 0.4);
    ctx.lineTo(0, p.radius * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner glistening facet
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(p.radius * 1.3, 0);
    ctx.lineTo(0, -p.radius * 0.3);
    ctx.lineTo(-p.radius * 0.7, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool): void {
  for (let i = 0; i < pool.items.length; i++) {
    const p = pool.items[i];
    if (!p.active) continue;
    const t = p.life / p.maxLife;
    const alpha = Math.max(0, (1 - t) * p.alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 3.5 * (1 - t));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'star') {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(t * 6);
      const outer = p.size * 0.85;
      const inner = p.size * 0.28;
      ctx.beginPath();
      for (let s = 0; s < 8; s++) {
        const r = s % 2 === 0 ? outer : inner;
        const a = (s * Math.PI) / 4;
        if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(t * 11 + p.vx * 0.01);
      const spinScale = Math.cos(t * 14 + p.vy * 0.02);
      ctx.scale(1, Math.max(0.28, Math.abs(spinScale)));
      ctx.fillRect(-p.size * 0.65, -p.size * 0.28, p.size * 1.3, p.size * 0.56);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawOffstageIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fighter: FighterRuntime,
  state: RenderState
): void {
  const sx = (fighter.x - state.camX) * state.camZoom + width * 0.5;
  const sy = (fighter.y - fighter.spec.height * 0.5 - state.camY) * state.camZoom + height * 0.52;

  const margin = 42;
  if (sx >= margin && sx <= width - margin && sy >= margin && sy <= height - margin) {
    return;
  }

  const bx = Math.max(margin, Math.min(width - margin, sx));
  const by = Math.max(margin, Math.min(height - margin, sy));
  const ang = Math.atan2(sy - by, sx - bx);

  ctx.save();
  ctx.translate(bx, by);

  ctx.save();
  ctx.rotate(ang);
  ctx.fillStyle = fighter.slot === 0 ? '#EF4444' : '#3B82F6';
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(18, -8);
  ctx.lineTo(18, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = fighter.slot === 0 ? '#EF4444' : '#3B82F6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = '800 13px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(fighter.slot === 0 ? 'P1' : fighter.isCpu ? 'CPU' : 'P2', 0, 1);
  ctx.restore();
}
