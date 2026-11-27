import { FighterHudSnapshot, MatchHudSnapshot } from '../game/types';
import { FighterEmblem } from './FighterEmblem';

interface GameHudProps {
  hud: MatchHudSnapshot;
  muted: boolean;
  isOnline?: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

function getDamageColor(damage: number): string {
  if (damage >= 120) return 'text-red-400';
  if (damage >= 70) return 'text-amber-300';
  return 'text-slate-50';
}

function FighterCard({ fighter }: { fighter: FighterHudSnapshot }) {
  const isP1 = fighter.slot === 0;
  const tagLabel =
    fighter.isLocalControl === true
      ? 'YOU'
      : isP1
        ? 'P1'
        : fighter.isCpu
          ? 'CPU'
          : 'P2';
  const accentBorder = isP1 ? 'border-red-500/75' : 'border-blue-500/75';
  const tagBg = isP1 ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border-2 ${accentBorder} shadow-[0_8px_20px_rgba(0,0,0,0.55)] min-w-[205px] sm:min-w-[235px]`}
    >
      <div className="relative shrink-0">
        <FighterEmblem id={fighter.id} className="w-11 h-11" />
        <span
          className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold tracking-wide text-white ${tagBg}`}
        >
          {tagLabel}
        </span>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-lg font-bold tracking-wide text-slate-100 leading-none truncate">
            {fighter.name}
          </span>
          <span
            data-testid={`damage-p${fighter.slot + 1}`}
            className={`font-display text-3xl font-extrabold leading-none tabular-nums hud-stroke ${getDamageColor(
              fighter.damage
            )}`}
          >
            {fighter.damage}%
          </span>
        </div>

        {/* Discrete Stock Pips (Full vs Empty Hollow Socket) */}
        <div className="flex items-center gap-1.5 mt-1.5" aria-label={`${fighter.stocks} stocks remaining`}>
          {Array.from({ length: fighter.maxStocks }).map((_, idx) => {
            const alive = idx < fighter.stocks;
            return (
              <svg key={idx} viewBox="0 0 14 14" className="w-3.5 h-3.5" aria-hidden="true">
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  fill={alive ? fighter.primaryColor : 'transparent'}
                  stroke={alive ? fighter.accentColor : '#475569'}
                  strokeWidth="2"
                />
              </svg>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GameHud({
  hud,
  muted,
  isOnline = false,
  onToggleMute,
  onPause,
  onRestart,
}: GameHudProps) {
  const mins = Math.floor(hud.elapsedSeconds / 60);
  const secs = String(hud.elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
      {/* Top Row: Match Clock + Compact Utility Icon Buttons */}
      <div className="flex items-start justify-between">
        <div className="w-28 hidden sm:block" />

        <div className="px-3.5 py-1 rounded-lg bg-slate-950/88 border border-slate-700/75 text-slate-100 font-mono-tabular text-sm font-bold shadow-md">
          {mins}:{secs}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-10 h-10 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              {muted ? (
                <>
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </>
              ) : (
                <>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                </>
              )}
            </svg>
          </button>

          {!isOnline && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Restart match (R)"
              title="Restart (R)"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-10 h-10 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause match (P or Escape)"
            title="Pause (Esc)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-10 h-10 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Transient Countdown / KO Callout */}
      {(hud.countdownText || hud.koBannerText) && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          {hud.koBannerText === 'KO!' || hud.koBannerText === 'GAME!' ? (
            <div
              key={hud.koBannerText}
              className="relative flex items-center justify-center animate-ko-slam"
            >
              <div
                className={`absolute -inset-x-20 sm:-inset-x-28 h-14 sm:h-16 -skew-x-12 rounded-sm shadow-[0_12px_36px_rgba(0,0,0,0.6)] border-y-2 ${
                  hud.koBannerText === 'GAME!'
                    ? 'bg-gradient-to-r from-transparent via-red-600/90 to-transparent border-amber-300'
                    : 'bg-gradient-to-r from-transparent via-amber-500/90 to-transparent border-yellow-200'
                }`}
              />
              <div
                className={`relative font-display italic font-extrabold text-7xl sm:text-9xl tracking-widest hud-stroke drop-shadow-[0_6px_22px_rgba(251,191,36,0.65)] ${
                  hud.koBannerText === 'GAME!' ? 'text-yellow-300' : 'text-white'
                }`}
              >
                {hud.koBannerText}
              </div>
            </div>
          ) : (
            <div className="font-display italic font-extrabold text-7xl sm:text-8xl tracking-wider text-amber-400 hud-stroke">
              {hud.countdownText ?? hud.koBannerText}
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Smash Fighter Cards */}
      <div className="flex items-end justify-center gap-4 sm:gap-10 pb-1">
        <FighterCard fighter={hud.fighters[0]} />
        <FighterCard fighter={hud.fighters[1]} />
      </div>
    </div>
  );
}
