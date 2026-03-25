import { TILE, ALL_DIRS, DIR_DELTA, DIR } from './constants.js';
import { manhattanDist, bfsDirection, bfsDist, nearestTile } from './pathfinding.js';

/**
 * Encodes the current game state into a compact string key for the Q-table.
 *
 * Features encoded (v2 — mejorado):
 * - 4 bits : wall in each direction (U/D/L/R)
 * - 4 bits : food sensor — hay comida en los próximos 3 pasos en cada dirección?
 *            (rompe loops: el agente sabe qué dirección tiene puntos accesibles)
 * - 2 bits : distancia al fantasma más cercano (00=lejos>6, 01=medio 3-6, 10=cerca≤2)
 * - 2 bits : dirección del fantasma más cercano (arriba/izq quadrant)
 * - 1 bit  : has power
 * - 2 bits : dirección del punto más cercano (arriba/izq quadrant)
 * - 1 bit  : power pellet cerca (dist <= 5)
 *
 * Total: 16 bits → ~3000-8000 estados prácticos (antes sólo 632)
 */
export function encodeState(grid, pacmanPos, ghostPositions, hasPower) {
  const rows = grid.length;
  const cols = grid[0].length;

  // Wall bits (4 bits)
  const walls = ALL_DIRS.map(dir => {
    const d = DIR_DELTA[dir];
    const nr = pacmanPos.row + d.row;
    const nc = pacmanPos.col + d.col;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return 1;
    return grid[nr][nc] === TILE.WALL ? 1 : 0;
  });

  // Food sensor (4 bits): hay punto/pellet en los próximos 3 celdas transitables
  // Esta es la clave para romper loops — el agente sabe qué caminos tienen comida
  const food = ALL_DIRS.map(dir => {
    const d = DIR_DELTA[dir];
    for (let step = 1; step <= 3; step++) {
      const nr = pacmanPos.row + d.row * step;
      const nc = pacmanPos.col + d.col * step;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
      if (grid[nr][nc] === TILE.WALL) break;
      if (grid[nr][nc] === TILE.DOT || grid[nr][nc] === TILE.POWER_PELLET) return 1;
    }
    return 0;
  });

  // Nearest ghost
  let nearestGhost = null;
  let minGhostDist = Infinity;
  for (const g of ghostPositions) {
    const d = manhattanDist(pacmanPos, g);
    if (d < minGhostDist) { minGhostDist = d; nearestGhost = g; }
  }

  // Ghost distance: 2 bits con más resolución (antes era 1 bit)
  let ghostDist;
  if (minGhostDist <= 2)      ghostDist = '10'; // muy cerca — PELIGRO
  else if (minGhostDist <= 6) ghostDist = '01'; // distancia media
  else                        ghostDist = '00'; // lejos — seguro

  const ghostUp   = nearestGhost && nearestGhost.row < pacmanPos.row ? 1 : 0;
  const ghostLeft = nearestGhost && nearestGhost.col < pacmanPos.col ? 1 : 0;

  // Nearest dot AND nearest power pellet
  let nearestDot = null;
  let minDotDist = Infinity;
  let nearestPellet = null;
  let minPelletDist = Infinity;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = grid[r][c];
      if (tile === TILE.DOT || tile === TILE.POWER_PELLET) {
        const d = manhattanDist(pacmanPos, { row: r, col: c });
        if (d < minDotDist) { minDotDist = d; nearestDot = { row: r, col: c }; }
      }
      if (tile === TILE.POWER_PELLET) {
        const d = manhattanDist(pacmanPos, { row: r, col: c });
        if (d < minPelletDist) { minPelletDist = d; nearestPellet = { row: r, col: c }; }
      }
    }
  }

  // When powered, target = nearest ghost; otherwise target = nearest dot
  const target  = hasPower ? nearestGhost : nearestDot;
  const dotUp   = target && target.row < pacmanPos.row ? 1 : 0;
  const dotLeft = target && target.col < pacmanPos.col ? 1 : 0;

  const power       = hasPower ? 1 : 0;
  const pelletClose = (!hasPower && nearestPellet && minPelletDist <= 5) ? 1 : 0;

  return `${walls[0]}${walls[1]}${walls[2]}${walls[3]}_${food[0]}${food[1]}${food[2]}${food[3]}_${ghostDist}${ghostUp}${ghostLeft}_${power}_${dotUp}${dotLeft}_${pelletClose}`;
}

/**
 * Returns all valid (non-wall) directions from a position.
 */
export function validDirections(grid, pos) {
  const rows = grid.length;
  const cols = grid[0].length;
  return ALL_DIRS.filter(dir => {
    const d = DIR_DELTA[dir];
    const nr = pos.row + d.row;
    const nc = pos.col + d.col;
    return nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL;
  });
}

/**
 * Applies a direction to a position. Returns new position (clamped to grid).
 */
export function applyDirection(pos, dir, rows, cols) {
  const d = DIR_DELTA[dir];
  const nr = Math.max(0, Math.min(rows - 1, pos.row + d.row));
  const nc = Math.max(0, Math.min(cols - 1, pos.col + d.col));
  return { row: nr, col: nc };
}

// Ticks remaining below which Pac-Man should flee instead of chasing
const POWER_DANGER_THRESHOLD = 12;

// Puntos restantes por debajo de los cuales siempre priorizar comida sobre fantasmas
const FEW_DOTS_THRESHOLD = 8;

/**
 * Heuristic fallback action:
 * - Si tiene poder Y quedan pocos puntos (≤8): ir por comida para ganar
 * - Si tiene poder Y la comida está más cerca que el fantasma (BFS): ir por comida
 * - Si tiene poder con tiempo: perseguir fantasma
 * - Si tiene poder pero el timer es bajo (≤12): huir
 * - Sin poder y fantasma cerca (≤3): huir
 * - Por defecto: BFS hacia el punto más cercano
 *
 * @param {number} dotsLeft - puntos restantes en el mapa (default Infinity = desconocido)
 */
export function heuristicAction(grid, pacmanPos, ghostPositions, hasPower, powerTimer = 0, dotsLeft = Infinity) {
  const valid = validDirections(grid, pacmanPos);
  if (valid.length === 0) return DIR.UP;

  // Find nearest ghost (Manhattan para rapidez)
  let nearestGhost = null;
  let minGhostDist = Infinity;
  for (const g of ghostPositions) {
    const d = manhattanDist(pacmanPos, g);
    if (d < minGhostDist) { minGhostDist = d; nearestGhost = g; }
  }

  // ── POWERED but timer running out → flee before ghosts turn dangerous ─────
  if (hasPower && powerTimer <= POWER_DANGER_THRESHOLD) {
    if (nearestGhost) {
      let bestDir = valid[0];
      let bestDist = -1;
      for (const dir of valid) {
        const d = DIR_DELTA[dir];
        const nr = pacmanPos.row + d.row;
        const nc = pacmanPos.col + d.col;
        const dist = manhattanDist({ row: nr, col: nc }, nearestGhost);
        if (dist > bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }
  }

  // ── POWERED with time to spare ────────────────────────────────────────────
  if (hasPower) {
    // Encontrar la comida más cercana por BFS real (respeta paredes)
    const dotResult    = nearestTile(grid, pacmanPos, TILE.DOT);
    const pelletResult = nearestTile(grid, pacmanPos, TILE.POWER_PELLET);
    const foodResult   = (!dotResult) ? pelletResult
                       : (!pelletResult) ? dotResult
                       : (dotResult.dist <= pelletResult.dist ? dotResult : pelletResult);

    // Distancia BFS al fantasma más cercano
    const ghostBfsDist = nearestGhost ? bfsDist(grid, pacmanPos, nearestGhost) : Infinity;
    const foodBfsDist  = foodResult ? foodResult.dist : Infinity;

    // Priorizar comida si:
    //   1. Quedan pocos puntos → ir a ganar en lugar de perder tiempo con fantasmas
    //   2. La comida está igual o más cerca que el fantasma → evita loops en esquinas
    const preferFood = foodResult && (
      dotsLeft <= FEW_DOTS_THRESHOLD ||
      foodBfsDist <= ghostBfsDist
    );

    if (preferFood) {
      const dir = bfsDirection(grid, pacmanPos, foodResult.pos);
      if (dir && valid.includes(dir)) return dir;
    }

    // Chase nearest ghost via BFS
    if (nearestGhost) {
      const bfsDir = bfsDirection(grid, pacmanPos, nearestGhost);
      if (bfsDir && valid.includes(bfsDir)) return bfsDir;
    }
  }

  // ── Sin poder: huir si fantasma muy cerca ────────────────────────────────
  if (!hasPower && nearestGhost && minGhostDist <= 3) {
    let bestDir = valid[0];
    let bestDist = -1;
    for (const dir of valid) {
      const d = DIR_DELTA[dir];
      const nr = pacmanPos.row + d.row;
      const nc = pacmanPos.col + d.col;
      const dist = manhattanDist({ row: nr, col: nc }, nearestGhost);
      if (dist > bestDist) { bestDist = dist; bestDir = dir; }
    }
    return bestDir;
  }

  // ── Por defecto: BFS hacia el punto más cercano ───────────────────────────
  const dotResult    = nearestTile(grid, pacmanPos, TILE.DOT);
  const pelletResult = nearestTile(grid, pacmanPos, TILE.POWER_PELLET);
  const foodResult   = (!dotResult) ? pelletResult
                     : (!pelletResult) ? dotResult
                     : (dotResult.dist <= pelletResult.dist ? dotResult : pelletResult);

  if (foodResult) {
    const bfsDir = bfsDirection(grid, pacmanPos, foodResult.pos);
    if (bfsDir && valid.includes(bfsDir)) return bfsDir;
  }

  return valid[Math.floor(Math.random() * valid.length)];
}
