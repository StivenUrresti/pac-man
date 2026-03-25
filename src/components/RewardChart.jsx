import React, { useMemo } from 'react';

const WIDTH = 280;
const HEIGHT = 110;
const PAD = { top: 12, right: 12, bottom: 24, left: 40 };
const INNER_W = WIDTH - PAD.left - PAD.right;
const INNER_H = HEIGHT - PAD.top - PAD.bottom;

export default function RewardChart({ episodeRewards }) {
  const data = episodeRewards.slice(-50);

  const { points, minVal, maxVal, avgVal, yTicks } = useMemo(() => {
    if (data.length === 0) return { points: '', minVal: 0, maxVal: 0, avgVal: 0, yTicks: [] };

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const avgVal = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
    const range = maxVal - minVal || 1;

    const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * INNER_W;
    const toY = (v) => PAD.top + INNER_H - ((v - minVal) / range) * INNER_H;

    const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

    // Area fill
    const firstX = toX(0);
    const lastX = toX(data.length - 1);
    const bottomY = PAD.top + INNER_H;
    const areaPoints = `${firstX},${bottomY} ${pts} ${lastX},${bottomY}`;

    // Y-axis ticks (3 levels)
    const yTicks = [minVal, avgVal, maxVal];

    return { points: pts, areaPoints, minVal, maxVal, avgVal, yTicks, toY, toX };
  }, [data]);

  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * INNER_W;
  const toY = (v) => {
    const range = maxVal - minVal || 1;
    return PAD.top + INNER_H - ((v - minVal) / range) * INNER_H;
  };
  const areaPoints = data.length > 0
    ? `${toX(0)},${PAD.top + INNER_H} ${data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} ${toX(data.length - 1)},${PAD.top + INNER_H}`
    : '';

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'linear-gradient(180deg, #0d0d1f 0%, #0a0a1a 100%)',
        border: '1px solid #1e1b4b',
      }}
    >
      <p className="text-slate-500 text-xs font-retro mb-2 uppercase tracking-widest">
        Recompensa por Episodio
      </p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: HEIGHT }}>
          <span className="text-slate-600 text-xs font-retro">Sin datos aún…</span>
        </div>
      ) : (
        <svg width={WIDTH} height={HEIGHT} className="overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={toY(tick)}
                x2={PAD.left + INNER_W}
                y2={toY(tick)}
                stroke="#1e1b4b"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <text
                x={PAD.left - 4}
                y={toY(tick) + 4}
                textAnchor="end"
                fontSize="8"
                fill="#475569"
                fontFamily="monospace"
              >
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          ))}

          {/* Area fill */}
          {data.length > 1 && (
            <polygon points={areaPoints} fill="url(#chartGrad)" />
          )}

          {/* Line */}
          {data.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 3px #6366f1)' }}
            />
          )}

          {/* Last point dot */}
          {data.length > 0 && (
            <circle
              cx={toX(data.length - 1)}
              cy={toY(data[data.length - 1])}
              r="3"
              fill="#a78bfa"
              style={{ filter: 'drop-shadow(0 0 4px #a78bfa)' }}
            />
          )}

          {/* X-axis label */}
          <text
            x={PAD.left + INNER_W / 2}
            y={HEIGHT - 4}
            textAnchor="middle"
            fontSize="7"
            fill="#334155"
            fontFamily="monospace"
          >
            {data.length} episodio{data.length !== 1 ? 's' : ''}
          </text>

          {/* Avg label */}
          {data.length > 1 && (
            <text
              x={PAD.left + INNER_W + 2}
              y={toY(avgVal) + 3}
              fontSize="7"
              fill="#6366f1"
              fontFamily="monospace"
            >
              avg
            </text>
          )}
        </svg>
      )}

      {/* Summary stats */}
      {data.length > 0 && (
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs font-retro" style={{ color: '#f472b6' }}>
            min {minVal}
          </span>
          <span className="text-xs font-retro" style={{ color: '#818cf8' }}>
            avg {avgVal}
          </span>
          <span className="text-xs font-retro" style={{ color: '#34d399' }}>
            max {maxVal}
          </span>
        </div>
      )}
    </div>
  );
}
