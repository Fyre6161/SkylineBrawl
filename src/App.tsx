import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { DisconnectModal, GameOverModal, PauseModal } from './components/StatusModal';
import { MenuView, OnlineLobbyState, OnlineTab, TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import { GameEngine } from './game/engine';
import { getConnectedGamepads } from './game/gamepad';
import {
  formatControlSummary,
  HotkeySettings,
  isHotkeyBound,
  loadHotkeySettings,
  saveHotkeySettings,
} from './game/hotkeys';
import {
  QuickMatchmaker,
  QuickMatchResult,
  QuickMatchStatus,
} from './game/matchmaking';
import { NetMessage, normalizeRoomCode, parseRoomFromSearch } from './game/netcode';
import { P2PTransport } from './game/p2p';
import {
  detectTouchCapability,
  loadTouchControlMode,
  loadTouchLayout,
  saveTouchControlMode,
  saveTouchLayout,
  TouchControlMode,
  TouchLayoutConfig,
} from './game/touchInput';
import {
  FighterId,
  GameScreenState,
  MatchConfig,
  MatchHudSnapshot,
  MatchResultSnapshot,
} from './game/types';

const INITIAL_CONFIG: MatchConfig = {
  mode: 'cpu',
  p1Fighter: 'blaze',
  p2Fighter: 'gale',
  stage: 'sky_temple',
  stocks: 3,
  difficulty: 'standard',
};

const INITIAL_ONLINE: OnlineLobbyState = {
  status: 'idle',
  error: null,
  role: null,
  roomCode: '',
  pingMs: null,
  guestReady: false,
  transportMode: null,
};

const INITIAL_HUD: MatchHudSnapshot = {
  fighters: [
    {
      slot: 0,
      id: 'blaze',
      name: 'Blaze',
      isCpu: false,
      damage: 0,
      stocks: 3,
      maxStocks: 3,
      shieldRatio: 1,
      hitFlash: false,
      respawning: false,
      primaryColor: '#EF4444',
      accentColor: '#FDBA74',
    },
    {
      slot: 1,
      id: 'gale',
      name: 'Gale',
      isCpu: true,
      damage: 0,
      stocks: 3,
      maxStocks: 3,
      shieldRatio: 1,
      hitFlash: false,
      respawning: false,
      primaryColor: '#3B82F6',
      accentColor: '#67E8F9',
    },
  ],
  elapsedSeconds: 0,
  countdownText: null,
  winnerSlot: null,
  koBannerText: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engineInstance, setEngineInstance] = useState<GameEngine | null>(null);
  const p2pRef = useRef<P2PTransport | null>(null);

  const initialInviteRoom = useRef<string | null>(
    typeof window !== 'undefined' ? parseRoomFromSearch(window.location.search) : null
  );

  const [config, setConfig] = useState<MatchConfig>(INITIAL_CONFIG);
  const configRef = useRef<MatchConfig>(INITIAL_CONFIG);

  const [hotkeys, setHotkeys] = useState<HotkeySettings>(() => loadHotkeySettings());
  const hotkeysRef = useRef<HotkeySettings>(hotkeys);

  const [touchMode, setTouchMode] = useState<TouchControlMode>(() => loadTouchControlMode());
  const [touchLayout, setTouchLayout] = useState<TouchLayoutConfig>(() => loadTouchLayout());
  const [isEditingTouchLayout, setIsEditingTouchLayout] = useState(false);
  const [touchDetected, setTouchDetected] = useState<boolean>(() => detectTouchCapability());
  const [gamepadCount, setGamepadCount] = useState<number>(() => getConnectedGamepads().length);

  const [screenState, setScreenState] = useState<GameScreenState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const screenStateRef = useRef<GameScreenState>(screenState);

  const [menuView, setMenuView] = useState<MenuView>(() =>
    initialInviteRoom.current ? 'online' : 'main'
  );
  const [onlineTab, setOnlineTab] = useState<OnlineTab>(() =>
    initialInviteRoom.current ? 'join' : 'host'
  );
  const [joinCode, setJoinCode] = useState<string>(
    () => initialInviteRoom.current ?? ''
  );

  const [onlineState, setOnlineState] = useState<OnlineLobbyState>(INITIAL_ONLINE);
  const onlineStateRef = useRef<OnlineLobbyState>(INITIAL_ONLINE);

  const matchmakerRef = useRef<QuickMatchmaker | null>(null);
  const isQuickMatchRef = useRef(false);
  const quickAutoStartTimerRef = useRef<number | null>(null);
  const guestJoinDelayTimerRef = useRef<number | null>(null);
  const [quickFighter, setQuickFighter] = useState<FighterId>('blaze');
  const quickFighterRef = useRef<FighterId>('blaze');
  const [quickMatchStatus, setQuickMatchStatus] = useState<QuickMatchStatus>('idle');
  const [quickMatchError, setQuickMatchError] = useState<string | null>(null);

  const [hud, setHud] = useState<MatchHudSnapshot>(INITIAL_HUD);
  const [matchResult, setMatchResult] = useState<MatchResultSnapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false);
  const [disconnectNotice, setDisconnectNotice] = useState<string | null>(null);

  const clearQuickTimers = useCallback(() => {
    if (quickAutoStartTimerRef.current !== null) {
      window.clearTimeout(quickAutoStartTimerRef.current);
      quickAutoStartTimerRef.current = null;
    }
    if (guestJoinDelayTimerRef.current !== null) {
      window.clearTimeout(guestJoinDelayTimerRef.current);
      guestJoinDelayTimerRef.current = null;
    }
  }, []);

  const launchHostOnlineMatch = useCallback(() => {
    if (!p2pRef.current?.isConnected()) return;
    clearQuickTimers();
    isQuickMatchRef.current = false;
    setQuickMatchStatus('idle');
    setQuickMatchError(null);
    matchmakerRef.current?.stop();
    matchmakerRef.current = null;

    const next: MatchConfig = {
      ...configRef.current,
      mode: 'online',
      onlineRole: 'host',
    };
    configRef.current = next;
    setConfig(next);
    p2pRef.current.send({
      type: 'start_match',
      stage: next.stage,
      stocks: next.stocks,
      p1Fighter: next.p1Fighter,
      p2Fighter: next.p2Fighter,
    });
    setMatchResult(null);
    setRematchRequested(false);
    setOpponentRematchRequested(false);
    setDisconnectNotice(null);
    setScreenState('playing');
    engineRef.current?.startNewMatch(next, false);
  }, [clearQuickTimers]);

  const updateOnlineState = useCallback(
    (updater: (prev: OnlineLobbyState) => OnlineLobbyState) => {
      setOnlineState((prev) => {
        const next = updater(prev);
        onlineStateRef.current = next;
        return next;
      });
    },
    []
  );

  // Sync body[data-state] for unambiguous state inspection
  useEffect(() => {
    screenStateRef.current = screenState;
    document.body.dataset.state = screenState;
    engineRef.current?.setScreenState(screenState);
  }, [screenState]);

  // Mount canvas engine + WebRTC P2P transport once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new GameEngine(container, configRef.current, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onMatchEnd: (result) => {
        setMatchResult(result);
        setScreenState('gameover');
      },
      onScreenStateRequest: (next) => {
        setScreenState(next);
      },
      onSendNetMessage: (msg) => {
        p2pRef.current?.send(msg);
      },
    });
    engine.setHotkeys(hotkeysRef.current);
    engineRef.current = engine;
    setEngineInstance(engine);

    const sendLobbySnapshot = (curConfig: MatchConfig, guestReady: boolean) => {
      p2pRef.current?.send({
        type: 'lobby',
        stage: curConfig.stage,
        stocks: curConfig.stocks,
        p1Fighter: curConfig.p1Fighter,
        p2Fighter: curConfig.p2Fighter,
        hostReady: true,
        guestReady,
      });
    };

    const transport = new P2PTransport({
      onStatusChange: (status, detail, mode) => {
        const role = transport.getRole();
        const roomCode = transport.getRoomCode();
        updateOnlineState((prev) => ({
          ...prev,
          status,
          role,
          roomCode: roomCode || prev.roomCode,
          error: status === 'error' || status === 'disconnected' ? detail ?? null : null,
          guestReady: status === 'connected' ? prev.guestReady : false,
          transportMode: status === 'connected' ? mode ?? prev.transportMode ?? null : null,
        }));

        if (status === 'connected' && role === 'host') {
          if (isQuickMatchRef.current) {
            matchmakerRef.current?.stop();
            matchmakerRef.current = null;
          }
          sendLobbySnapshot(configRef.current, false);
          if (isQuickMatchRef.current && screenStateRef.current === 'title') {
            clearQuickTimers();
            quickAutoStartTimerRef.current = window.setTimeout(() => {
              if (
                isQuickMatchRef.current &&
                screenStateRef.current === 'title' &&
                p2pRef.current?.isConnected()
              ) {
                launchHostOnlineMatch();
              }
            }, 2200);
          }
        }

        if (status === 'connected' && role === 'guest' && isQuickMatchRef.current) {
          const chosen = quickFighterRef.current;
          updateOnlineState((prev) => ({
            ...prev,
            guestReady: true,
          }));
          p2pRef.current?.send({
            type: 'guest_choice',
            fighter: chosen,
            ready: true,
          });
        }

        if (
          (status === 'disconnected' || status === 'error') &&
          screenStateRef.current === 'title' &&
          isQuickMatchRef.current
        ) {
          clearQuickTimers();
          isQuickMatchRef.current = false;
          setQuickMatchStatus('error');
          setQuickMatchError(detail || 'Connection timed out. Try searching again.');
        }

        if (
          (status === 'disconnected' || status === 'error') &&
          screenStateRef.current !== 'title' &&
          configRef.current.mode === 'online'
        ) {
          setDisconnectNotice(detail || 'Opponent disconnected from the match.');
        }
      },
      onRoomReady: (roomCode) => {
        updateOnlineState((prev) => ({
          ...prev,
          roomCode,
        }));
      },
      onPingUpdate: (pingMs) => {
        updateOnlineState((prev) => ({
          ...prev,
          pingMs,
        }));
      },
      onMessage: (msg: NetMessage) => {
        const role = transport.getRole();
        switch (msg.type) {
          case 'lobby': {
            if (role !== 'guest') break;
            const next: MatchConfig = {
              ...configRef.current,
              mode: 'online',
              onlineRole: 'guest',
              stage: msg.stage,
              stocks: msg.stocks,
              p1Fighter: msg.p1Fighter,
              p2Fighter: msg.p2Fighter,
            };
            configRef.current = next;
            setConfig(next);
            engineRef.current?.updatePreviewConfig(next);
            updateOnlineState((prev) => ({
              ...prev,
              guestReady: msg.guestReady,
            }));
            break;
          }
          case 'guest_choice': {
            if (role !== 'host') break;
            const next: MatchConfig = {
              ...configRef.current,
              p2Fighter: msg.fighter,
            };
            configRef.current = next;
            setConfig(next);
            engineRef.current?.updatePreviewConfig(next);
            updateOnlineState((prev) => ({
              ...prev,
              guestReady: msg.ready,
            }));
            sendLobbySnapshot(next, msg.ready);
            if (
              isQuickMatchRef.current &&
              msg.ready &&
              screenStateRef.current === 'title'
            ) {
              launchHostOnlineMatch();
            }
            break;
          }
          case 'start_match': {
            clearQuickTimers();
            isQuickMatchRef.current = false;
            setQuickMatchStatus('idle');
            setQuickMatchError(null);
            matchmakerRef.current?.stop();
            matchmakerRef.current = null;
            const next: MatchConfig = {
              ...configRef.current,
              mode: 'online',
              onlineRole: role ?? 'guest',
              stage: msg.stage,
              stocks: msg.stocks,
              p1Fighter: msg.p1Fighter,
              p2Fighter: msg.p2Fighter,
            };
            configRef.current = next;
            setConfig(next);
            setMatchResult(null);
            setRematchRequested(false);
            setOpponentRematchRequested(false);
            setDisconnectNotice(null);
            setScreenState('playing');
            engineRef.current?.startNewMatch(next, false);
            break;
          }
          case 'input': {
            if (role === 'host') {
              engineRef.current?.pushRemoteInput(msg.payload);
            }
            break;
          }
          case 'state': {
            if (role === 'guest') {
              engineRef.current?.applyRemoteState(msg.payload);
            }
            break;
          }
          case 'match_end': {
            if (role === 'guest') {
              engineRef.current?.applyRemoteMatchEnd(msg.result);
            }
            break;
          }
          case 'rematch_request': {
            setOpponentRematchRequested(true);
            break;
          }
          case 'return_lobby': {
            setMatchResult(null);
            setRematchRequested(false);
            setOpponentRematchRequested(false);
            setOnlineTab(role === 'host' ? 'host' : 'join');
            setMenuView('online');
            setScreenState('title');
            engineRef.current?.updatePreviewConfig(configRef.current);
            break;
          }
        }
      },
    });
    p2pRef.current = transport;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startNewMatch(configRef.current, true);
      setScreenState('playing');
    } else if (initialInviteRoom.current) {
      const next: MatchConfig = {
        ...configRef.current,
        mode: 'online',
        onlineRole: 'guest',
      };
      configRef.current = next;
      setConfig(next);
      updateOnlineState((prev) => ({
        ...prev,
        role: 'guest',
        roomCode: initialInviteRoom.current ?? '',
      }));
      transport.joinRoom(initialInviteRoom.current);
    }

    return () => {
      clearQuickTimers();
      matchmakerRef.current?.stop();
      matchmakerRef.current = null;
      transport.destroy();
      p2pRef.current = null;
      engine.destroy();
      engineRef.current = null;
      setEngineInstance(null);
    };
  }, [clearQuickTimers, launchHostOnlineMatch, updateOnlineState]);

  const handleChangeConfig = useCallback((next: MatchConfig) => {
    configRef.current = next;
    setConfig(next);
    engineRef.current?.updatePreviewConfig(next);

    if (
      onlineStateRef.current.role === 'host' &&
      onlineStateRef.current.status === 'connected'
    ) {
      p2pRef.current?.send({
        type: 'lobby',
        stage: next.stage,
        stocks: next.stocks,
        p1Fighter: next.p1Fighter,
        p2Fighter: next.p2Fighter,
        hostReady: true,
        guestReady: onlineStateRef.current.guestReady,
      });
    }
  }, []);

  const handleChangeHotkeys = useCallback((next: HotkeySettings) => {
    hotkeysRef.current = next;
    setHotkeys(next);
    saveHotkeySettings(next);
    engineRef.current?.setHotkeys(next);
  }, []);

  const handleChangeTouchMode = useCallback((next: TouchControlMode) => {
    setTouchMode(next);
    saveTouchControlMode(next);
  }, []);

  const handleChangeTouchLayout = useCallback((next: TouchLayoutConfig) => {
    setTouchLayout(next);
    saveTouchLayout(next);
  }, []);

  const handleStartMatch = useCallback((overrideConfig?: MatchConfig) => {
    const nextConfig = overrideConfig ?? configRef.current;
    if (overrideConfig) {
      configRef.current = overrideConfig;
      setConfig(overrideConfig);
    }
    setMatchResult(null);
    setRematchRequested(false);
    setOpponentRematchRequested(false);
    setDisconnectNotice(null);
    setScreenState('playing');
    engineRef.current?.startNewMatch(nextConfig, false);
  }, []);

  const handleStartTouchEditMatch = useCallback(() => {
    setTouchMode('on');
    saveTouchControlMode('on');
    setIsEditingTouchLayout(true);
    handleStartMatch();
  }, [handleStartMatch]);

  const handleCancelQuickMatch = useCallback(() => {
    clearQuickTimers();
    isQuickMatchRef.current = false;
    matchmakerRef.current?.stop();
    matchmakerRef.current = null;
    setQuickMatchStatus('idle');
    setQuickMatchError(null);
    p2pRef.current?.destroy();
    updateOnlineState(() => INITIAL_ONLINE);
  }, [clearQuickTimers, updateOnlineState]);

  const handleChangeQuickFighter = useCallback((fighter: FighterId) => {
    quickFighterRef.current = fighter;
    setQuickFighter(fighter);
    matchmakerRef.current?.setFighter(fighter);
    const next: MatchConfig = {
      ...configRef.current,
      p1Fighter: fighter,
    };
    configRef.current = next;
    setConfig(next);
    engineRef.current?.updatePreviewConfig(next);
  }, []);

  const handleStartQuickMatch = useCallback(
    (overrideFighter?: FighterId) => {
      const chosen = overrideFighter ?? quickFighterRef.current;
      if (overrideFighter) {
        quickFighterRef.current = overrideFighter;
        setQuickFighter(overrideFighter);
      }

      clearQuickTimers();
      matchmakerRef.current?.stop();
      matchmakerRef.current = null;
      p2pRef.current?.destroy();

      isQuickMatchRef.current = true;
      setQuickMatchStatus('searching');
      setQuickMatchError(null);
      updateOnlineState(() => INITIAL_ONLINE);

      const searchConfig: MatchConfig = {
        ...configRef.current,
        mode: 'online',
        onlineRole: undefined,
        p1Fighter: chosen,
      };
      configRef.current = searchConfig;
      setConfig(searchConfig);
      engineRef.current?.updatePreviewConfig(searchConfig);

      matchmakerRef.current = new QuickMatchmaker(chosen, {
        onStatusChange: (status, detail) => {
          setQuickMatchStatus(status);
          if (status === 'error') {
            isQuickMatchRef.current = false;
            setQuickMatchError(detail || 'Could not reach quick-match queue.');
          } else {
            setQuickMatchError(null);
          }
        },
        onRetrySearch: () => {
          p2pRef.current?.destroy();
          updateOnlineState(() => INITIAL_ONLINE);
        },
        onMatched: (result: QuickMatchResult) => {
          setQuickMatchStatus('matched');
          setQuickMatchError(null);

          if (result.role === 'host') {
            const hostConfig: MatchConfig = {
              ...configRef.current,
              mode: 'online',
              onlineRole: 'host',
              p1Fighter: result.myFighter,
              p2Fighter: result.opponentFighter,
            };
            configRef.current = hostConfig;
            setConfig(hostConfig);
            engineRef.current?.updatePreviewConfig(hostConfig);
            updateOnlineState(() => ({
              ...INITIAL_ONLINE,
              role: 'host',
              roomCode: result.roomCode,
              status: 'creating',
            }));
            p2pRef.current?.hostRoom(result.roomCode);
          } else {
            const guestConfig: MatchConfig = {
              ...configRef.current,
              mode: 'online',
              onlineRole: 'guest',
              p1Fighter: result.opponentFighter,
              p2Fighter: result.myFighter,
            };
            configRef.current = guestConfig;
            setConfig(guestConfig);
            engineRef.current?.updatePreviewConfig(guestConfig);
            updateOnlineState(() => ({
              ...INITIAL_ONLINE,
              role: 'guest',
              roomCode: result.roomCode,
              status: 'connecting',
            }));
            clearQuickTimers();
            guestJoinDelayTimerRef.current = window.setTimeout(() => {
              if (isQuickMatchRef.current) {
                p2pRef.current?.joinRoom(result.roomCode);
              }
            }, 180);
          }
        },
      });
    },
    [clearQuickTimers, updateOnlineState]
  );

  const handleQuickPlayOnline = useCallback(() => {
    setMenuView('online');
    setOnlineTab('quick');
    handleStartQuickMatch();
  }, [handleStartQuickMatch]);

  const handleHostOnline = useCallback(() => {
    clearQuickTimers();
    isQuickMatchRef.current = false;
    matchmakerRef.current?.stop();
    matchmakerRef.current = null;
    setQuickMatchStatus('idle');
    setQuickMatchError(null);
    const next: MatchConfig = {
      ...configRef.current,
      mode: 'online',
      onlineRole: 'host',
    };
    configRef.current = next;
    setConfig(next);
    engineRef.current?.updatePreviewConfig(next);
    updateOnlineState(() => ({
      ...INITIAL_ONLINE,
      role: 'host',
      status: 'creating',
    }));
    p2pRef.current?.hostRoom();
  }, [clearQuickTimers, updateOnlineState]);

  const handleJoinOnline = useCallback(
    (rawCode: string) => {
      clearQuickTimers();
      isQuickMatchRef.current = false;
      matchmakerRef.current?.stop();
      matchmakerRef.current = null;
      setQuickMatchStatus('idle');
      setQuickMatchError(null);
      const code = normalizeRoomCode(rawCode);
      const next: MatchConfig = {
        ...configRef.current,
        mode: 'online',
        onlineRole: 'guest',
      };
      configRef.current = next;
      setConfig(next);
      engineRef.current?.updatePreviewConfig(next);
      updateOnlineState(() => ({
        ...INITIAL_ONLINE,
        role: 'guest',
        roomCode: code,
        status: 'connecting',
      }));
      p2pRef.current?.joinRoom(code);
    },
    [clearQuickTimers, updateOnlineState]
  );

  const handleLeaveOnline = useCallback(() => {
    clearQuickTimers();
    isQuickMatchRef.current = false;
    matchmakerRef.current?.stop();
    matchmakerRef.current = null;
    setQuickMatchStatus('idle');
    setQuickMatchError(null);
    p2pRef.current?.destroy();
    updateOnlineState(() => INITIAL_ONLINE);
    const next: MatchConfig = {
      ...configRef.current,
      mode: 'cpu',
      onlineRole: undefined,
    };
    configRef.current = next;
    setConfig(next);
    engineRef.current?.updatePreviewConfig(next);
  }, [clearQuickTimers, updateOnlineState]);

  const handleGuestChoice = useCallback(
    (fighter: FighterId, ready: boolean) => {
      const next: MatchConfig = {
        ...configRef.current,
        p2Fighter: fighter,
      };
      configRef.current = next;
      setConfig(next);
      engineRef.current?.updatePreviewConfig(next);
      updateOnlineState((prev) => ({
        ...prev,
        guestReady: ready,
      }));
      p2pRef.current?.send({
        type: 'guest_choice',
        fighter,
        ready,
      });
    },
    [updateOnlineState]
  );

  const handleStartOnlineMatch = useCallback(() => {
    launchHostOnlineMatch();
  }, [launchHostOnlineMatch]);

  const handleRequestRematch = useCallback(() => {
    setRematchRequested(true);
    p2pRef.current?.send({ type: 'rematch_request' });
  }, []);

  const handleResume = useCallback(() => {
    setScreenState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    if (configRef.current.mode === 'online') return;
    setMatchResult(null);
    setScreenState('playing');
    engineRef.current?.startNewMatch(configRef.current, false);
  }, []);

  const handleReturnTitle = useCallback(() => {
    const isOnline = configRef.current.mode === 'online';
    const isLeavingMidMatch = isOnline && (screenStateRef.current === 'paused' || Boolean(disconnectNotice));

    setMatchResult(null);
    setRematchRequested(false);
    setOpponentRematchRequested(false);
    setDisconnectNotice(null);

    if (isOnline && !isLeavingMidMatch && p2pRef.current?.isConnected()) {
      p2pRef.current.send({ type: 'return_lobby' });
      setOnlineTab(configRef.current.onlineRole === 'host' ? 'host' : 'join');
      setMenuView('online');
      setScreenState('title');
      engineRef.current?.updatePreviewConfig(configRef.current);
      return;
    }

    if (isOnline) {
      handleLeaveOnline();
      setMenuView('online');
      setScreenState('title');
      return;
    }

    setMenuView('main');
    setScreenState('title');
    engineRef.current?.updatePreviewConfig(configRef.current);
  }, [disconnectNotice, handleLeaveOnline]);

  const handleToggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !engine.audio.isMuted();
    engine.audio.setMuted(next);
    setMuted(next);
  }, []);

  // Global keyboard shortcuts when paused / playing (R to restart offline, Esc/P to toggle pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const boundToGame = isHotkeyBound(hotkeysRef.current, configRef.current.mode, e.code);
      if (
        screenStateRef.current === 'paused' &&
        (e.code === 'Escape' || (!boundToGame && e.code === 'KeyP'))
      ) {
        e.preventDefault();
        handleResume();
      } else if (
        screenStateRef.current === 'playing' &&
        !boundToGame &&
        e.code === 'KeyR' &&
        configRef.current.mode !== 'online'
      ) {
        e.preventDefault();
        handleRestart();
      } else if (screenStateRef.current === 'playing' && !boundToGame && e.code === 'KeyM') {
        setMuted(engineRef.current?.audio.isMuted() ?? false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResume, handleRestart]);

  // Detect touch pointer interaction & connected gamepads dynamically
  useEffect(() => {
    const syncGamepads = () => {
      setGamepadCount(getConnectedGamepads().length);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setTouchDetected(true);
      }
    };
    syncGamepads();
    window.addEventListener('gamepadconnected', syncGamepads);
    window.addEventListener('gamepaddisconnected', syncGamepads);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => {
      window.removeEventListener('gamepadconnected', syncGamepads);
      window.removeEventListener('gamepaddisconnected', syncGamepads);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  // Poll Gamepad Start (button 9) to resume from pause when offline loop is frozen
  useEffect(() => {
    if (screenState !== 'paused') return;
    const initPads = getConnectedGamepads();
    let prevStartPressed = initPads.some((p) => Boolean(p.buttons[9]?.pressed));
    const timer = window.setInterval(() => {
      const pads = getConnectedGamepads();
      const startPressed = pads.some((p) => Boolean(p.buttons[9]?.pressed));
      if (startPressed && !prevStartPressed) {
        handleResume();
      }
      prevStartPressed = startPressed;
    }, 60);
    return () => window.clearInterval(timer);
  }, [screenState, handleResume]);

  const isOnlineMatch = config.mode === 'online';
  const showTouchControls = touchMode === 'on' || (touchMode === 'auto' && touchDetected);

  const pauseControlSummary =
    showTouchControls && gamepadCount === 0
      ? 'Touch Pad: Left Stick Move · ATK Attack · SPC Special · JMP Jump · SHD Shield'
      : gamepadCount > 0
        ? 'Gamepad: Stick/D-Pad Move · A Attack · B Special · X/Y/LB Jump · RB/Triggers Shield · Start Pause'
        : formatControlSummary(hotkeys, config.mode);

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Isolated Canvas Mount */}
      <div ref={mountRef} className="fixed inset-0" />

      {screenState === 'title' && (
        <TitleScreen
          config={config}
          hotkeys={hotkeys}
          touchMode={touchMode}
          touchLayout={touchLayout}
          showTouchControls={showTouchControls}
          gamepadCount={gamepadCount}
          menuView={menuView}
          onlineTab={onlineTab}
          joinCode={joinCode}
          onlineState={onlineState}
          quickFighter={quickFighter}
          quickMatchStatus={quickMatchStatus}
          quickMatchError={quickMatchError}
          onChangeMenuView={setMenuView}
          onChangeOnlineTab={setOnlineTab}
          onChangeJoinCode={setJoinCode}
          onChangeConfig={handleChangeConfig}
          onChangeHotkeys={handleChangeHotkeys}
          onChangeTouchMode={handleChangeTouchMode}
          onChangeTouchLayout={handleChangeTouchLayout}
          onStartTouchEditMatch={handleStartTouchEditMatch}
          onChangeQuickFighter={handleChangeQuickFighter}
          onStartMatch={handleStartMatch}
          onQuickPlayOnline={handleQuickPlayOnline}
          onStartQuickMatch={handleStartQuickMatch}
          onCancelQuickMatch={handleCancelQuickMatch}
          onHostOnline={handleHostOnline}
          onJoinOnline={handleJoinOnline}
          onLeaveOnline={handleLeaveOnline}
          onGuestChoice={handleGuestChoice}
          onStartOnlineMatch={handleStartOnlineMatch}
        />
      )}

      {(screenState === 'playing' || screenState === 'paused') && (
        <GameHud
          hud={hud}
          muted={muted}
          isOnline={isOnlineMatch}
          touchActive={showTouchControls}
          onToggleMute={handleToggleMute}
          onPause={() => setScreenState('paused')}
          onRestart={handleRestart}
        />
      )}

      {screenState === 'playing' && showTouchControls && engineInstance && (
        <TouchControls
          touchInput={engineInstance.touchInput}
          layout={touchLayout}
          isEditing={isEditingTouchLayout}
          onUpdateLayout={handleChangeTouchLayout}
          onUnlockAudio={() => engineInstance.audio.unlock()}
        />
      )}

      {screenState === 'paused' && !disconnectNotice && (
        <PauseModal
          isOnline={isOnlineMatch}
          controlSummary={pauseControlSummary}
          showTouchEdit={showTouchControls}
          isEditingTouch={isEditingTouchLayout}
          onResume={handleResume}
          onRestart={handleRestart}
          onToggleTouchEdit={() => setIsEditingTouchLayout((cur) => !cur)}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {screenState === 'gameover' && matchResult && !disconnectNotice && (
        <GameOverModal
          result={matchResult}
          isOnline={isOnlineMatch}
          onlineRole={config.onlineRole}
          rematchRequested={rematchRequested}
          opponentRematchRequested={opponentRematchRequested}
          onRequestRematch={handleRequestRematch}
          onPlayAgain={() => (isOnlineMatch ? handleStartOnlineMatch() : handleStartMatch())}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {disconnectNotice && (
        <DisconnectModal
          message={disconnectNotice}
          onReturnLobby={handleReturnTitle}
        />
      )}
    </main>
  );
}
