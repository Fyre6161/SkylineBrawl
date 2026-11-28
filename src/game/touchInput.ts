import { createEmptyInput } from './gamepad';
import { FighterInputState } from './types';

export interface TouchStickResult {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  clampedX: number;
  clampedY: number;
}

export function computeTouchStickDirections(
  dx: number,
  dy: number,
  maxRadius = 42,
  deadzoneX = 14,
  deadzoneY = 20
): TouchStickResult {
  const dist = Math.hypot(dx, dy);
  const scale = dist > maxRadius && dist > 0 ? maxRadius / dist : 1;
  return {
    left: dx < -deadzoneX,
    right: dx > deadzoneX,
    up: dy < -deadzoneY,
    down: dy > deadzoneY,
    clampedX: dx * scale,
    clampedY: dy * scale,
  };
}

export type TouchActionButton = 'jump' | 'attack' | 'special' | 'shield';

export class TouchInputBuffer {
  public left = false;
  public right = false;
  public up = false;
  public down = false;
  public jumpHeld = false;
  public shieldHeld = false;

  private jumpQueued = false;
  private attackQueued = false;
  private specialQueued = false;
  private dodgeQueued = false;

  public setStick(left: boolean, right: boolean, up: boolean, down: boolean): void {
    this.left = left;
    this.right = right;
    this.up = up;
    this.down = down;
  }

  public pressAction(action: TouchActionButton): void {
    switch (action) {
      case 'jump':
        if (!this.jumpHeld) this.jumpQueued = true;
        this.jumpHeld = true;
        break;
      case 'attack':
        this.attackQueued = true;
        break;
      case 'special':
        this.specialQueued = true;
        break;
      case 'shield':
        if (!this.shieldHeld) this.dodgeQueued = true;
        this.shieldHeld = true;
        break;
    }
  }

  public releaseAction(action: TouchActionButton): void {
    if (action === 'jump') {
      this.jumpHeld = false;
    } else if (action === 'shield') {
      this.shieldHeld = false;
    }
  }

  public clear(): void {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.jumpHeld = false;
    this.shieldHeld = false;
    this.jumpQueued = false;
    this.attackQueued = false;
    this.specialQueued = false;
    this.dodgeQueued = false;
  }

  public consumeFrameInput(): FighterInputState {
    const out: FighterInputState = {
      ...createEmptyInput(),
      left: this.left,
      right: this.right,
      up: this.up,
      down: this.down,
      jumpJustPressed: this.jumpQueued,
      jumpHeld: this.jumpHeld,
      attackJustPressed: this.attackQueued,
      specialJustPressed: this.specialQueued,
      shieldHeld: this.shieldHeld,
      dodgeJustPressed: this.dodgeQueued,
    };
    this.jumpQueued = false;
    this.attackQueued = false;
    this.specialQueued = false;
    this.dodgeQueued = false;
    return out;
  }
}

export type TouchControlMode = 'auto' | 'on' | 'off';
export const TOUCH_MODE_STORAGE_KEY = 'skyline_brawl_touch_mode_v1';

export interface TouchLayoutConfig {
  scale: number; // 0.75 to 1.35
  opacity: number; // 0.4 to 1.0
  stickSide: 'left' | 'right';
  layoutPreset: 'standard' | 'lefty' | 'compact';
  stickOffset: { x: number; y: number };
  jumpOffset: { x: number; y: number };
  attackOffset: { x: number; y: number };
  specialOffset: { x: number; y: number };
  shieldOffset: { x: number; y: number };
}

export const DEFAULT_TOUCH_LAYOUT: TouchLayoutConfig = {
  scale: 1.0,
  opacity: 0.85,
  stickSide: 'left',
  layoutPreset: 'standard',
  stickOffset: { x: 0, y: 0 },
  jumpOffset: { x: -8, y: -25 },
  attackOffset: { x: -115, y: 55 },
  specialOffset: { x: 20, y: 35 },
  shieldOffset: { x: -95, y: -18 },
};

export const TOUCH_LAYOUT_STORAGE_KEY = 'skyline_brawl_touch_layout_v1';

export function loadTouchLayout(): TouchLayoutConfig {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_TOUCH_LAYOUT };
  try {
    const raw = window.localStorage.getItem(TOUCH_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        scale: typeof parsed.scale === 'number' ? Math.min(1.35, Math.max(0.75, parsed.scale)) : DEFAULT_TOUCH_LAYOUT.scale,
        opacity: typeof parsed.opacity === 'number' ? Math.min(1.0, Math.max(0.4, parsed.opacity)) : DEFAULT_TOUCH_LAYOUT.opacity,
        stickSide: parsed.stickSide === 'right' ? 'right' : 'left',
        layoutPreset: ['standard', 'lefty', 'compact'].includes(parsed.layoutPreset) ? parsed.layoutPreset : DEFAULT_TOUCH_LAYOUT.layoutPreset,
        stickOffset: {
          x: typeof parsed.stickOffset?.x === 'number' ? parsed.stickOffset.x : 0,
          y: typeof parsed.stickOffset?.y === 'number' ? parsed.stickOffset.y : 0,
        },
        jumpOffset: {
          x: typeof parsed.jumpOffset?.x === 'number' ? parsed.jumpOffset.x : DEFAULT_TOUCH_LAYOUT.jumpOffset.x,
          y: typeof parsed.jumpOffset?.y === 'number' ? parsed.jumpOffset.y : DEFAULT_TOUCH_LAYOUT.jumpOffset.y,
        },
        attackOffset: {
          x: typeof parsed.attackOffset?.x === 'number' ? parsed.attackOffset.x : DEFAULT_TOUCH_LAYOUT.attackOffset.x,
          y: typeof parsed.attackOffset?.y === 'number' ? parsed.attackOffset.y : DEFAULT_TOUCH_LAYOUT.attackOffset.y,
        },
        specialOffset: {
          x: typeof parsed.specialOffset?.x === 'number' ? parsed.specialOffset.x : DEFAULT_TOUCH_LAYOUT.specialOffset.x,
          y: typeof parsed.specialOffset?.y === 'number' ? parsed.specialOffset.y : DEFAULT_TOUCH_LAYOUT.specialOffset.y,
        },
        shieldOffset: {
          x: typeof parsed.shieldOffset?.x === 'number' ? parsed.shieldOffset.x : DEFAULT_TOUCH_LAYOUT.shieldOffset.x,
          y: typeof parsed.shieldOffset?.y === 'number' ? parsed.shieldOffset.y : DEFAULT_TOUCH_LAYOUT.shieldOffset.y,
        },
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { ...DEFAULT_TOUCH_LAYOUT };
}

export function saveTouchLayout(layout: TouchLayoutConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(TOUCH_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage errors
  }
}

export function loadTouchControlMode(): TouchControlMode {
  if (typeof window === 'undefined' || !window.localStorage) return 'auto';
  try {
    const val = window.localStorage.getItem(TOUCH_MODE_STORAGE_KEY);
    if (val === 'auto' || val === 'on' || val === 'off') return val;
  } catch {
    // Ignore restricted storage
  }
  return 'auto';
}

export function saveTouchControlMode(mode: TouchControlMode): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(TOUCH_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore restricted storage
  }
}

export function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(pointer: coarse)').matches) return true;
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
    if ('ontouchstart' in window) return true;
  } catch {
    // Ignore
  }
  return false;
}


