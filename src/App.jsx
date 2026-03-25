import React from 'react';
import { useGameLoop } from './hooks/useGameLoop.js';
import GameBoard from './components/GameBoard.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import RewardChart from './components/RewardChart.jsx';
import WinModal from './components/WinModal.jsx';

function Header({ episode, isRunning, phase, mapNumber, winCount }) {
  const isExploiting = phase === 'exploitation';
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ filter: 'drop-shadow(0 0 8px #facc15)' }}>
          <circle cx="16" cy="16" r="14" fill="#facc15" />
          <path d="M16 16 L30 11 A14 14 0 0 1 30 21 Z" fill="#0a0a1a" />
          <circle cx="16" cy="9" r="2.5" fill="#0a0a1a" />
        </svg>
        <div>
          <h1
            className="font-retro text-base leading-tight"
            style={{
              background: 'linear-gradient(90deg, #facc15, #fb923c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px #facc1580)',
            }}
          >
            PAC-MAN IA
          </h1>
          <p className="text-slate-500 text-xs font-retro mt-0.5">Aprendizaje por Refuerzo</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Phase badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: isExploiting ? '#052e16' : '#0d0d1f',
            border: `1px solid ${isExploiting ? '#16a34a' : '#312e81'}`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isRunning ? (isExploiting ? '#34d399' : '#818cf8') : '#475569',
              boxShadow: isRunning ? `0 0 8px ${isExploiting ? '#34d399' : '#818cf8'}` : 'none',
            }}
          />
          <span
            className="text-xs font-retro"
            style={{ color: isRunning ? (isExploiting ? '#34d399' : '#818cf8') : '#475569' }}
          >
            {!isRunning ? 'PAUSADO' : isExploiting ? 'EXPLOTANDO' : 'ENTRENANDO'}
          </span>
        </div>

        {/* Map badge */}
        <div
          className="px-3 py-1.5 rounded-lg font-retro text-xs"
          style={{ background: '#0d0d1f', border: '1px solid #92400e', color: '#fb923c' }}
        >
          MAPA {mapNumber}
        </div>

        {/* Episode badge */}
        <div
          className="px-3 py-1.5 rounded-lg font-retro text-xs"
          style={{ background: '#0d0d1f', border: '1px solid #312e81', color: '#818cf8' }}
        >
          EP {episode}
        </div>

        {/* Win count badge */}
        {winCount > 0 && (
          <div
            className="px-3 py-1.5 rounded-lg font-retro text-xs"
            style={{ background: '#0d0d1f', border: '1px solid #a16207', color: '#facc15' }}
          >
            🏆 {winCount}
          </div>
        )}
      </div>
    </header>
  );
}

function ExploitationBanner({ episode, onDismiss }) {
  return (
    <div
      className="w-full max-w-5xl rounded-xl px-6 py-4 flex items-center justify-between gap-4"
      style={{
        background: 'linear-gradient(90deg, #052e16 0%, #064e3b 50%, #052e16 100%)',
        border: '1px solid #16a34a',
        boxShadow: '0 0 30px #16a34a30',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 22 }}>🎓</span>
        <div>
          <p className="font-retro text-xs" style={{ color: '#34d399' }}>
            ENTRENAMIENTO COMPLETO — EP {episode}
          </p>
          <p className="text-slate-400 mt-1" style={{ fontSize: 10, fontFamily: 'monospace' }}>
            ε = 5% · El agente ya no explora — ahora aplica todo lo aprendido
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="font-retro text-xs px-3 py-1.5 rounded-lg"
        style={{ border: '1px solid #16a34a', color: '#34d399', background: 'transparent', cursor: 'pointer' }}
      >
        OK
      </button>
    </div>
  );
}

export default function App() {
  const {
    gameState,
    isRunning,
    isFastTraining,
    fastProgress,
    speed,
    setSpeed,
    episodeRewards,
    play,
    pause,
    reset,
    fastTrain,
    ql,
    phase,
    episodesOnCurrentMap,
    maxEpisodesPerMap,
    winHistory,
    pendingWin,
    changeMap,
    continueAfterWin,
    mapNumber,
  } = useGameLoop();

  const episode = ql.getEpisode();
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  // Re-show banner if phase goes back to training (after reset)
  React.useEffect(() => {
    if (phase === 'training') setBannerDismissed(false);
  }, [phase]);

  const showBanner = phase === 'exploitation' && !bannerDismissed;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0a0a1a' }}>
      <Header
        episode={episode}
        isRunning={isRunning}
        phase={phase}
        mapNumber={mapNumber.current}
        winCount={winHistory.length}
      />

      {/* Modal de victoria */}
      <WinModal
        pendingWin={pendingWin}
        winHistory={winHistory}
        onChangeMap={changeMap}
        onContinue={continueAfterWin}
      />

      {/* Exploitation banner */}
      {showBanner && (
        <div className="px-4">
          <ExploitationBanner episode={episode} onDismiss={() => setBannerDismissed(true)} />
        </div>
      )}

      {/* Main: 3 columnas — controles | tablero | métricas */}
      <main className="flex-1 min-h-0 flex gap-4 px-6 pb-4 overflow-hidden justify-center items-start pt-3">

        {/* ── Columna izquierda: controles ────────────────────────────── */}
        <div className="flex flex-col gap-3 flex-shrink-0 overflow-y-auto overflow-x-hidden h-full py-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1b4b transparent' }}>
          <ControlPanel
            isRunning={isRunning}
            isFastTraining={isFastTraining}
            fastProgress={fastProgress}
            play={play}
            pause={pause}
            reset={reset}
            fastTrain={fastTrain}
            speed={speed}
            setSpeed={setSpeed}
          />
          <p className="text-slate-700 text-xs font-retro text-center pt-1">
            Q-Learning · α=0.2 · γ=0.9 · ε→0.05
          </p>
        </div>

        {/* ── Columna central: tablero ─────────────────────────────────── */}
        <div className="flex items-start justify-center flex-shrink-0">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: `1px solid ${phase === 'exploitation' ? '#16a34a44' : '#1e1b4b'}`,
              boxShadow: phase === 'exploitation'
                ? '0 0 40px #16a34a20, 0 0 80px #16a34a08'
                : '0 0 40px #6366f120, 0 0 80px #6366f108',
            }}
          >
            <GameBoard gameState={gameState} />
          </div>
        </div>

        {/* ── Columna derecha: métricas y stats ───────────────────────── */}
        <div className="flex flex-col gap-3 w-[260px] flex-shrink-0 overflow-y-auto h-full py-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1b4b transparent' }}>
          <StatsPanel
            gameState={gameState}
            ql={ql}
            phase={phase}
            episodesOnCurrentMap={episodesOnCurrentMap}
            maxEpisodesPerMap={maxEpisodesPerMap}
          />
          <RewardChart episodeRewards={episodeRewards} phase={phase} />
        </div>

      </main>
    </div>
  );
}
