export type ParticleKind = 'spark' | 'dust' | 'smoke' | 'ring' | 'star' | 'confetti';

export interface ParticleSlot {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  grow: number;
  life: number;
  maxLife: number;
  color: string;
  alpha: number;
}

const POOL_SIZE = 420;

export class ParticlePool {
  public readonly items: ParticleSlot[];
  private cursor = 0;

  constructor() {
    this.items = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      kind: 'spark',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      grow: 0,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      alpha: 1,
    }));
  }

  public clear(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.items[i].active = false;
    }
  }

  public spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    grow: number,
    maxLife: number,
    color: string,
    alpha = 1
  ): void {
    const slot = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    slot.active = true;
    slot.kind = kind;
    slot.x = x;
    slot.y = y;
    slot.vx = vx;
    slot.vy = vy;
    slot.size = size;
    slot.grow = grow;
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.color = color;
    slot.alpha = alpha;
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    speed: number,
    color: string,
    kind: ParticleKind = 'spark'
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = speed * (0.45 + Math.random() * 0.75);
      this.spawn(
        kind,
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        kind === 'star' ? 9 + Math.random() * 6 : 4 + Math.random() * 5,
        -4,
        0.24 + Math.random() * 0.24,
        color,
        1
      );
    }
  }

  public spawnRing(x: number, y: number, color: string, startSize = 10, grow = 220): void {
    this.spawn('ring', x, y, 0, 0, startSize, grow, 0.26, color, 0.9);
  }

  public spawnKoFireworks(
    x: number,
    y: number,
    inwardAngle: number,
    primaryColor: string,
    accentColor: string,
    isFinal = false
  ): void {
    const scale = isFinal ? 1.3 : 1;

    // Triple staggered shockwave rings
    this.spawn('ring', x, y, 0, 0, 14, 520 * scale, 0.34, '#FFFFFF', 0.95);
    this.spawn('ring', x, y, 0, 0, 20, 740 * scale, 0.48, accentColor, 0.9);
    this.spawn('ring', x, y, 0, 0, 26, 980 * scale, 0.62, primaryColor, 0.8);

    const palette = ['#FFFFFF', '#FEF08A', accentColor, primaryColor, '#FB7185', '#38BDF8'];

    // Directional starburst cannon shooting inward along blast beam
    const jetCount = isFinal ? 46 : 32;
    for (let i = 0; i < jetCount; i++) {
      const spread = (Math.random() - 0.5) * 0.78;
      const ang = inwardAngle + spread;
      const spd = (420 + Math.random() * 880) * scale;
      const isStar = i % 2 === 0;
      this.spawn(
        isStar ? 'star' : 'spark',
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        isStar ? 11 + Math.random() * 9 : 5 + Math.random() * 6,
        -5,
        0.48 + Math.random() * 0.42,
        palette[i % palette.length],
        1
      );
    }

    // Radial halo burst + celebratory confetti streamers
    const burstCount = isFinal ? 36 : 24;
    for (let i = 0; i < burstCount; i++) {
      const ang = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.25;
      const spd = (240 + Math.random() * 440) * scale;
      this.spawn(
        'star',
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        10 + Math.random() * 8,
        -4,
        0.45 + Math.random() * 0.38,
        palette[(i + 1) % palette.length],
        1
      );
    }

    const confettiCount = isFinal ? 44 : 28;
    for (let i = 0; i < confettiCount; i++) {
      const spread = (Math.random() - 0.5) * 1.45;
      const ang = inwardAngle + spread;
      const spd = (260 + Math.random() * 620) * scale;
      this.spawn(
        'confetti',
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 90,
        7 + Math.random() * 6,
        0,
        0.75 + Math.random() * 0.55,
        palette[(i + 2) % palette.length],
        0.95
      );
    }
  }

  public spawnDust(x: number, y: number, dir: number, count = 4): void {
    for (let i = 0; i < count; i++) {
      this.spawn(
        'dust',
        x + (Math.random() - 0.5) * 14,
        y - 3,
        dir * (40 + Math.random() * 75) + (Math.random() - 0.5) * 50,
        -18 - Math.random() * 45,
        6 + Math.random() * 6,
        14,
        0.26 + Math.random() * 0.14,
        '#CBD5E1',
        0.65
      );
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.items[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark' || p.kind === 'star') {
        p.vx *= Math.pow(0.18, dt);
        p.vy *= Math.pow(0.18, dt);
      } else if (p.kind === 'confetti') {
        p.vx *= Math.pow(0.32, dt);
        p.vy = p.vy * Math.pow(0.45, dt) + 280 * dt;
      } else if (p.kind === 'smoke') {
        p.vy -= 22 * dt;
      }
      p.size = Math.max(0.5, p.size + p.grow * dt);
    }
  }
}
