import { MatchResultSnapshot, OnlineRole } from '../game/types';
import { FighterEmblem } from './FighterEmblem';

interface PauseModalProps {
  isOnline?: boolean;
  controlSummary?: string;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({
  isOnline = false,
  controlSummary,
  onResume,
  onRestart,
  onReturnTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isOnline ? 'Online Match Menu' : 'Match Paused'}
    >
      <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-5">
        <div className="text-center">
          <h2 className="font-display text-4xl font-extrabold italic tracking-wide text-white">
            {isOnline ? 'MATCH MENU' : 'PAUSED'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isOnline
              ? 'Online match stays live while this menu is open'
              : 'Press Esc or P to resume battle'}
          </p>
        </div>

        <p className="text-xs text-slate-300 text-center leading-relaxed border-y border-slate-800 py-2.5">
          {controlSummary ?? 'Normal: J / Z · Special: K / X · Up + Special: Recovery · Shield / Dodge: L / C'}
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
          >
            Resume Match
          </button>
          {!isOnline && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              Restart Match
            </button>
          )}
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-800 transition-colors cursor-pointer"
          >
            {isOnline ? 'Leave Online Match' : 'Back to Title'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  result: MatchResultSnapshot;
  isOnline?: boolean;
  onlineRole?: OnlineRole;
  rematchRequested?: boolean;
  opponentRematchRequested?: boolean;
  onRequestRematch?: () => void;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export function GameOverModal({
  result,
  isOnline = false,
  onlineRole,
  rematchRequested = false,
  opponentRematchRequested = false,
  onRequestRematch,
  onPlayAgain,
  onReturnTitle,
}: GameOverModalProps) {
  const p1Won = result.winnerSlot === 0;
  const p2Label = result.mode === 'cpu' ? 'CPU' : 'P2';
  const isGuest = isOnline && onlineRole === 'guest';

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/78 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Match Results"
    >
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-5">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            {result.stageName} · {result.durationSeconds}s
          </div>
          <h2 className="font-display text-5xl font-extrabold italic tracking-wide text-white mt-1">
            {result.winnerName} WINS!
          </h2>
          {isOnline && opponentRematchRequested && (
            <p className="text-xs font-semibold text-emerald-400 mt-1.5">
              Opponent wants a rematch!
            </p>
          )}
        </div>

        {/* Fighter Stat Comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-lg p-3.5 border ${
              p1Won
                ? 'bg-slate-800/90 border-red-500'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <FighterEmblem id={result.p1Stats.fighterId} className="w-8 h-8" />
              <div>
                <div className="text-xs font-bold text-red-400">P1</div>
                <div className="text-sm font-bold text-white leading-none">
                  {result.p1Stats.name}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs tabular-nums">
              <div className="flex justify-between text-slate-300">
                <span>KOs</span>
                <span className="font-bold text-white">{result.p1Stats.kos}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Damage Dealt</span>
                <span className="font-bold text-white">{result.p1Stats.damageDealt}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Stocks Left</span>
                <span className="font-bold text-white">{result.p1Stats.stocksLeft}</span>
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg p-3.5 border ${
              !p1Won
                ? 'bg-slate-800/90 border-blue-500'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <FighterEmblem id={result.p2Stats.fighterId} className="w-8 h-8" />
              <div>
                <div className="text-xs font-bold text-blue-400">{p2Label}</div>
                <div className="text-sm font-bold text-white leading-none">
                  {result.p2Stats.name}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs tabular-nums">
              <div className="flex justify-between text-slate-300">
                <span>KOs</span>
                <span className="font-bold text-white">{result.p2Stats.kos}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Damage Dealt</span>
                <span className="font-bold text-white">{result.p2Stats.damageDealt}%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Stocks Left</span>
                <span className="font-bold text-white">{result.p2Stats.stocksLeft}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isGuest ? (
            <button
              type="button"
              disabled={rematchRequested}
              onClick={onRequestRematch}
              className="flex-1 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-300 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-default"
            >
              {rematchRequested ? 'Rematch Requested...' : 'Request Rematch'}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="flex-1 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
            >
              {isOnline && opponentRematchRequested ? 'Start Rematch' : 'Play Again'}
            </button>
          )}
          <button
            type="button"
            onClick={onReturnTitle}
            className="py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            {isOnline ? 'Back to Lobby' : 'Change Fighters'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DisconnectModalProps {
  message: string;
  onReturnLobby: () => void;
}

export function DisconnectModal({ message, onReturnLobby }: DisconnectModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connection Lost"
    >
      <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-4 text-center">
        <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white">
          Connection Lost
        </h2>
        <p className="text-sm text-slate-300">{message}</p>
        <button
          type="button"
          onClick={onReturnLobby}
          className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
        >
          Back to Online Lobby
        </button>
      </div>
    </div>
  );
}
