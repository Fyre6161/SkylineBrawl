export type ParticleKind = 'spark' | 'dust' | 'smoke' | 'ring' | 'star';

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

const POOL_SIZE = 280;

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
      } else if (p.kind === 'smoke') {
        p.vy -= 22 * dt;
      }
      p.size = Math.max(0.5, p.size + p.grow * dt);
    }
  }
}
