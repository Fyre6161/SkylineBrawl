import { FighterInputState, GameMode } from './types';

export type HotkeyAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'special'
  | 'shield';

export interface KeyBindingMap {
  left: string;
  right: string;
  up: string;
  down: string;
  jump: string;
  attack: string;
  special: string;
  shield: string;
}

export interface HotkeySettings {
  singlePrimary: KeyBindingMap;
  singleSecondary: Partial<KeyBindingMap>;
  singleTapJump: boolean;
  localP1: KeyBindingMap;
  localP1TapJump: boolean;
  localP2: KeyBindingMap;
  localP2TapJump: boolean;
}

export const HOTKEY_ACTION_LABELS: { action: HotkeyAction; label: string }[] = [
  { action: 'left', label: 'Move Left' },
  { action: 'right', label: 'Move Right' },
  { action: 'up', label: 'Aim Up' },
  { action: 'down', label: 'Crouch / Drop' },
  { action: 'jump', label: 'Jump' },
  { action: 'attack', label: 'Normal Attack' },
  { action: 'special', label: 'Special' },
  { action: 'shield', label: 'Shield / Dodge' },
];

export const HOTKEY_STORAGE_KEY = 'skyline_brawl_hotkeys_v1';

const ALL_ACTIONS: HotkeyAction[] = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'attack',
  'special',
  'shield',
];

export function createDefaultHotkeys(): HotkeySettings {
  return {
    singlePrimary: {
      left: 'KeyA',
      right: 'KeyD',
      up: 'KeyW',
      down: 'KeyS',
      jump: 'Space',
      attack: 'KeyJ',
      special: 'KeyK',
      shield: 'KeyL',
    },
    singleSecondary: {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      attack: 'KeyZ',
      special: 'KeyX',
      shield: 'KeyC',
    },
    singleTapJump: true,
    localP1: {
      left: 'KeyA',
      right: 'KeyD',
      up: 'KeyW',
      down: 'KeyS',
      jump: 'Space',
      attack: 'KeyF',
      special: 'KeyG',
      shield: 'KeyH',
    },
    localP1TapJump: true,
    localP2: {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      jump: 'Slash',
      attack: 'KeyJ',
      special: 'KeyK',
      shield: 'KeyL',
    },
    localP2TapJump: true,
  };
}

export function cloneHotkeySettings(src: HotkeySettings): HotkeySettings {
  return {
    singlePrimary: { ...src.singlePrimary },
    singleSecondary: { ...src.singleSecondary },
    singleTapJump: src.singleTapJump,
    localP1: { ...src.localP1 },
    localP1TapJump: src.localP1TapJump,
    localP2: { ...src.localP2 },
    localP2TapJump: src.localP2TapJump,
  };
}

export function loadHotkeySettings(): HotkeySettings {
  const defaults = createDefaultHotkeys();
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(HOTKEY_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<HotkeySettings>;
    const pickMap = (candidate: unknown, fallback: KeyBindingMap): KeyBindingMap => {
      const obj = (candidate && typeof candidate === 'object' ? candidate : {}) as Record<
        string,
        unknown
      >;
      return {
        left: typeof obj.left === 'string' && obj.left ? obj.left : fallback.left,
        right: typeof obj.right === 'string' && obj.right ? obj.right : fallback.right,
        up: typeof obj.up === 'string' && obj.up ? obj.up : fallback.up,
        down: typeof obj.down === 'string' && obj.down ? obj.down : fallback.down,
        jump: typeof obj.jump === 'string' && obj.jump ? obj.jump : fallback.jump,
        attack: typeof obj.attack === 'string' && obj.attack ? obj.attack : fallback.attack,
        special: typeof obj.special === 'string' && obj.special ? obj.special : fallback.special,
        shield: typeof obj.shield === 'string' && obj.shield ? obj.shield : fallback.shield,
      };
    };

    const pickSecondary = (
      candidate: unknown,
      fallback: Partial<KeyBindingMap>
    ): Partial<KeyBindingMap> => {
      if (!candidate || typeof candidate !== 'object') return { ...fallback };
      const obj = candidate as Record<string, unknown>;
      const out: Partial<KeyBindingMap> = {};
      for (const act of ALL_ACTIONS) {
        if (act in obj) {
          if (typeof obj[act] === 'string' && obj[act]) {
            out[act] = obj[act] as string;
          }
        } else if (fallback[act]) {
          out[act] = fallback[act];
        }
      }
      return out;
    };

    return {
      singlePrimary: pickMap(parsed.singlePrimary, defaults.singlePrimary),
      singleSecondary: pickSecondary(parsed.singleSecondary, defaults.singleSecondary),
      singleTapJump:
        typeof parsed.singleTapJump === 'boolean'
          ? parsed.singleTapJump
          : defaults.singleTapJump,
      localP1: pickMap(parsed.localP1, defaults.localP1),
      localP1TapJump:
        typeof parsed.localP1TapJump === 'boolean'
          ? parsed.localP1TapJump
          : defaults.localP1TapJump,
      localP2: pickMap(parsed.localP2, defaults.localP2),
      localP2TapJump:
        typeof parsed.localP2TapJump === 'boolean'
          ? parsed.localP2TapJump
          : defaults.localP2TapJump,
    };
  } catch {
    return defaults;
  }
}

export function saveHotkeySettings(settings: HotkeySettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota / private mode restrictions
  }
}

export type RebindTarget =
  | { scope: 'singlePrimary'; action: HotkeyAction }
  | { scope: 'singleSecondary'; action: HotkeyAction }
  | { scope: 'localP1'; action: HotkeyAction }
  | { scope: 'localP2'; action: HotkeyAction };

export function rebindHotkey(
  settings: HotkeySettings,
  target: RebindTarget,
  newCode: string | null
): HotkeySettings {
  if (newCode === 'Escape') return settings;

  const next = cloneHotkeySettings(settings);

  if (target.scope === 'singleSecondary') {
    if (!newCode) {
      delete next.singleSecondary[target.action];
      return next;
    }
    if (next.singlePrimary[target.action] === newCode) {
      return next;
    }
    const prev = next.singleSecondary[target.action];
    for (const act of ALL_ACTIONS) {
      if (act !== target.action && next.singleSecondary[act] === newCode) {
        if (prev) next.singleSecondary[act] = prev;
        else delete next.singleSecondary[act];
      }
      if (next.singlePrimary[act] === newCode) {
        if (prev) {
          next.singlePrimary[act] = prev;
        } else {
          // Keep primary intact by swapping if primary exists
          delete next.singleSecondary[target.action];
          return next;
        }
      }
    }
    next.singleSecondary[target.action] = newCode;
    return next;
  }

  if (!newCode) return next;

  if (target.scope === 'singlePrimary') {
    const prev = next.singlePrimary[target.action];
    if (prev === newCode) return next;
    for (const act of ALL_ACTIONS) {
      if (act !== target.action && next.singlePrimary[act] === newCode) {
        next.singlePrimary[act] = prev;
      }
      if (next.singleSecondary[act] === newCode) {
        next.singleSecondary[act] = prev;
      }
    }
    next.singlePrimary[target.action] = newCode;
    return next;
  }

  // Local 2P: keep both P1 and P2 keys unique by swapping on conflict
  const targetMap = target.scope === 'localP1' ? next.localP1 : next.localP2;
  const otherMap = target.scope === 'localP1' ? next.localP2 : next.localP1;
  const prev = targetMap[target.action];
  if (prev === newCode) return next;

  for (const act of ALL_ACTIONS) {
    if (act !== target.action && targetMap[act] === newCode) {
      targetMap[act] = prev;
    }
    if (otherMap[act] === newCode) {
      otherMap[act] = prev;
    }
  }
  targetMap[target.action] = newCode;
  return next;
}

export function isHotkeyBound(
  settings: HotkeySettings,
  mode: GameMode,
  code: string
): boolean {
  if (mode === 'local') {
    return ALL_ACTIONS.some(
      (a) => settings.localP1[a] === code || settings.localP2[a] === code
    );
  }
  return ALL_ACTIONS.some(
    (a) => settings.singlePrimary[a] === code || settings.singleSecondary[a] === code
  );
}

export function readInputFromBindings(
  keysHeld: ReadonlySet<string>,
  keysJustPressed: ReadonlySet<string>,
  primary: KeyBindingMap,
  secondary: Partial<KeyBindingMap> | undefined,
  tapJump: boolean
): FighterInputState {
  const codesFor = (action: HotkeyAction): string[] => {
    const alt = secondary?.[action];
    return alt ? [primary[action], alt] : [primary[action]];
  };

  const held = (codes: string[]) => codes.some((c) => keysHeld.has(c));
  const just = (codes: string[]) => codes.some((c) => keysJustPressed.has(c));

  const jumpCodes = tapJump ? [...codesFor('jump'), ...codesFor('up')] : codesFor('jump');
  const shieldCodes = codesFor('shield');

  return {
    left: held(codesFor('left')),
    right: held(codesFor('right')),
    up: held(codesFor('up')),
    down: held(codesFor('down')),
    jumpJustPressed: just(jumpCodes),
    jumpHeld: held(jumpCodes),
    attackJustPressed: just(codesFor('attack')),
    specialJustPressed: just(codesFor('special')),
    shieldHeld: held(shieldCodes),
    dodgeJustPressed: just(shieldCodes),
  };
}

const KEY_CODE_LABELS: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ShiftLeft: 'L-Shift',
  ShiftRight: 'R-Shift',
  ControlLeft: 'L-Ctrl',
  ControlRight: 'R-Ctrl',
  AltLeft: 'L-Alt',
  AltRight: 'R-Alt',
  Enter: 'Enter',
  NumpadEnter: 'NumEnter',
  Tab: 'Tab',
  Slash: '/',
  Period: '.',
  Comma: ',',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  Backspace: 'Backspace',
};

export function formatKeyCode(code?: string): string {
  if (!code) return '—';
  if (KEY_CODE_LABELS[code]) return KEY_CODE_LABELS[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

export function formatControlSummary(
  settings: HotkeySettings,
  mode: GameMode
): string {
  if (mode === 'local') {
    const p1 = settings.localP1;
    const p2 = settings.localP2;
    return `P1: ${formatKeyCode(p1.left)}/${formatKeyCode(p1.right)} ${formatKeyCode(p1.jump)} ${formatKeyCode(p1.attack)}/${formatKeyCode(p1.special)}/${formatKeyCode(p1.shield)} · P2: ${formatKeyCode(p2.left)}/${formatKeyCode(p2.right)} ${formatKeyCode(p2.jump)} ${formatKeyCode(p2.attack)}/${formatKeyCode(p2.special)}/${formatKeyCode(p2.shield)}`;
  }

  const s = settings.singlePrimary;
  return `Move ${formatKeyCode(s.left)}/${formatKeyCode(s.right)} · Jump ${formatKeyCode(s.jump)} · Attack ${formatKeyCode(s.attack)} · Special ${formatKeyCode(s.special)} · Shield ${formatKeyCode(s.shield)}`;
}
