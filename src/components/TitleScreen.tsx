import { useEffect, useState } from 'react';
import { FIGHTER_LIST, FIGHTERS } from '../game/fighters';
import {
  createDefaultHotkeys,
  formatControlSummary,
  formatKeyCode,
  HOTKEY_ACTION_LABELS,
  HotkeySettings,
  rebindHotkey,
  RebindTarget,
} from '../game/hotkeys';
import { buildRoomInviteUrl, isValidRoomCode, normalizeRoomCode } from '../game/netcode';
import { STAGE_LIST, STAGES } from '../game/stages';
import {
  CpuDifficulty,
  FighterId,
  GameMode,
  MatchConfig,
  OnlineConnectionStatus,
  OnlineRole,
  StageId,
} from '../game/types';
import { FighterEmblem } from './FighterEmblem';

export type MenuView = 'main' | 'setup' | 'online';
export type OnlineTab = 'host' | 'join';
export type SetupTab = 'match' | 'hotkeys';

export interface OnlineLobbyState {
  status: OnlineConnectionStatus;
  error: string | null;
  role: OnlineRole | null;
  roomCode: string;
  pingMs: number | null;
  guestReady: boolean;
  transportMode?: 'webrtc' | 'relay' | null;
}

interface TitleScreenProps {
  config: MatchConfig;
  hotkeys: HotkeySettings;
  menuView: MenuView;
  onlineTab: OnlineTab;
  joinCode: string;
  onlineState: OnlineLobbyState;
  onChangeMenuView: (view: MenuView) => void;
  onChangeOnlineTab: (tab: OnlineTab) => void;
  onChangeJoinCode: (code: string) => void;
  onChangeConfig: (next: MatchConfig) => void;
  onChangeHotkeys: (next: HotkeySettings) => void;
  onStartMatch: (overrideConfig?: MatchConfig) => void;
  onHostOnline: () => void;
  onJoinOnline: (code: string) => void;
  onLeaveOnline: () => void;
  onGuestChoice: (fighter: FighterId, ready: boolean) => void;
  onStartOnlineMatch: () => void;
}

function getStatusText(online: OnlineLobbyState): string {
  switch (online.status) {
    case 'creating':
      return 'Opening room...';
    case 'waiting':
      return 'Waiting for opponent to join...';
    case 'connecting':
      return `Joining room ${online.roomCode}...`;
    case 'connected': {
      const modeLabel =
        online.transportMode === 'relay'
          ? 'Relay'
          : online.transportMode === 'webrtc'
            ? 'Direct P2P'
            : null;
      const parts = ['Connected'];
      if (modeLabel) parts.push(modeLabel);
      if (online.pingMs !== null) parts.push(`${online.pingMs} ms`);
      return parts.join(' · ');
    }
    case 'disconnected':
      return online.error || 'Opponent disconnected.';
    case 'error':
      return online.error || 'Connection error.';
    default:
      return 'Ready to connect.';
  }
}

export function TitleScreen({
  config,
  hotkeys,
  menuView,
  onlineTab,
  joinCode,
  onlineState,
  onChangeMenuView,
  onChangeOnlineTab,
  onChangeJoinCode,
  onChangeConfig,
  onChangeHotkeys,
  onStartMatch,
  onHostOnline,
  onJoinOnline,
  onLeaveOnline,
  onGuestChoice,
  onStartOnlineMatch,
}: TitleScreenProps) {
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const [setupTab, setSetupTab] = useState<SetupTab>('match');
  const [hotkeyScopeTab, setHotkeyScopeTab] = useState<'single' | 'local'>(() =>
    config.mode === 'local' ? 'local' : 'single'
  );
  const [listeningTarget, setListeningTarget] = useState<RebindTarget | null>(null);

  useEffect(() => {
    if (menuView !== 'setup' || setupTab !== 'hotkeys') {
      setListeningTarget(null);
    }
  }, [menuView, setupTab]);

  // Capture the next pressed key while listening for a hotkey rebind
  useEffect(() => {
    if (!listeningTarget) return;
    const onCaptureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') {
        setListeningTarget(null);
        return;
      }
      if (/^F\d+$/.test(e.code)) return;
      if (
        listeningTarget.scope === 'singleSecondary' &&
        (e.code === 'Backspace' || e.code === 'Delete')
      ) {
        onChangeHotkeys(rebindHotkey(hotkeys, listeningTarget, null));
        setListeningTarget(null);
        return;
      }
      onChangeHotkeys(rebindHotkey(hotkeys, listeningTarget, e.code));
      setListeningTarget(null);
    };
    window.addEventListener('keydown', onCaptureKey, { capture: true });
    return () => window.removeEventListener('keydown', onCaptureKey, { capture: true });
  }, [listeningTarget, hotkeys, onChangeHotkeys]);

  // Bind Enter and Space ONLY on the main menu to start the default CPU match
  useEffect(() => {
    if (menuView !== 'main') return;
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
  }, [menuView, onStartMatch]);

  const update = (patch: Partial<MatchConfig>) => {
    onChangeConfig({ ...config, ...patch });
  };

  const quickPlay = (mode: GameMode) => {
    const next: MatchConfig = { ...config, mode, onlineRole: undefined };
    onChangeConfig(next);
    onStartMatch(next);
  };

  const openOnlineMenu = () => {
    onChangeMenuView('online');
    onChangeOnlineTab('host');
    if (onlineState.status === 'idle' || onlineState.status === 'error' || onlineState.status === 'disconnected') {
      onHostOnline();
    }
  };

  const copyText = async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedType(kind);
      window.setTimeout(() => setCopiedType((cur) => (cur === kind ? null : cur)), 1600);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
  };

  const setStage = (stage: StageId) => update({ stage });
  const setStocks = (stocks: number) => update({ stocks });
  const setDifficulty = (difficulty: CpuDifficulty) => update({ difficulty });
  const setP1 = (p1Fighter: FighterId) => update({ p1Fighter });
  const setP2 = (p2Fighter: FighterId) => update({ p2Fighter });

  const isConnected = onlineState.status === 'connected';
  const activeSummaryMode: GameMode = menuView === 'online' ? 'online' : config.mode;

  const isListening = (target: RebindTarget) =>
    listeningTarget !== null &&
    listeningTarget.scope === target.scope &&
    listeningTarget.action === target.action;

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-6 sm:p-8 pointer-events-none">
      {menuView === 'main' && (
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
              onClick={(e) => {
                e.currentTarget.blur();
                openOnlineMenu();
              }}
              className="w-full py-2.5 px-6 rounded-lg bg-blue-600/95 hover:bg-blue-500 text-white font-display text-xl font-bold uppercase tracking-wide border border-blue-400/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              Play Online
            </button>

            <button
              type="button"
              onClick={() => onChangeMenuView('setup')}
              className="w-full py-2.5 px-6 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Match Setup
            </button>
          </nav>
        </div>
      )}

      {menuView === 'setup' && (
        <section
          aria-label="Match setup"
          className="pointer-events-auto mx-auto my-auto w-full max-w-[470px] max-h-[calc(100vh-88px)] overflow-y-auto rounded-xl bg-slate-950/94 border border-slate-700/85 p-5 shadow-2xl flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
              Match Setup
            </h2>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSetupTab('match')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    setupTab === 'match'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Match
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHotkeyScopeTab(config.mode === 'local' ? 'local' : 'single');
                    setSetupTab('hotkeys');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    setupTab === 'hotkeys'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Hotkeys
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setListeningTarget(null);
                  onChangeMenuView('main');
                }}
                className="px-3 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>

          {setupTab === 'match' ? (
            <>
              {/* Mode + Stocks */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => update({ mode: 'cpu', onlineRole: undefined })}
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
                    onClick={() => update({ mode: 'local', onlineRole: undefined })}
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
            </>
          ) : (
            <div className="flex flex-col gap-2.5" aria-label="Hotkey bindings">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setListeningTarget(null);
                      setHotkeyScopeTab('single');
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      hotkeyScopeTab === 'single'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    1P / Online
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setListeningTarget(null);
                      setHotkeyScopeTab('local');
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      hotkeyScopeTab === 'local'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    2P Local
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setListeningTarget(null);
                    onChangeHotkeys(createDefaultHotkeys());
                  }}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <p
                data-testid="hotkey-status-hint"
                className={`text-xs ${
                  listeningTarget ? 'text-amber-300 font-semibold' : 'text-slate-400'
                }`}
              >
                {listeningTarget
                  ? listeningTarget.scope === 'singleSecondary'
                    ? 'Press any key to bind (Esc cancels, Backspace clears)...'
                    : 'Press any key to bind (Esc cancels)...'
                  : 'Click a key button to rebind. Duplicate keys swap automatically.'}
              </p>

              {hotkeyScopeTab === 'single' ? (
                <>
                  <div className="grid grid-cols-[1fr_92px_92px] gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span>Action</span>
                    <span className="text-center">Primary</span>
                    <span className="text-center">Alt</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {HOTKEY_ACTION_LABELS.map(({ action, label }) => {
                      const primTarget: RebindTarget = { scope: 'singlePrimary', action };
                      const altTarget: RebindTarget = { scope: 'singleSecondary', action };
                      const primActive = isListening(primTarget);
                      const altActive = isListening(altTarget);
                      return (
                        <div
                          key={`hk-single-${action}`}
                          className="grid grid-cols-[1fr_92px_92px] items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/75 border border-slate-800/80"
                        >
                          <span className="text-xs font-semibold text-slate-200">{label}</span>
                          <button
                            type="button"
                            aria-label={`${label} primary hotkey`}
                            onClick={() => setListeningTarget(primActive ? null : primTarget)}
                            className={`py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${
                              primActive
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                            }`}
                          >
                            {primActive
                              ? 'Press key...'
                              : formatKeyCode(hotkeys.singlePrimary[action])}
                          </button>
                          <button
                            type="button"
                            aria-label={`${label} alternate hotkey`}
                            onClick={() => setListeningTarget(altActive ? null : altTarget)}
                            className={`py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${
                              altActive
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                            }`}
                          >
                            {altActive
                              ? 'Press key...'
                              : formatKeyCode(hotkeys.singleSecondary[action])}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                    <span className="text-xs font-medium text-slate-300">
                      Tap Up to Jump
                    </span>
                    <button
                      type="button"
                      aria-pressed={hotkeys.singleTapJump}
                      onClick={() =>
                        onChangeHotkeys({
                          ...hotkeys,
                          singleTapJump: !hotkeys.singleTapJump,
                        })
                      }
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        hotkeys.singleTapJump
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {hotkeys.singleTapJump ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_92px_92px] gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span>Action</span>
                    <span className="text-center text-red-400">Player 1</span>
                    <span className="text-center text-blue-400">Player 2</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {HOTKEY_ACTION_LABELS.map(({ action, label }) => {
                      const p1Target: RebindTarget = { scope: 'localP1', action };
                      const p2Target: RebindTarget = { scope: 'localP2', action };
                      const p1Active = isListening(p1Target);
                      const p2Active = isListening(p2Target);
                      return (
                        <div
                          key={`hk-local-${action}`}
                          className="grid grid-cols-[1fr_92px_92px] items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/75 border border-slate-800/80"
                        >
                          <span className="text-xs font-semibold text-slate-200">{label}</span>
                          <button
                            type="button"
                            aria-label={`P1 ${label} hotkey`}
                            onClick={() => setListeningTarget(p1Active ? null : p1Target)}
                            className={`py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${
                              p1Active
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-red-500/40'
                            }`}
                          >
                            {p1Active ? 'Press key...' : formatKeyCode(hotkeys.localP1[action])}
                          </button>
                          <button
                            type="button"
                            aria-label={`P2 ${label} hotkey`}
                            onClick={() => setListeningTarget(p2Active ? null : p2Target)}
                            className={`py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${
                              p2Active
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-blue-500/40'
                            }`}
                          >
                            {p2Active ? 'Press key...' : formatKeyCode(hotkeys.localP2[action])}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800">
                    <button
                      type="button"
                      aria-pressed={hotkeys.localP1TapJump}
                      onClick={() =>
                        onChangeHotkeys({
                          ...hotkeys,
                          localP1TapJump: !hotkeys.localP1TapJump,
                        })
                      }
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        hotkeys.localP1TapJump
                          ? 'bg-slate-800 border-red-500/50 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      P1 Tap Up Jump: {hotkeys.localP1TapJump ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={hotkeys.localP2TapJump}
                      onClick={() =>
                        onChangeHotkeys({
                          ...hotkeys,
                          localP2TapJump: !hotkeys.localP2TapJump,
                        })
                      }
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        hotkeys.localP2TapJump
                          ? 'bg-slate-800 border-blue-500/50 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      P2 Tap Up Jump: {hotkeys.localP2TapJump ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {menuView === 'online' && (
        <section
          aria-label="Online 1v1 Lobby"
          className="pointer-events-auto mx-auto my-auto w-full max-w-[460px] rounded-xl bg-slate-950/95 border border-slate-700/85 p-5 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white leading-none">
                Online 1v1
              </h2>
              <p
                data-testid="online-status-text"
                className={`text-xs font-medium mt-1 ${
                  onlineState.status === 'connected'
                    ? 'text-emerald-400'
                    : onlineState.status === 'error' || onlineState.status === 'disconnected'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                }`}
              >
                {getStatusText(onlineState)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onLeaveOnline();
                onChangeMenuView('main');
              }}
              className="px-3 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>

          {/* Create / Join Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                onChangeOnlineTab('host');
                if (onlineState.role !== 'host' || onlineState.status === 'idle' || onlineState.status === 'error' || onlineState.status === 'disconnected') {
                  onHostOnline();
                }
              }}
              className={`py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                onlineTab === 'host'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeOnlineTab('join');
                if (onlineState.role === 'host') {
                  onLeaveOnline();
                }
              }}
              className={`py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                onlineTab === 'join'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          {onlineTab === 'host' ? (
            <>
              {/* Room Code & Share Link */}
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Room Code
                  </div>
                  <div
                    data-testid="host-room-code"
                    className="font-mono-tabular text-2xl font-extrabold tracking-widest text-amber-400 leading-tight"
                  >
                    {onlineState.roomCode || '......'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!onlineState.roomCode}
                    onClick={() => copyText(onlineState.roomCode, 'code')}
                    className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedType === 'code' ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    type="button"
                    disabled={!onlineState.roomCode}
                    onClick={() =>
                      copyText(buildRoomInviteUrl(window.location.href, onlineState.roomCode), 'link')
                    }
                    className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {copiedType === 'link' ? 'Link Copied!' : 'Copy Invite Link'}
                  </button>
                </div>
              </div>

              {(onlineState.status === 'error' || onlineState.status === 'disconnected') && (
                <button
                  type="button"
                  onClick={onHostOnline}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  Open New Room
                </button>
              )}

              {/* Host Controls: P1 Fighter + Guest Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-red-400 mb-1.5">Your Fighter (P1)</div>
                  <div className="flex flex-col gap-1.5">
                    {FIGHTER_LIST.map((f) => {
                      const selected = config.p1Fighter === f.id;
                      return (
                        <button
                          key={`host-p1-${f.id}`}
                          type="button"
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
                  <div className="text-xs font-semibold text-blue-400 mb-1.5">Opponent (P2)</div>
                  <div className="h-[136px] rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex flex-col items-center justify-center text-center gap-2">
                    {isConnected ? (
                      <>
                        <FighterEmblem id={config.p2Fighter} className="w-11 h-11" />
                        <div className="text-sm font-bold text-white">
                          {FIGHTERS[config.p2Fighter].name}
                        </div>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            onlineState.guestReady ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {onlineState.guestReady ? 'Ready' : 'Picking Fighter'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 leading-relaxed">
                        Share the code or invite link with a friend to connect.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage + Stocks */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5">
                  {STAGE_LIST.map((st) => (
                    <button
                      key={`host-st-${st.id}`}
                      type="button"
                      onClick={() => setStage(st.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        config.stage === st.id
                          ? 'bg-slate-100 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {st.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-400">Stocks</span>
                  {[2, 3, 5].map((n) => (
                    <button
                      key={`host-stk-${n}`}
                      type="button"
                      onClick={() => setStocks(n)}
                      className={`w-7 h-7 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${
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

              <button
                type="button"
                disabled={!isConnected}
                onClick={onStartOnlineMatch}
                className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide shadow-[0_4px_0_#92400E] disabled:shadow-none transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isConnected ? 'Start Online Match' : 'Waiting for Opponent...'}
              </button>
            </>
          ) : (
            <>
              {/* Join Room Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isValidRoomCode(joinCode)) {
                    onJoinOnline(joinCode);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  aria-label="Room code"
                  placeholder="Enter room code"
                  value={joinCode}
                  maxLength={8}
                  onChange={(e) => onChangeJoinCode(normalizeRoomCode(e.target.value))}
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none font-mono-tabular text-lg font-bold tracking-widest text-white uppercase placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                />
                <button
                  type="submit"
                  disabled={!isValidRoomCode(joinCode) || onlineState.status === 'connecting'}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-display text-lg font-bold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {onlineState.status === 'connecting' ? 'Joining...' : 'Connect'}
                </button>
              </form>

              {/* Guest Fighter Select + Host Lobby Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-red-400 mb-1.5">Host (P1)</div>
                  <div className="h-[136px] rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex flex-col items-center justify-center text-center gap-2">
                    {isConnected ? (
                      <>
                        <FighterEmblem id={config.p1Fighter} className="w-11 h-11" />
                        <div className="text-sm font-bold text-white">
                          {FIGHTERS[config.p1Fighter].name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {STAGES[config.stage].name} · {config.stocks} Stocks
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 leading-relaxed">
                        Enter the host&apos;s room code to join their lobby.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-blue-400 mb-1.5">Your Fighter (P2)</div>
                  <div className="flex flex-col gap-1.5">
                    {FIGHTER_LIST.map((f) => {
                      const selected = config.p2Fighter === f.id;
                      return (
                        <button
                          key={`guest-p2-${f.id}`}
                          type="button"
                          onClick={() => {
                            setP2(f.id);
                            onGuestChoice(f.id, onlineState.guestReady);
                          }}
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

              <button
                type="button"
                disabled={!isConnected}
                onClick={() => onGuestChoice(config.p2Fighter, !onlineState.guestReady)}
                className={`w-full py-3 rounded-lg font-display text-2xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  !isConnected
                    ? 'bg-slate-800 text-slate-500'
                    : onlineState.guestReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {!isConnected
                  ? 'Connect to Ready Up'
                  : onlineState.guestReady
                    ? 'Ready! Waiting for Host...'
                    : 'Ready Up'}
              </button>
            </>
          )}
        </section>
      )}

      {/* Bottom Safe Margin: Single flat control hint */}
      <div className="w-full text-center text-xs sm:text-sm text-slate-300/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
        <span>{formatControlSummary(hotkeys, activeSummaryMode)}</span>
      </div>
    </div>
  );
}
