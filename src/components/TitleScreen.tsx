import { useEffect, useState } from 'react';
import { FIGHTER_LIST } from '../game/fighters';
import { STAGE_LIST } from '../game/stages';
import { CpuDifficulty, FighterId, GameMode, MatchConfig, StageId } from '../game/types';
import { FighterEmblem } from './FighterEmblem';

interface TitleScreenProps {
  config: MatchConfig;
  onChangeConfig: (next: MatchConfig) => void;
  onStartMatch: (overrideConfig?: MatchConfig) => void;
}

type MenuView = 'main' | 'setup';

export function TitleScreen({ config, onChangeConfig, onStartMatch }: TitleScreenProps) {
  const [menuView, setMenuView] = useState<MenuView>('main');

  // Bind Enter and Space on main menu to start the default match
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT') {
        if (e.code === 'Enter') return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartMatch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartMatch]);

  const update = (patch: Partial<MatchConfig>) => {
    onChangeConfig({ ...config, ...patch });
  };

  const quickPlay = (mode: GameMode) => {
    const next = { ...config, mode };
    onChangeConfig(next);
    onStartMatch(next);
  };

  const setStage = (stage: StageId) => update({ stage });
  const setStocks = (stocks: number) => update({ stocks });
  const setDifficulty = (difficulty: CpuDifficulty) => update({ difficulty });
  const setP1 = (p1Fighter: FighterId) => update({ p1Fighter });
  const setP2 = (p2Fighter: FighterId) => update({ p2Fighter });

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-6 sm:p-8 pointer-events-none">
      {/* Main Menu or Setup Sub-screen */}
      {menuView === 'main' ? (
        <div className="flex flex-col items-center text-center gap-4 pt-2 sm:pt-4">
          <svg
            viewBox="0 0 460 112"
            className="w-[300px] sm:w-[400px] h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
            role="img"
            aria-label="Skyline Brawl"
          >
            <path
              d="M18 56 L42 18 L56 18 L38 56 L58 94 L44 94 Z"
              fill="#EF4444"
              stroke="#0B1120"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M46 56 L70 18 L84 18 L66 56 L86 94 L72 94 Z"
              fill="#F59E0B"
              stroke="#0B1120"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <text
              x="100"
              y="60"
              fill="#F8FAFC"
              stroke="#0B1120"
              strokeWidth="8"
              paintOrder="stroke fill"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize="56"
              letterSpacing="2"
            >
              SKYLINE
            </text>
            <text
              x="102"
              y="102"
              fill="#FBBF24"
              stroke="#0B1120"
              strokeWidth="7"
              paintOrder="stroke fill"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize="44"
              letterSpacing="4"
            >
              BRAWL
            </text>
          </svg>

          <nav
            aria-label="Main menu"
            className="pointer-events-auto flex flex-col w-full max-w-[260px] gap-2.5"
          >
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                quickPlay('cpu');
              }}
              className="w-full py-3 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide shadow-[0_5px_0_#92400E] transition-colors cursor-pointer whitespace-nowrap"
            >
              Play vs CPU
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                quickPlay('local');
              }}
              className="w-full py-2.5 px-6 rounded-lg bg-slate-900/92 hover:bg-slate-800 text-slate-100 font-display text-xl font-bold uppercase tracking-wide border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              2P Local
            </button>

            <button
              type="button"
              onClick={() => setMenuView('setup')}
              className="w-full py-2.5 px-6 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Match Setup
            </button>
          </nav>
        </div>
      ) : (
        <section
          aria-label="Match setup"
          className="pointer-events-auto mx-auto my-auto w-full max-w-[440px] rounded-xl bg-slate-950/94 border border-slate-700/85 p-5 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
              Match Setup
            </h2>
            <button
              type="button"
              onClick={() => setMenuView('main')}
              className="px-3 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>

          {/* Mode + Stocks */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => update({ mode: 'cpu' })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  config.mode === 'cpu'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1P vs CPU
              </button>
              <button
                type="button"
                onClick={() => update({ mode: 'local' })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  config.mode === 'local'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2P Local
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400">Stocks</span>
              {[2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} stocks`}
                  onClick={() => setStocks(n)}
                  className={`w-8 h-8 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                    config.stocks === n
                      ? 'bg-slate-100 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Fighter Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-red-400 mb-1.5">Player 1</div>
              <div className="flex flex-col gap-1.5">
                {FIGHTER_LIST.map((f) => {
                  const selected = config.p1Fighter === f.id;
                  return (
                    <button
                      key={`p1-${f.id}`}
                      type="button"
                      aria-label={`Player 1 select ${f.name}`}
                      onClick={() => setP1(f.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-slate-800 border-red-500 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <FighterEmblem id={f.id} className="w-7 h-7 shrink-0" />
                      <span className="text-sm font-bold">{f.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-blue-400 mb-1.5">
                {config.mode === 'cpu' ? 'CPU Rival' : 'Player 2'}
              </div>
              <div className="flex flex-col gap-1.5">
                {FIGHTER_LIST.map((f) => {
                  const selected = config.p2Fighter === f.id;
                  return (
                    <button
                      key={`p2-${f.id}`}
                      type="button"
                      aria-label={`${config.mode === 'cpu' ? 'CPU' : 'Player 2'} select ${f.name}`}
                      onClick={() => setP2(f.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-slate-800 border-blue-500 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <FighterEmblem id={f.id} className="w-7 h-7 shrink-0" />
                      <span className="text-sm font-bold">{f.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stage & Difficulty */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              {STAGE_LIST.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStage(st.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    config.stage === st.id
                      ? 'bg-slate-100 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {st.name}
                </button>
              ))}
            </div>

            {config.mode === 'cpu' && (
              <div className="flex items-center gap-1">
                {([
                  ['chill', 'Chill'],
                  ['standard', 'Standard'],
                  ['fierce', 'Fierce'],
                ] as [CpuDifficulty, string][]).map(([diff, label]) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      config.difficulty === diff
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartMatch();
            }}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide shadow-[0_4px_0_#92400E] transition-colors cursor-pointer"
          >
            Start Match
          </button>
        </section>
      )}

      {/* Bottom Safe Margin: Single flat control hint */}
      <div className="w-full text-center text-xs sm:text-sm text-slate-300/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
        {config.mode === 'cpu' ? (
          <span>
            Move WASD / Arrows · Jump Space · Attack J / Z · Special K / X · Shield L / C
          </span>
        ) : (
          <span>
            P1: WASD + F / G / H · P2: Arrows + J / K / L
          </span>
        )}
      </div>
    </div>
  );
}
