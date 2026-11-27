import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { DisconnectModal, GameOverModal, PauseModal } from './components/StatusModal';
import { MenuView, OnlineLobbyState, OnlineTab, TitleScreen } from './components/TitleScreen';
import { GameEngine } from './game/engine';
import { NetMessage, normalizeRoomCode, parseRoomFromSearch } from './game/netcode';
import { P2PTransport } from './game/p2p';
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
  const p2pRef = useRef<P2PTransport | null>(null);

  const initialInviteRoom = useRef<string | null>(
    typeof window !== 'undefined' ? parseRoomFromSearch(window.location.search) : null
  );

  const [config, setConfig] = useState<MatchConfig>(INITIAL_CONFIG);
  const configRef = useRef<MatchConfig>(INITIAL_CONFIG);

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

  const [hud, setHud] = useState<MatchHudSnapshot>(INITIAL_HUD);
  const [matchResult, setMatchResult] = useState<MatchResultSnapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false);
  const [disconnectNotice, setDisconnectNotice] = useState<string | null>(null);

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
    engineRef.current = engine;

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
      onStatusChange: (status, detail) => {
        const role = transport.getRole();
        const roomCode = transport.getRoomCode();
        updateOnlineState((prev) => ({
          ...prev,
          status,
          role,
          roomCode: roomCode || prev.roomCode,
          error: status === 'error' || status === 'disconnected' ? detail ?? null : null,
          guestReady: status === 'connected' ? prev.guestReady : false,
        }));

        if (status === 'connected' && role === 'host') {
          sendLobbySnapshot(configRef.current, false);
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
            break;
          }
          case 'start_match': {
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
      transport.destroy();
      p2pRef.current = null;
      engine.destroy();
      engineRef.current = null;
    };
  }, [updateOnlineState]);

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

  const handleHostOnline = useCallback(() => {
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
  }, [updateOnlineState]);

  const handleJoinOnline = useCallback(
    (rawCode: string) => {
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
    [updateOnlineState]
  );

  const handleLeaveOnline = useCallback(() => {
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
  }, [updateOnlineState]);

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
    if (!p2pRef.current?.isConnected()) return;
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
  }, []);

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
      if (screenStateRef.current === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
        e.preventDefault();
        handleResume();
      } else if (
        screenStateRef.current === 'playing' &&
        e.code === 'KeyR' &&
        configRef.current.mode !== 'online'
      ) {
        e.preventDefault();
        handleRestart();
      } else if (screenStateRef.current === 'playing' && e.code === 'KeyM') {
        setMuted(engineRef.current?.audio.isMuted() ?? false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResume, handleRestart]);

  const isOnlineMatch = config.mode === 'online';

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Isolated Canvas Mount */}
      <div ref={mountRef} className="fixed inset-0" />

      {screenState === 'title' && (
        <TitleScreen
          config={config}
          menuView={menuView}
          onlineTab={onlineTab}
          joinCode={joinCode}
          onlineState={onlineState}
          onChangeMenuView={setMenuView}
          onChangeOnlineTab={setOnlineTab}
          onChangeJoinCode={setJoinCode}
          onChangeConfig={handleChangeConfig}
          onStartMatch={handleStartMatch}
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
          onToggleMute={handleToggleMute}
          onPause={() => setScreenState('paused')}
          onRestart={handleRestart}
        />
      )}

      {screenState === 'paused' && !disconnectNotice && (
        <PauseModal
          isOnline={isOnlineMatch}
          onResume={handleResume}
          onRestart={handleRestart}
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
