import { useEffect, useRef, useState } from 'react';
import { computeTouchStickDirections, TouchActionButton, TouchInputBuffer } from '../game/touchInput';

interface TouchControlsProps {
  touchInput: TouchInputBuffer;
  onUnlockAudio?: () => void;
}

export function TouchControls({ touchInput, onUnlockAudio }: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickPointerIdRef = useRef<number | null>(null);
  const [puckOffset, setPuckOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stickDirs, setStickDirs] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });
  const [heldActions, setHeldActions] = useState<Record<TouchActionButton, boolean>>({
    jump: false,
    attack: false,
    special: false,
    shield: false,
  });
  const actionPointerMapRef = useRef<Record<TouchActionButton, number | null>>({
    jump: null,
    attack: null,
    special: null,
    shield: null,
  });

  useEffect(() => {
    return () => {
      touchInput.clear();
    };
  }, [touchInput]);

  const updateStickFromClient = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const res = computeTouchStickDirections(clientX - cx, clientY - cy, 40, 13, 19);
    setPuckOffset({ x: res.clampedX, y: res.clampedY });
    setStickDirs({ left: res.left, right: res.right, up: res.up, down: res.down });
    touchInput.setStick(res.left, res.right, res.up, res.down);
  };

  const resetStick = () => {
    stickPointerIdRef.current = null;
    setPuckOffset({ x: 0, y: 0 });
    setStickDirs({ left: false, right: false, up: false, down: false });
    touchInput.setStick(false, false, false, false);
  };

  const handleActionDown = (
    action: TouchActionButton,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onUnlockAudio?.();
    if (actionPointerMapRef.current[action] !== null) return;
    actionPointerMapRef.current[action] = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer events without active capture target
    }
    setHeldActions((prev) => ({ ...prev, [action]: true }));
    touchInput.pressAction(action);
  };

  const handleActionUp = (
    action: TouchActionButton,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    if (actionPointerMapRef.current[action] !== e.pointerId) return;
    actionPointerMapRef.current[action] = null;
    setHeldActions((prev) => ({ ...prev, [action]: false }));
    touchInput.releaseAction(action);
  };

  return (
    <div
      data-testid="touch-controls"
      className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex items-end justify-between px-4 pb-4 sm:px-7 sm:pb-6 select-none"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {/* Left Thumbstick */}
      <div
        ref={stickRef}
        role="application"
        aria-label="Movement thumbstick"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnlockAudio?.();
          if (stickPointerIdRef.current !== null) return;
          stickPointerIdRef.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore synthetic pointers
          }
          updateStickFromClient(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickPointerIdRef.current !== e.pointerId) return;
          e.preventDefault();
          updateStickFromClient(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickPointerIdRef.current !== e.pointerId) return;
          e.preventDefault();
          resetStick();
        }}
        onPointerCancel={(e) => {
          if (stickPointerIdRef.current !== e.pointerId) return;
          resetStick();
        }}
        className="pointer-events-auto touch-none relative w-32 h-32 rounded-full bg-slate-950/60 border-2 border-slate-500/55 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center"
      >
        <span
          aria-hidden="true"
          className={`absolute top-2 text-[10px] font-bold ${
            stickDirs.up ? 'text-amber-300' : 'text-slate-400/70'
          }`}
        >
          ▲
        </span>
        <span
          aria-hidden="true"
          className={`absolute bottom-2 text-[10px] font-bold ${
            stickDirs.down ? 'text-amber-300' : 'text-slate-400/70'
          }`}
        >
          ▼
        </span>
        <span
          aria-hidden="true"
          className={`absolute left-2.5 text-[10px] font-bold ${
            stickDirs.left ? 'text-amber-300' : 'text-slate-400/70'
          }`}
        >
          ◀
        </span>
        <span
          aria-hidden="true"
          className={`absolute right-2.5 text-[10px] font-bold ${
            stickDirs.right ? 'text-amber-300' : 'text-slate-400/70'
          }`}
        >
          ▶
        </span>

        {/* Thumbstick Puck */}
        <div
          aria-hidden="true"
          style={{ transform: `translate3d(${puckOffset.x}px, ${puckOffset.y}px, 0)` }}
          className="w-12 h-12 rounded-full bg-slate-100/85 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
        />
      </div>

      {/* Right Action Cluster */}
      <div className="pointer-events-auto touch-none relative w-44 h-36">
        {/* Shield / Dodge (top-left of cluster) */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Touch Shield"
          onPointerDown={(e) => handleActionDown('shield', e)}
          onPointerUp={(e) => handleActionUp('shield', e)}
          onPointerCancel={(e) => handleActionUp('shield', e)}
          className={`touch-none absolute left-1 top-1 w-14 h-14 rounded-full border-2 font-display text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
            heldActions.shield
              ? 'bg-slate-600 border-white text-white scale-95'
              : 'bg-slate-900/75 border-slate-400/70 text-slate-200'
          }`}
        >
          SHD
        </button>

        {/* Jump (top-right of cluster) */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Touch Jump"
          onPointerDown={(e) => handleActionDown('jump', e)}
          onPointerUp={(e) => handleActionUp('jump', e)}
          onPointerCancel={(e) => handleActionUp('jump', e)}
          className={`touch-none absolute right-0 top-0 w-16 h-16 rounded-full border-2 font-display text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
            heldActions.jump
              ? 'bg-emerald-400 border-white text-slate-950 scale-95'
              : 'bg-emerald-600/80 border-emerald-300/80 text-white'
          }`}
        >
          JMP
        </button>

        {/* Normal Attack (bottom-left of cluster) */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Touch Attack"
          onPointerDown={(e) => handleActionDown('attack', e)}
          onPointerUp={(e) => handleActionUp('attack', e)}
          onPointerCancel={(e) => handleActionUp('attack', e)}
          className={`touch-none absolute left-0 bottom-0 w-16 h-16 rounded-full border-2 font-display text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
            heldActions.attack
              ? 'bg-amber-400 border-white text-slate-950 scale-95'
              : 'bg-red-600/85 border-red-300/85 text-white'
          }`}
        >
          ATK
        </button>

        {/* Special Attack (bottom-right of cluster) */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Touch Special"
          onPointerDown={(e) => handleActionDown('special', e)}
          onPointerUp={(e) => handleActionUp('special', e)}
          onPointerCancel={(e) => handleActionUp('special', e)}
          className={`touch-none absolute right-2 bottom-2 w-15 h-15 rounded-full border-2 font-display text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
            heldActions.special
              ? 'bg-cyan-300 border-white text-slate-950 scale-95'
              : 'bg-blue-600/85 border-cyan-300/80 text-white'
          }`}
        >
          SPC
        </button>
      </div>
    </div>
  );
}
