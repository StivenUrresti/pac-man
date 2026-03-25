import React, { useMemo } from 'react';
import { TILE, GHOST_COLORS, CELL_SIZE } from '../utils/constants.js';

function WallCell() {
  return (
    <div
      className="absolute inset-0 rounded-sm"
      style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
        boxShadow: 'inset 0 0 6px rgba(99,102,241,0.8)',
      }}
    />
  );
}

function DotCell() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: '#e2e8f0', boxShadow: '0 0 3px #e2e8f0' }}
      />
    </div>
  );
}

function PowerPelletCell({ tick }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-3 h-3 rounded-full animate-pulse"
        style={{
          background: '#a855f7',
          boxShadow: '0 0 10px #a855f7, 0 0 20px #7c3aed',
        }}
      />
    </div>
  );
}

function PacManCell({ dir, mouthOpen }) {
  // Rotation angle based on direction
  const rotations = { RIGHT: 0, DOWN: 90, LEFT: 180, UP: 270 };
  const rotation = rotations[dir] || 0;
  const mouthAngle = mouthOpen ? 40 : 5;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        width={CELL_SIZE - 4}
        height={CELL_SIZE - 4}
        viewBox="0 0 20 20"
        style={{
          transform: `rotate(${rotation}deg)`,
          filter: 'drop-shadow(0 0 6px #facc15)',
          transition: 'transform 0.05s linear',
        }}
      >
        <path
          d={`M 10 10 L ${10 + 10 * Math.cos((mouthAngle * Math.PI) / 180)} ${10 - 10 * Math.sin((mouthAngle * Math.PI) / 180)} A 10 10 0 1 1 ${10 + 10 * Math.cos((mouthAngle * Math.PI) / 180)} ${10 + 10 * Math.sin((mouthAngle * Math.PI) / 180)} Z`}
          fill="#facc15"
        />
      </svg>
    </div>
  );
}

function GhostCell({ color, frightened, frightenTimer }) {
  const isFlashing = frightened && frightenTimer <= 8;
  const displayColor = frightened
    ? (isFlashing && Math.floor(Date.now() / 300) % 2 === 0 ? '#ffffff' : '#60a5fa')
    : color;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        width={CELL_SIZE - 4}
        height={CELL_SIZE - 4}
        viewBox="0 0 20 22"
        style={{
          filter: `drop-shadow(0 0 5px ${displayColor})`,
          transition: 'filter 0.1s',
        }}
      >
        {/* Body */}
        <path
          d="M2 22 L2 10 A8 8 0 0 1 18 10 L18 22 L15 19 L12 22 L9 19 L6 22 Z"
          fill={displayColor}
        />
        {/* Eyes */}
        {!frightened && (
          <>
            <circle cx="7" cy="10" r="2.5" fill="white" />
            <circle cx="13" cy="10" r="2.5" fill="white" />
            <circle cx="7.5" cy="10.5" r="1.2" fill="#1e1b4b" />
            <circle cx="13.5" cy="10.5" r="1.2" fill="#1e1b4b" />
          </>
        )}
        {frightened && (
          <>
            <circle cx="7" cy="10" r="2" fill="white" opacity="0.6" />
            <circle cx="13" cy="10" r="2" fill="white" opacity="0.6" />
            {/* Frightened squiggly mouth */}
            <path d="M5 14 Q7 12 9 14 Q11 16 13 14 Q15 12 17 14" stroke="white" strokeWidth="1.2" fill="none" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function GameBoard({ gameState }) {
  const { grid, pacmanPos, ghosts, pacDir, mouthOpen, dead, won } = gameState;

  // Build a lookup: "row-col" → ghost info
  const ghostMap = useMemo(() => {
    const map = {};
    ghosts.forEach((g, i) => {
      map[`${g.pos.row}-${g.pos.col}`] = { ...g, color: GHOST_COLORS[i] };
    });
    return map;
  }, [ghosts]);

  const isPacman = (r, c) => pacmanPos.row === r && pacmanPos.col === c;

  const gridWidth = grid[0]?.length ?? 21;
  const gridHeight = grid.length ?? 21;

  return (
    <div className="relative select-none" style={{ width: gridWidth * CELL_SIZE, height: gridHeight * CELL_SIZE }}>
      {/* Overlay for dead/won */}
      {(dead || won) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg gap-3"
          style={{ background: 'rgba(10,10,26,0.82)', backdropFilter: 'blur(3px)' }}>
          <span
            className="font-retro text-base"
            style={{ color: dead ? '#f472b6' : '#34d399', textShadow: dead ? '0 0 24px #f472b6' : '0 0 24px #34d399' }}
          >
            {dead ? '💀 MUERTO' : '✓ MAPA DOMINADO'}
          </span>
          {won && (
            <span className="font-retro text-xs" style={{ color: '#a855f7', textShadow: '0 0 10px #a855f7' }}>
              Nuevo mapa en camino...
            </span>
          )}
          {dead && (
            <span className="font-retro text-xs" style={{ color: '#64748b' }}>
              Reiniciando episodio...
            </span>
          )}
        </div>
      )}

      {grid.map((row, r) =>
        row.map((tile, c) => {
          const key = `${r}-${c}`;
          const ghost = ghostMap[key];
          const isPac = isPacman(r, c);

          return (
            <div
              key={key}
              className="absolute"
              style={{
                left: c * CELL_SIZE,
                top: r * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            >
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{ background: tile === TILE.WALL ? 'transparent' : '#0f0f1f' }}
              />

              {/* Tile content */}
              {tile === TILE.WALL && <WallCell />}
              {tile === TILE.DOT && <DotCell />}
              {tile === TILE.POWER_PELLET && <PowerPelletCell />}

              {/* Ghost (rendered above tile) */}
              {ghost && (
                <GhostCell
                  color={ghost.color}
                  frightened={ghost.frightened}
                  frightenTimer={ghost.frightenTimer}
                />
              )}

              {/* Pac-Man (rendered above everything) */}
              {isPac && !dead && (
                <PacManCell dir={pacDir} mouthOpen={mouthOpen} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
