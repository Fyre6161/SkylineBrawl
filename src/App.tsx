import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { GameEngine } from './game/engine';
import {
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

  const [config, setConfig] = useState<MatchConfig>(INITIAL_CONFIG);
  const configRef = useRef<MatchConfig>(INITIAL_CONFIG);

  const [screenState, setScreenState] = useState<GameScreenState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const screenStateRef = useRef<GameScreenState>(screenState);

  const [hud, setHud] = useState<MatchHudSnapshot>(INITIAL_HUD);
  const [matchResult, setMatchResult] = useState<MatchResultSnapshot | null>(null);
  const [muted, setMuted] = useState(false);

  // Sync body[data-state] for unambiguous state inspection
  useEffect(() => {
    screenStateRef.current = screenState;
    document.body.dataset.state = screenState;
    engineRef.current?.setScreenState(screenState);
  }, [screenState]);

  // Mount canvas engine once
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
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startNewMatch(configRef.current, true);
      setScreenState('playing');
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleChangeConfig = useCallback((next: MatchConfig) => {
    configRef.current = next;
    setConfig(next);
    engineRef.current?.updatePreviewConfig(next);
  }, []);

  const handleStartMatch = useCallback((overrideConfig?: MatchConfig) => {
    const nextConfig = overrideConfig ?? configRef.current;
    if (overrideConfig) {
      configRef.current = overrideConfig;
      setConfig(overrideConfig);
    }
    setMatchResult(null);
    setScreenState('playing');
    engineRef.current?.startNewMatch(nextConfig, false);
  }, []);

  const handleResume = useCallback(() => {
    setScreenState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    setMatchResult(null);
    setScreenState('playing');
    engineRef.current?.startNewMatch(configRef.current, false);
  }, []);

  const handleReturnTitle = useCallback(() => {
    setMatchResult(null);
    setScreenState('title');
    engineRef.current?.updatePreviewConfig(configRef.current);
  }, []);

  const handleToggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !engine.audio.isMuted();
    engine.audio.setMuted(next);
    setMuted(next);
  }, []);

  // Global keyboard shortcuts when paused / playing (R to restart, Esc/P to toggle pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (screenStateRef.current === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
        e.preventDefault();
        handleResume();
      } else if (screenStateRef.current === 'playing' && e.code === 'KeyR') {
        e.preventDefault();
        handleRestart();
      } else if (screenStateRef.current === 'playing' && e.code === 'KeyM') {
        setMuted(engineRef.current?.audio.isMuted() ?? false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResume, handleRestart]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Isolated Canvas Mount */}
      <div ref={mountRef} className="fixed inset-0" />

      {screenState === 'title' && (
        <TitleScreen
          config={config}
          onChangeConfig={handleChangeConfig}
          onStartMatch={handleStartMatch}
        />
      )}

      {(screenState === 'playing' || screenState === 'paused') && (
        <GameHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={() => setScreenState('paused')}
          onRestart={handleRestart}
        />
      )}

      {screenState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {screenState === 'gameover' && matchResult && (
        <GameOverModal
          result={matchResult}
          onPlayAgain={() => handleStartMatch()}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </main>
  );
}
