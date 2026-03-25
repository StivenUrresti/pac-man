import React from 'react';
import { GHOST_COLORS } from '../utils/constants.js';

function StatRow({ label, value, color = '#e2e8f0', glow }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
      <span className="text-slate-400 text-xs font-retro">{label}</span>
      <span
        className="font-retro text-sm tabular-nums"
        style={{ color, textShadow: glow ? `0 0 8px ${color}` : 'none' }}
      >
        {value}
      </span>
    </div>
  );
}

function LivesDisplay({ lives }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 20 20" opacity={i < lives ? 1 : 0.2}>
          <path
            d="M 10 10 L 20 7 A 10 10 0 1 1 20 13 Z"
            fill="#facc15"
            style={{ filter: i < lives ? 'drop-shadow(0 0 4px #facc15)' : 'none' }}
          />
        </svg>
      ))}
    </div>
  );
}

function EpsilonBar({ epsilon }) {
  const pct = Math.round(epsilon * 100);
  return (
    <div className="mt-1">
      <div className="flex justify-between mb-1">
        <span className="text-slate-400 text-xs font-retro">ε Explore</span>
        <span className="font-retro text-xs" style={{ color: '#818cf8' }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: '#1e1b4b' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
            boxShadow: '0 0 6px #6366f1',
          }}
        />
      </div>
    </div>
  );
}

function GhostLegend() {
  const names = ['Blinky', 'Clyde'];
  const tactics = ['Persecución directa', 'Emboscada + dispersión'];
  return (
    <div className="mt-2">
      <p className="text-slate-500 text-xs font-retro mb-2 uppercase tracking-widest">Fantasmas</p>
      <div className="flex flex-col gap-2">
        {GHOST_COLORS.slice(0, 2).map((color, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <div>
              <span className="text-xs font-retro" style={{ color }}>{names[i]}</span>
              <p className="text-slate-600 mt-0.5" style={{ fontSize: '9px', fontFamily: 'monospace' }}>
                {tactics[i]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardKey({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-xs font-retro" style={{ color }}>{value > 0 ? `+${value}` : value}</span>
    </div>
  );
}

function MapProgressBar({ current }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
      <span className="text-slate-400 text-xs font-retro">Intentos</span>
      <div className="flex items-center gap-2">
        <span className="font-retro text-sm tabular-nums" style={{ color: '#fb923c' }}>{current}</span>
        <span className="text-xs" style={{ color: '#334155', fontFamily: 'monospace' }}>mismo mapa</span>
      </div>
    </div>
  );
}

function SavedBadge({ hasSaved, episode }) {
  if (!hasSaved) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ background: '#052e16', border: '1px solid #16a34a' }}
    >
      <span style={{ fontSize: 10 }}>💾</span>
      <div>
        <span className="font-retro" style={{ color: '#34d399', fontSize: '7px' }}>
          GUARDADO
        </span>
        <p className="font-retro" style={{ color: '#4ade80', fontSize: '7px' }}>
          {episode} ep acumulados
        </p>
      </div>
    </div>
  );
}

export default function StatsPanel({ gameState, ql, phase, episodesOnCurrentMap }) {
  const { score, lives, dotsLeft, hasPower, powerTimer } = gameState;
  const episode = ql.getEpisode();
  const epsilon = ql.getEpsilon();
  const qtableSize = ql.getQTableSize();
  const mapEp = episodesOnCurrentMap?.current ?? 0;
  const hasSaved = ql.hasSavedData?.() ?? false;

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{
        background: 'linear-gradient(180deg, #0d0d1f 0%, #0a0a1a 100%)',
        border: '1px solid #1e1b4b',
        minWidth: 200,
      }}
    >
      {/* Saved badge */}
      {hasSaved && (
        <SavedBadge hasSaved={hasSaved} episode={episode} />
      )}

      {/* Score & Lives */}
      <div>
        <p className="text-slate-500 text-xs font-retro mb-2 uppercase tracking-widest">Juego</p>
        <StatRow label="Score" value={score.toLocaleString()} color="#facc15" glow />
        <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
          <span className="text-slate-400 text-xs font-retro">Vidas</span>
          <LivesDisplay lives={lives} />
        </div>
        <StatRow label="Puntos" value={dotsLeft} color="#e2e8f0" />
        {hasPower && (
          <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400 text-xs font-retro">Poder</span>
            <span className="font-retro text-xs animate-pulse"
              style={{ color: '#a855f7', textShadow: '0 0 8px #a855f7' }}>
              {powerTimer} ticks
            </span>
          </div>
        )}
      </div>

      {/* AI Stats */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-500 text-xs font-retro uppercase tracking-widest">IA · Q-Learning</p>
          {phase === 'exploitation' && (
            <span className="font-retro px-2 py-0.5 rounded"
              style={{ background: '#052e16', color: '#34d399', border: '1px solid #16a34a', fontSize: '7px' }}>
              EXPLOTANDO
            </span>
          )}
        </div>
        <StatRow label="Episodio" value={episode} color="#34d399" glow />
        <StatRow label="Q-States" value={qtableSize.toLocaleString()} color="#818cf8" />
        <EpsilonBar epsilon={epsilon} />
        <div className="mt-1">
          <MapProgressBar current={mapEp} />
        </div>
      </div>

      {/* Reward table */}
      <div>
        <p className="text-slate-500 text-xs font-retro mb-2 uppercase tracking-widest">Recompensas</p>
        <div className="flex flex-col gap-1">
          <RewardKey label="• Punto" value={10} color="#e2e8f0" />
          <RewardKey label="⬟ Poder" value={50} color="#a855f7" />
          <RewardKey label="♟ Comer fantasma" value={200} color="#34d399" />
          <RewardKey label="✕ Morir" value={-500} color="#f472b6" />
        </div>
      </div>

      <GhostLegend />
    </div>
  );
}
