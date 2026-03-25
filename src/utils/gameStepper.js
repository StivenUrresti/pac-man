/**
 * Pure game step function — zero React, zero setState.
 * Used by both the visual tick() and the fast-train batch loop.
 *
 * Takes the current game state, a Q-Learning interface, and mutable tick
 * counters for ghost speed staggering. Returns { nextState, stepReward, done }.
 */
import { TILE, REWARD, DIR_DELTA, POWER_DURATION, GHOST_TICK_INTERVAL, STUCK_THRESHOLD, MAX_STEPS_PER_EPISODE } from './constants.js';
import { encodeState } from './aiAgent.js';
import { ghostMove } from './ghostAI.js';

function nearestDotDist(grid, pos) {
  const rows = grid.length;
  const cols = grid[0].length;
  let best = Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === TILE.DOT || grid[r][c] === TILE.POWER_PELLET) {
        const d = Math.abs(pos.row - r) + Math.abs(pos.col - c);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

function findRespawn(grid, seed, pacmanPos) {
  const rows = grid.length;
  const cols = grid[0].length;
  const MIN_DIST_FROM_PACMAN = 5;

  // Prefer cells near the corner seed but at least MIN_DIST_FROM_PACMAN away
  let best = null;
  let bestScore = Infinity;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== TILE.WALL) {
        const fromSeed = Math.abs(r - seed.row) + Math.abs(c - seed.col);
        const fromPac  = Math.abs(r - pacmanPos.row) + Math.abs(c - pacmanPos.col);
        if (fromPac >= MIN_DIST_FROM_PACMAN && fromSeed < bestScore) {
          bestScore = fromSeed;
          best = { row: r, col: c };
        }
      }
    }
  }

  // Fallback: if whole grid is within MIN_DIST (tiny map), pick farthest from Pac-Man
  if (!best) {
    let farthest = seed;
    let maxDist = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== TILE.WALL) {
          const d = Math.abs(r - pacmanPos.row) + Math.abs(c - pacmanPos.col);
          if (d > maxDist) { maxDist = d; farthest = { row: r, col: c }; }
        }
      }
    }
    best = farthest;
  }

  return best;
}

export function stepOnce(state, ql, ghostTickCounters) {
  const { pacDir: prevPacDir } = state;
  const grid = state.grid.map(r => [...r]);
  let pacmanPos = { ...state.pacmanPos };
  let ghosts = state.ghosts.map(g => ({ ...g, pos: { ...g.pos } }));
  let { score, lives, powerTimer, hasPower, dotsLeft } = state;
  // Contadores para detectar loops (inicializan en 0 si el estado no los tiene)
  let stepsWithoutDot = (state.stepsWithoutDot ?? 0) + 1;
  let episodeSteps    = (state.episodeSteps ?? 0) + 1;
  let dead = false;
  let won = false;
  let stepReward = REWARD.STEP;

  const rows = grid.length;
  const cols = grid[0].length;

  // ── AI chooses action ──────────────────────────────────────────────────────
  const prevStateKey = encodeState(grid, pacmanPos, ghosts.map(g => g.pos), hasPower);
  const action = ql.chooseAction(grid, pacmanPos, ghosts.map(g => g.pos), hasPower, powerTimer, dotsLeft);

  // ── Reward shaping: distance to nearest dot before move ───────────────────
  const prevDotDist = hasPower ? Infinity : nearestDotDist(grid, pacmanPos);

  // ── Move Pac-Man ───────────────────────────────────────────────────────────
  const delta = DIR_DELTA[action];
  const newRow = pacmanPos.row + delta.row;
  const newCol = pacmanPos.col + delta.col;
  if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && grid[newRow][newCol] !== TILE.WALL) {
    pacmanPos = { row: newRow, col: newCol };
  }

  // ── Collect tile ───────────────────────────────────────────────────────────
  const tile = grid[pacmanPos.row][pacmanPos.col];
  if (tile === TILE.DOT) {
    grid[pacmanPos.row][pacmanPos.col] = TILE.EMPTY;
    score += REWARD.DOT;
    stepReward += REWARD.DOT;
    dotsLeft -= 1;
    stepsWithoutDot = 0; // comió punto → reset contador de loop
  } else if (tile === TILE.POWER_PELLET) {
    grid[pacmanPos.row][pacmanPos.col] = TILE.EMPTY;
    score += REWARD.POWER_PELLET;
    stepReward += REWARD.POWER_PELLET;
    dotsLeft -= 1;
    hasPower = true;
    powerTimer = POWER_DURATION;
    stepsWithoutDot = 0; // comió pellet → reset contador de loop
    ghosts = ghosts.map(g => ({ ...g, frightened: true, frightenTimer: POWER_DURATION }));
  }

  // Penalización por estar atascado sin comer (rompe loops aprendidos)
  if (!hasPower && stepsWithoutDot > STUCK_THRESHOLD) {
    stepReward += REWARD.STUCK;
  }

  // ── Reward shaping: closer-to-dot bonus ───────────────────────────────────
  if (!hasPower && prevDotDist < Infinity) {
    const newDotDist = nearestDotDist(grid, pacmanPos);
    if (newDotDist < prevDotDist) stepReward += REWARD.CLOSER_TO_DOT;
  }

  // ── Decrement power timer ──────────────────────────────────────────────────
  if (hasPower) {
    powerTimer -= 1;
    ghosts = ghosts.map(g => ({ ...g, frightenTimer: Math.max(0, (g.frightenTimer || 0) - 1) }));
    if (powerTimer <= 0) {
      hasPower = false;
      powerTimer = 0;
      ghosts = ghosts.map(g => ({ ...g, frightened: false, frightenTimer: 0 }));
    }
  }

  // ── Move ghosts via ghostAI (staggered speeds) ────────────────────────────
  ghosts = ghosts.map((ghost, i) => {
    ghostTickCounters[i] = (ghostTickCounters[i] || 0) + 1;
    const interval = GHOST_TICK_INTERVAL[i] ?? 2;
    if (ghostTickCounters[i] % interval !== 0) return ghost;

    const dir = ghostMove(ghost, i, grid, pacmanPos, action, ghost.frightened);
    if (!dir) return ghost;

    const d = DIR_DELTA[dir];
    const gr = ghost.pos.row + d.row;
    const gc = ghost.pos.col + d.col;
    if (gr >= 0 && gr < rows && gc >= 0 && gc < cols && grid[gr][gc] !== TILE.WALL) {
      return { ...ghost, pos: { row: gr, col: gc } };
    }
    return ghost;
  });

  // ── Collision detection ────────────────────────────────────────────────────
  const cornerSeeds = [
    { row: 1, col: 1 },
    { row: 1, col: cols - 2 },
    { row: rows - 2, col: 1 },
    { row: rows - 2, col: cols - 2 },
  ];
  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];
    if (ghost.pos.row === pacmanPos.row && ghost.pos.col === pacmanPos.col) {
      if (ghost.frightened) {
        score += REWARD.EAT_GHOST;
        stepReward += REWARD.EAT_GHOST;
          const respawn = findRespawn(grid, cornerSeeds[i % cornerSeeds.length], pacmanPos);
        // If power is still active the respawned ghost stays frightened
        ghosts[i] = { ...ghost, pos: respawn, frightened: hasPower, frightenTimer: hasPower ? powerTimer : 0 };
      } else {
        lives -= 1;
        stepReward += REWARD.DIE;
        dead = true;
      }
    }
  }

  // ── Win condition ──────────────────────────────────────────────────────────
  if (dotsLeft <= 0) {
    won = true;
    stepReward += REWARD.WIN;
  }

  // ── Terminar episodio si supera el límite de pasos (evita loops infinitos) ─
  const timeout = episodeSteps >= MAX_STEPS_PER_EPISODE;

  // ── Q-Learning update ──────────────────────────────────────────────────────
  const done = dead || won || timeout;
  ql.updateQ(prevStateKey, action, stepReward, grid, pacmanPos, ghosts.map(g => g.pos), hasPower, done);

  const nextState = {
    grid, pacmanPos, ghosts, score, lives,
    powerTimer, hasPower, dotsLeft, dead, won,
    pacDir: action,
    mouthOpen: !state.mouthOpen,
    stepsWithoutDot,
    episodeSteps,
  };

  return { nextState, stepReward, done };
}
