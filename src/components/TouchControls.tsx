import { useEffect, useRef, useState } from 'react';
import {
  computeTouchStickDirections,
  TouchActionButton,
  TouchInputBuffer,
  TouchLayoutConfig,
} from '../game/touchInput';

interface TouchControlsProps {
  touchInput: TouchInputBuffer;
  layout: TouchLayoutConfig;
  isEditing?: boolean;
  onUpdateLayout?: (next: TouchLayoutConfig) => void;
  onUnlockAudio?: () => void;
}

export function TouchControls({
  touchInput,
  layout,
  isEditing = false,
  onUpdateLayout,
  onUnlockAudio,
}: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickPointerIdRef = useRef<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragTargetRef = useRef<'stick' | 'jump' | 'attack' | 'special' | 'shield' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number }>({
    x: 0,
    y: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

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
    const res = computeTouchStickDirections(clientX - cx, clientY - cy, 40 * layout.scale, 13, 19);
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
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    onUnlockAudio?.();
    if (actionPointerMapRef.current[action] !== null) return;
    actionPointerMapRef.current[action] = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setHeldActions((prev) => ({ ...prev, [action]: true }));
    touchInput.pressAction(action);
  };

  const handleActionUp = (
    action: TouchActionButton,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (isEditing) return;
    e.preventDefault();
    if (actionPointerMapRef.current[action] !== e.pointerId) return;
    actionPointerMapRef.current[action] = null;
    setHeldActions((prev) => ({ ...prev, [action]: false }));
    touchInput.releaseAction(action);
  };

  const startDragging = (target: 'stick' | 'jump' | 'attack' | 'special' | 'shield', e: React.PointerEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    dragPointerIdRef.current = e.pointerId;
    dragTargetRef.current = target;
    const currentOffset =
      target === 'stick'
        ? layout.stickOffset
        : target === 'jump'
          ? layout.jumpOffset
          : target === 'attack'
            ? layout.attackOffset
            : target === 'special'
              ? layout.specialOffset
              : layout.shieldOffset;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: currentOffset.x,
      startOffsetY: currentOffset.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!isEditing || dragPointerIdRef.current !== e.pointerId || !dragTargetRef.current) return;
    e.preventDefault();
    const scale = layout.scale || 1.0;
    const dx = (e.clientX - dragStartRef.current.x) / scale;
    const dy = (e.clientY - dragStartRef.current.y) / scale;
    const target = dragTargetRef.current;
    // The stick uses translate3d (where +y is down), while buttons are positioned using CSS bottom (where +y is up).
    // Inverting dy for buttons ensures dragging down (positive dy) moves buttons down, and dragging up moves them up.
    const nextOffset = {
      x: dragStartRef.current.startOffsetX + dx,
      y:
        target === 'stick'
          ? dragStartRef.current.startOffsetY + dy
          : dragStartRef.current.startOffsetY - dy,
    };
    if (onUpdateLayout) {
      onUpdateLayout({
        ...layout,
        ...(target === 'stick' ? { stickOffset: nextOffset } : {}),
        ...(target === 'jump' ? { jumpOffset: nextOffset } : {}),
        ...(target === 'attack' ? { attackOffset: nextOffset } : {}),
        ...(target === 'special' ? { specialOffset: nextOffset } : {}),
        ...(target === 'shield' ? { shieldOffset: nextOffset } : {}),
      });
    }
  };

  const endDragging = (e: React.PointerEvent) => {
    if (dragPointerIdRef.current !== e.pointerId) return;
    dragPointerIdRef.current = null;
    dragTargetRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const isLefty = layout.stickSide === 'right';

  return (
    <div
      data-testid="touch-controls"
      className="fixed inset-0 z-25 pointer-events-none select-none overflow-hidden"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {isEditing && (
        <div className="absolute top-4 inset-x-4 z-30 pointer-events-auto bg-amber-500/95 text-slate-950 font-display font-extrabold text-sm sm:text-base py-2 px-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-center">
          <span>EDITING TOUCH HUD • Drag any individual button or joystick to reposition</span>
          {onUpdateLayout && (
            <button
              type="button"
              onClick={() =>
                onUpdateLayout({
                  ...layout,
                  stickOffset: { x: 0, y: 0 },
                  jumpOffset: { x: 0, y: 0 },
                  attackOffset: { x: 0, y: 0 },
                  specialOffset: { x: 0, y: 0 },
                  shieldOffset: { x: 0, y: 0 },
                })
              }
              className="px-3 py-1 rounded bg-slate-950 text-amber-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
            >
              Reset All
            </button>
          )}
        </div>
      )}

      {/* Thumbstick Container */}
      <div
        className="absolute pointer-events-auto touch-none"
        style={{
          left: isLefty ? undefined : '16px',
          right: isLefty ? '16px' : undefined,
          bottom: '16px',
          transform: `translate3d(${layout.stickOffset.x}px, ${layout.stickOffset.y}px, 0) scale(${layout.scale})`,
          transformOrigin: isLefty ? 'bottom right' : 'bottom left',
          opacity: layout.opacity,
        }}
      >
        <div
          ref={stickRef}
          role="application"
          aria-label="Movement thumbstick"
          onPointerDown={(e) => {
            if (isEditing) {
              startDragging('stick', e);
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            onUnlockAudio?.();
            if (stickPointerIdRef.current !== null) return;
            stickPointerIdRef.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore
            }
            updateStickFromClient(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (isEditing) {
              onDragMove(e);
              return;
            }
            if (stickPointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            updateStickFromClient(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (isEditing) {
              endDragging(e);
              return;
            }
            if (stickPointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            resetStick();
          }}
          onPointerCancel={(e) => {
            if (isEditing) {
              endDragging(e);
              return;
            }
            if (stickPointerIdRef.current !== e.pointerId) return;
            resetStick();
          }}
          className={`touch-none relative w-32 h-32 rounded-full bg-slate-950/70 border-2 border-slate-500/55 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center ${
            isEditing ? 'cursor-move ring-4 ring-amber-400 animate-pulse bg-slate-900/90' : ''
          }`}
        >
          {isEditing && (
            <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-xs text-amber-300 text-center px-1">
              DRAG STICK
            </span>
          )}
          {!isEditing && (
            <>
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

              <div
                aria-hidden="true"
                style={{ transform: `translate3d(${puckOffset.x}px, ${puckOffset.y}px, 0)` }}
                className="w-12 h-12 rounded-full bg-slate-100/85 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
              />
            </>
          )}
        </div>
      </div>

      {/* Individual Draggable Action Buttons */}
      <div
        className="absolute pointer-events-auto touch-none"
        style={{
          left: isLefty ? '240px' : undefined,
          right: isLefty ? undefined : '16px',
          bottom: '16px',
          opacity: layout.opacity,
          transform: `scale(${layout.scale})`,
          transformOrigin: isLefty ? 'bottom left' : 'bottom right',
        }}
      >
        {/* Shield Button */}
        <div
          style={{
            position: 'absolute',
            left: `${-90 + layout.shieldOffset.x}px`,
            bottom: `${76 + layout.shieldOffset.y}px`,
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Touch Shield"
            onPointerDown={(e) => {
              if (isEditing) {
                startDragging('shield', e);
                return;
              }
              handleActionDown('shield', e);
            }}
            onPointerMove={(e) => {
              if (isEditing) onDragMove(e);
            }}
            onPointerUp={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('shield', e);
            }}
            onPointerCancel={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('shield', e);
            }}
            className={`touch-none w-14 h-14 rounded-full border-2 font-display text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
              isEditing
                ? 'cursor-move ring-4 ring-amber-400 bg-slate-800 border-amber-300 text-amber-200'
                : heldActions.shield
                  ? 'bg-slate-600 border-white text-white scale-95'
                  : 'bg-slate-900/75 border-slate-400/70 text-slate-200'
            }`}
          >
            {isEditing ? 'SHD' : 'SHD'}
          </button>
        </div>

        {/* Jump Button */}
        <div
          style={{
            position: 'absolute',
            left: `${-8 + layout.jumpOffset.x}px`,
            bottom: `${88 + layout.jumpOffset.y}px`,
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Touch Jump"
            onPointerDown={(e) => {
              if (isEditing) {
                startDragging('jump', e);
                return;
              }
              handleActionDown('jump', e);
            }}
            onPointerMove={(e) => {
              if (isEditing) onDragMove(e);
            }}
            onPointerUp={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('jump', e);
            }}
            onPointerCancel={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('jump', e);
            }}
            className={`touch-none w-16 h-16 rounded-full border-2 font-display text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
              isEditing
                ? 'cursor-move ring-4 ring-amber-400 bg-emerald-900 border-amber-300 text-amber-200'
                : heldActions.jump
                  ? 'bg-emerald-400 border-white text-slate-950 scale-95'
                  : 'bg-emerald-600/80 border-emerald-300/80 text-white'
            }`}
          >
            {isEditing ? 'JMP' : 'JMP'}
          </button>
        </div>

        {/* Attack Button */}
        <div
          style={{
            position: 'absolute',
            left: `${-94 + layout.attackOffset.x}px`,
            bottom: `${6 + layout.attackOffset.y}px`,
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Touch Attack"
            onPointerDown={(e) => {
              if (isEditing) {
                startDragging('attack', e);
                return;
              }
              handleActionDown('attack', e);
            }}
            onPointerMove={(e) => {
              if (isEditing) onDragMove(e);
            }}
            onPointerUp={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('attack', e);
            }}
            onPointerCancel={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('attack', e);
            }}
            className={`touch-none w-16 h-16 rounded-full border-2 font-display text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
              isEditing
                ? 'cursor-move ring-4 ring-amber-400 bg-red-950 border-amber-300 text-amber-200'
                : heldActions.attack
                  ? 'bg-amber-400 border-white text-slate-950 scale-95'
                  : 'bg-red-600/85 border-red-300/85 text-white'
            }`}
          >
            {isEditing ? 'ATK' : 'ATK'}
          </button>
        </div>

        {/* Special Button */}
        <div
          style={{
            position: 'absolute',
            left: `${-10 + layout.specialOffset.x}px`,
            bottom: `${6 + layout.specialOffset.y}px`,
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Touch Special"
            onPointerDown={(e) => {
              if (isEditing) {
                startDragging('special', e);
                return;
              }
              handleActionDown('special', e);
            }}
            onPointerMove={(e) => {
              if (isEditing) onDragMove(e);
            }}
            onPointerUp={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('special', e);
            }}
            onPointerCancel={(e) => {
              if (isEditing) {
                endDragging(e);
                return;
              }
              handleActionUp('special', e);
            }}
            className={`touch-none w-15 h-15 rounded-full border-2 font-display text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center transition-transform ${
              isEditing
                ? 'cursor-move ring-4 ring-amber-400 bg-blue-950 border-amber-300 text-amber-200'
                : heldActions.special
                  ? 'bg-cyan-300 border-white text-slate-950 scale-95'
                  : 'bg-blue-600/85 border-cyan-300/80 text-white'
            }`}
          >
            {isEditing ? 'SPC' : 'SPC'}
          </button>
        </div>
      </div>
    </div>
  );
}
