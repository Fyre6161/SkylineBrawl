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

