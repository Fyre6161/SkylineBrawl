import { FighterInputState } from './types';

export interface GamepadButtonSnapshot {
  pressed: boolean;
}

export interface GamepadStateSnapshot {
  axes: readonly number[];
  buttons: readonly GamepadButtonSnapshot[];
}

export interface GamepadEdgeState {
  jump: boolean;
  attack: boolean;
  special: boolean;
  dodge: boolean;
  pause: boolean;
}

export function createEmptyInput(): FighterInputState {
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

export function createEmptyGamepadEdgeState(): GamepadEdgeState {
  return {
    jump: false,
    attack: false,
    special: false,
    dodge: false,
    pause: false,
  };
}

export function mergeFighterInputs(
  a: FighterInputState,
  b: FighterInputState
): FighterInputState {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
    jumpJustPressed: a.jumpJustPressed || b.jumpJustPressed,
    jumpHeld: a.jumpHeld || b.jumpHeld,
    attackJustPressed: a.attackJustPressed || b.attackJustPressed,
    specialJustPressed: a.specialJustPressed || b.specialJustPressed,
    shieldHeld: a.shieldHeld || b.shieldHeld,
    dodgeJustPressed: a.dodgeJustPressed || b.dodgeJustPressed,
  };
}

const STICK_DEADZONE_X = 0.32;
const STICK_DEADZONE_Y = 0.42;

/**
 * Maps a standard W3C Gamepad snapshot to platform fighter controls:
 * - Left stick / D-Pad: Move & directional aim
 * - South (A/Cross, btn 0): Normal Attack
 * - East (B/Circle, btn 1): Special
 * - West/North/LB (X/Y/LB, btns 2,3,4): Jump
 * - RB/LT/RT (btns 5,6,7): Shield / Air Dodge
 * - Start/Menu (btn 9): Pause / Resume
 */
export function mapGamepadToInput(
  pad: GamepadStateSnapshot | null | undefined,
  prev: GamepadEdgeState,
  tapJump: boolean
): {
  input: FighterInputState;
  nextEdge: GamepadEdgeState;
  pauseJustPressed: boolean;
} {
  if (!pad) {
    return {
      input: createEmptyInput(),
      nextEdge: createEmptyGamepadEdgeState(),
      pauseJustPressed: false,
    };
  }

  const axX = pad.axes[0] ?? 0;
  const axY = pad.axes[1] ?? 0;

  const dpadUp = Boolean(pad.buttons[12]?.pressed);
  const dpadDown = Boolean(pad.buttons[13]?.pressed);
  const dpadLeft = Boolean(pad.buttons[14]?.pressed);
  const dpadRight = Boolean(pad.buttons[15]?.pressed);

  const left = dpadLeft || axX < -STICK_DEADZONE_X;
  const right = dpadRight || axX > STICK_DEADZONE_X;
  const up = dpadUp || axY < -STICK_DEADZONE_Y;
  const down = dpadDown || axY > STICK_DEADZONE_Y;

  const attackHeld = Boolean(pad.buttons[0]?.pressed);
  const specialHeld = Boolean(pad.buttons[1]?.pressed);
  const jumpButtonHeld = Boolean(
    pad.buttons[2]?.pressed || pad.buttons[3]?.pressed || pad.buttons[4]?.pressed
  );
  const jumpHeld = jumpButtonHeld || (tapJump && up);
  const shieldHeld = Boolean(
    pad.buttons[5]?.pressed || pad.buttons[6]?.pressed || pad.buttons[7]?.pressed
  );
  const pauseHeld = Boolean(pad.buttons[9]?.pressed);

  const nextEdge: GamepadEdgeState = {
    jump: jumpHeld,
    attack: attackHeld,
    special: specialHeld,
    dodge: shieldHeld,
    pause: pauseHeld,
  };

  return {
    input: {
      left,
      right,
      up,
      down,
      jumpJustPressed: jumpHeld && !prev.jump,
      jumpHeld,
      attackJustPressed: attackHeld && !prev.attack,
      specialJustPressed: specialHeld && !prev.special,
      shieldHeld,
      dodgeJustPressed: shieldHeld && !prev.dodge,
    },
    nextEdge,
    pauseJustPressed: pauseHeld && !prev.pause,
  };
}

export function getConnectedGamepads(): Gamepad[] {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return [];
  }
  try {
    const raw = navigator.getGamepads();
    const list: Gamepad[] = [];
    for (let i = 0; i < raw.length; i++) {
      const pad = raw[i];
      if (pad && pad.connected) {
        list.push(pad);
      }
    }
    return list;
  } catch {
    return [];
  }
}
