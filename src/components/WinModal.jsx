import React from 'react';

/**
 * Modal que aparece al ganar un mapa.
 * Muestra estadísticas de la victoria y el historial de aprendizaje.
 */

function NeonButton({ onClick, children, color = '#6366f1', variant = 'primary' }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 rounded-lg font-retro text-xs uppercase tracking-wider"
      style={{
        background: variant === 'primary' ? `${color}33` : 'transparent',
        border: `1px solid ${color}`,
        color,
        boxShadow: `0 0 12px ${color}66`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px ${color}99, 0 0 40px ${color}44`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 12px ${color}66`; }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, color = '#e2e8f0', sub }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-lg"
      style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}
    >
      <span className="font-retro text-xs" style={{ color: '#64748b' }}>{label}</span>
      <span className="font-retro text-xl tabular-nums" style={{ color, textShadow: `0 0 10px ${color}88` }}>
        {value}
      </span>
      {sub && <span className="font-retro" style={{ color: '#475569', fontSize: '9px' }}>{sub}</span>}
    </div>
  );
}

/**
 * Tabla de historial — muestra todas las victorias agrupadas.
 * Resalta la mejora en pasos a lo largo del tiempo.
 */
function WinHistoryTable({ history, showTitle = true }) {
  if (history.length === 0) return null;

  // Agrupa por mapNumber para mostrar tendencia por mapa
  const byMap = {};
  for (const r of history) {
    if (!byMap[r.mapNumber]) byMap[r.mapNumber] = [];
    byMap[r.mapNumber].push(r);
  }

  return (
    <div className="w-full">
      {showTitle && (
        <p className="font-retro text-xs mb-2 uppercase tracking-widest" style={{ color: '#475569' }}>
          Historial de victorias
        </p>
      )}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid #1e1b4b', maxHeight: 200, overflowY: 'auto' }}
      >
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d1f' }}>
              {['Mapa', 'Intento', 'Ep. Global', 'Pasos', 'Score'].map(h => (
                <th key={h} className="font-retro text-xs px-2 py-1.5 text-left"
                  style={{ color: '#475569', borderBottom: '1px solid #1e1b4b' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((r, i) => {
              // Calcular mejora respecto a primera victoria en este mapa
              const firstInMap = byMap[r.mapNumber][0];
              const isFirst = r === firstInMap;
              const improved = !isFirst && r.steps < firstInMap.steps;
              const pct = !isFirst
                ? Math.round(((firstInMap.steps - r.steps) / firstInMap.steps) * 100)
                : null;

              return (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? '#080812' : '#0a0a1a',
                    borderBottom: '1px solid #0f0f23',
                  }}
                >
                  <td className="font-retro text-xs px-2 py-1.5 tabular-nums"
                    style={{ color: '#facc15' }}>
                    #{r.mapNumber}
                  </td>
                  <td className="font-retro text-xs px-2 py-1.5 tabular-nums"
                    style={{ color: '#e2e8f0' }}>
                    {r.episodeOnMap}°
                  </td>
                  <td className="font-retro text-xs px-2 py-1.5 tabular-nums"
                    style={{ color: '#818cf8' }}>
                    {r.totalEpisode}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-retro text-xs tabular-nums"
                        style={{ color: improved ? '#34d399' : isFirst ? '#e2e8f0' : '#f472b6' }}>
                        {r.steps}
                      </span>
                      {pct !== null && (
                        <span className="font-retro" style={{
                          fontSize: '8px',
                          color: improved ? '#34d399' : '#f472b6',
                        }}>
                          {improved ? `↓${pct}%` : `↑${Math.abs(pct)}%`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-retro text-xs px-2 py-1.5 tabular-nums"
                    style={{ color: '#fb923c' }}>
                    {r.score.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Insight de aprendizaje */}
      <LearningInsight history={history} />
    </div>
  );
}

/**
 * Muestra una frase de análisis comparando primera victoria vs última en el mapa actual.
 */
function LearningInsight({ history }) {
  if (history.length < 2) return null;

  const lastMap = Math.max(...history.map(r => r.mapNumber));
  const lastMapWins = history.filter(r => r.mapNumber === lastMap);

  if (lastMapWins.length < 2) {
    // Compara entre mapas distintos
    const mapsWithWins = [...new Set(history.map(r => r.mapNumber))];
    if (mapsWithWins.length < 2) return null;

    const firstMap = mapsWithWins[0];
    const prevMapFirst = history.find(r => r.mapNumber === firstMap);
    const lastMapFirst = history.find(r => r.mapNumber === lastMap);
    if (!prevMapFirst || !lastMapFirst) return null;

    const diff = prevMapFirst.steps - lastMapFirst.steps;
    if (diff <= 0) return null;
    const pct = Math.round((diff / prevMapFirst.steps) * 100);

    return (
      <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: '#052e16', border: '1px solid #16a34a22' }}>
        <p className="font-retro" style={{ color: '#4ade80', fontSize: '9px' }}>
          El agente llegó al Mapa {lastMap} con experiencia previa — ganó {pct}% más rápido que la primera victoria del Mapa {firstMap}
        </p>
      </div>
    );
  }

  const first = lastMapWins[0];
  const latest = lastMapWins[lastMapWins.length - 1];
  const diff = first.steps - latest.steps;
  if (diff <= 0) return null;
  const pct = Math.round((diff / first.steps) * 100);

  return (
    <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: '#052e16', border: '1px solid #16a34a22' }}>
      <p className="font-retro" style={{ color: '#4ade80', fontSize: '9px' }}>
        Mapa {lastMap}: pasó de {first.steps} pasos → {latest.steps} pasos para ganar ({pct}% más eficiente)
      </p>
    </div>
  );
}

/**
 * Modal solo lectura: historial completo en cualquier momento (desde el header).
 * z-index 40 — el modal de victoria queda encima (50) si ambos pudieran coincidir.
 */
export function HistoryModal({ open, onClose, winHistory }) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 flex items-center justify-center z-40"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="flex flex-col gap-4 p-6 rounded-2xl w-full"
        style={{
          maxWidth: 520,
          background: 'linear-gradient(180deg, #0a0f1e 0%, #070b16 100%)',
          border: '1px solid #312e81',
          boxShadow: '0 0 60px #6366f120',
          margin: '0 16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex items-center gap-2"
            id="history-modal-title"
          >
            <span style={{ fontSize: 28 }}>🏆</span>
            <div>
              <h2 className="font-retro text-base" style={{ color: '#e2e8f0' }}>
                Historial de victorias
              </h2>
              <p className="font-retro text-xs mt-0.5" style={{ color: '#64748b' }}>
                {winHistory.length === 0
                  ? 'Las victorias aparecerán aquí al completar mapas'
                  : `${winHistory.length} victoria${winHistory.length === 1 ? '' : 's'} registrada${winHistory.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-retro text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{
              border: '1px solid #475569',
              color: '#94a3b8',
              background: 'transparent',
              cursor: 'pointer',
            }}
            aria-label="Cerrar historial"
          >
            Cerrar
          </button>
        </div>

        {winHistory.length === 0 ? (
          <p
            className="font-retro text-center py-8 px-4 rounded-lg"
            style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', color: '#64748b', fontSize: '11px' }}
          >
            Aún no hay victorias. Entrena al agente hasta que limpie el mapa para ver el primer registro.
          </p>
        ) : (
          <WinHistoryTable history={winHistory} showTitle={false} />
        )}
      </div>
    </div>
  );
}

export default function WinModal({ pendingWin, winHistory, onChangeMap, onContinue }) {
  if (!pendingWin) return null;

  const isNewMap  = pendingWin.mapNumber > 1;
  const mapWins   = winHistory.filter(r => r.mapNumber === pendingWin.mapNumber);
  const isFirstWin = mapWins.length === 1;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="flex flex-col gap-5 p-6 rounded-2xl w-full"
        style={{
          maxWidth: 520,
          background: 'linear-gradient(180deg, #0a0f1e 0%, #070b16 100%)',
          border: '1px solid #facc1544',
          boxShadow: '0 0 60px #facc1520, 0 0 120px #facc1510',
          margin: '0 16px',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <div style={{ fontSize: 36 }}>🏆</div>
          <h2 className="font-retro text-lg" style={{
            background: 'linear-gradient(90deg, #facc15, #fb923c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            MAPA {pendingWin.mapNumber} COMPLETADO
          </h2>
          <p className="font-retro text-xs" style={{ color: '#64748b' }}>
            {isFirstWin ? '¡Primera victoria en este mapa!' : `Victoria #${mapWins.length} en este mapa`}
          </p>
        </div>

        {/* Stats cards */}
        <div className="flex gap-3 justify-center">
          <StatCard label="Pasos" value={pendingWin.steps} color="#34d399" />
          <StatCard label="Episodio" value={pendingWin.totalEpisode} color="#818cf8" />
          <StatCard label="Score" value={pendingWin.score.toLocaleString()} color="#facc15" />
        </div>

        {/* Win history table */}
        <WinHistoryTable history={winHistory} />

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <NeonButton onClick={onChangeMap} color="#34d399" variant="primary">
            🗺 Nuevo Mapa
          </NeonButton>
          <NeonButton onClick={onContinue} color="#818cf8" variant="ghost">
            ↺ Mismo Mapa
          </NeonButton>
        </div>

        {/* Note about transfer learning */}
        <p className="text-center font-retro" style={{ color: '#334155', fontSize: '8px' }}>
          Al cambiar de mapa el agente conserva todo lo aprendido
        </p>
      </div>
    </div>
  );
}
