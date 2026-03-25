import { TILE, ROWS, COLS, NUM_GHOSTS } from './constants.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a random maze using recursive backtracking.
 * Works on odd-sized grids. Walls are even indices, passages are odd.
 */
function generateMaze(rows, cols) {
  // Start with all walls
  const grid = Array.from({ length: rows }, () => Array(cols).fill(TILE.WALL));

  // Recursive backtracker — carves passages from odd-coordinate cells
  function carve(r, c) {
    const directions = shuffle([
      [-2, 0], [2, 0], [0, -2], [0, 2],
    ]);
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === TILE.WALL) {
        // Carve the wall between current and neighbor
        grid[r + dr / 2][c + dc / 2] = TILE.EMPTY;
        grid[nr][nc] = TILE.EMPTY;
        carve(nr, nc);
      }
    }
  }

  // Start from (1,1)
  grid[1][1] = TILE.EMPTY;
  carve(1, 1);

  // Open up some extra passages to make it less tree-like and more Pac-Man-ish
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === TILE.WALL && Math.random() < 0.12) {
        // Only open if it won't isolate anything — simple random opening
        grid[r][c] = TILE.EMPTY;
      }
    }
  }

  return grid;
}

/**
 * Returns all empty cell positions as [{row, col}]
 */
function getEmptyCells(grid) {
  const cells = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== TILE.WALL) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/**
 * Picks a random item from an array, optionally excluding positions close to `exclude`.
 */
function pickRandom(cells, exclude = [], minDist = 3) {
  const filtered = cells.filter(({ row, col }) =>
    !exclude.some(e => Math.abs(e.row - row) + Math.abs(e.col - col) < minDist)
  );
  const pool = filtered.length > 0 ? filtered : cells;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Main map generator.
 * Returns { grid, pacmanPos, ghostPositions }
 * grid values: TILE.WALL | TILE.DOT | TILE.POWER_PELLET | TILE.EMPTY
 */
export function generateMap() {
  const grid = generateMaze(ROWS, COLS);
  const emptyCells = getEmptyCells(grid);

  // Place dots on all empty cells
  for (const { row, col } of emptyCells) {
    grid[row][col] = TILE.DOT;
  }

  // Place 4 power pellets near corners (first empty cell near each corner)
  const cornerSeeds = [
    { row: 1, col: 1 },
    { row: 1, col: COLS - 2 },
    { row: ROWS - 2, col: 1 },
    { row: ROWS - 2, col: COLS - 2 },
  ];

  const pelletPositions = [];
  for (const seed of cornerSeeds) {
    // Find nearest empty cell to corner seed
    let best = null;
    let bestDist = Infinity;
    for (const cell of emptyCells) {
      const d = Math.abs(cell.row - seed.row) + Math.abs(cell.col - seed.col);
      if (d < bestDist) { bestDist = d; best = cell; }
    }
    if (best) {
      grid[best.row][best.col] = TILE.POWER_PELLET;
      pelletPositions.push(best);
    }
  }

  // Place Pac-Man at center area
  const centerSeed = { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
  let pacmanPos = null;
  let bestDist = Infinity;
  for (const cell of emptyCells) {
    const d = Math.abs(cell.row - centerSeed.row) + Math.abs(cell.col - centerSeed.col);
    if (d < bestDist) { bestDist = d; pacmanPos = cell; }
  }
  // Make Pac-Man's starting cell empty (no dot under him initially)
  grid[pacmanPos.row][pacmanPos.col] = TILE.EMPTY;

  // Place ghosts far from Pac-Man
  const ghostPositions = [];
  for (let i = 0; i < NUM_GHOSTS; i++) {
    const pos = pickRandom(emptyCells, [pacmanPos, ...ghostPositions], 5);
    ghostPositions.push({ ...pos });
    // Ghosts don't consume dots
  }

  return {
    grid,
    pacmanPos: { ...pacmanPos },
    ghostPositions,
  };
}

export function countDots(grid) {
  let count = 0;
  for (const row of grid) {
    for (const tile of row) {
      if (tile === TILE.DOT || tile === TILE.POWER_PELLET) count++;
    }
  }
  return count;
}
