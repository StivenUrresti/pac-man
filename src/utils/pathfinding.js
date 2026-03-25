import { TILE, ALL_DIRS, DIR_DELTA } from './constants.js';

/**
 * BFS from `start` to `target` on the grid.
 * Returns the first direction to move, or null if unreachable.
 */
export function bfsDirection(grid, start, target) {
  if (start.row === target.row && start.col === target.col) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  visited[start.row][start.col] = true;

  // Queue items: { row, col, firstDir }
  const queue = [];

  for (const dir of ALL_DIRS) {
    const delta = DIR_DELTA[dir];
    const nr = start.row + delta.row;
    const nc = start.col + delta.col;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL && !visited[nr][nc]) {
      visited[nr][nc] = true;
      queue.push({ row: nr, col: nc, firstDir: dir });
    }
  }

  let head = 0;
  while (head < queue.length) {
    const { row, col, firstDir } = queue[head++];

    if (row === target.row && col === target.col) {
      return firstDir;
    }

    for (const dir of ALL_DIRS) {
      const delta = DIR_DELTA[dir];
      const nr = row + delta.row;
      const nc = col + delta.col;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc, firstDir });
      }
    }
  }

  return null; // unreachable
}

/**
 * BFS-based flee: returns the direction that maximizes distance from `threat`.
 * Scores each walkable neighbor by BFS distance from threat (higher = safer).
 */
export function fleeDirection(grid, pos, threat) {
  const rows = grid.length;
  const cols = grid[0].length;

  // Compute BFS distance from threat to all cells
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  dist[threat.row][threat.col] = 0;
  const queue = [{ row: threat.row, col: threat.col }];
  let head = 0;

  while (head < queue.length) {
    const { row, col } = queue[head++];
    for (const dir of ALL_DIRS) {
      const delta = DIR_DELTA[dir];
      const nr = row + delta.row;
      const nc = col + delta.col;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[row][col] + 1;
        queue.push({ row: nr, col: nc });
      }
    }
  }

  // Pick the neighbor direction with max distance from threat
  let bestDir = null;
  let bestDist = -1;

  for (const dir of ALL_DIRS) {
    const delta = DIR_DELTA[dir];
    const nr = pos.row + delta.row;
    const nc = pos.col + delta.col;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL) {
      const d = dist[nr][nc];
      if (d > bestDist) {
        bestDist = d;
        bestDir = dir;
      }
    }
  }

  return bestDir;
}

/**
 * Returns the Manhattan distance between two positions.
 */
export function manhattanDist(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * BFS distance between two points on the grid.
 */
export function bfsDist(grid, start, target) {
  if (start.row === target.row && start.col === target.col) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  visited[start.row][start.col] = true;

  const queue = [{ row: start.row, col: start.col, dist: 0 }];
  let head = 0;

  while (head < queue.length) {
    const { row, col, dist } = queue[head++];
    if (row === target.row && col === target.col) return dist;

    for (const dir of ALL_DIRS) {
      const delta = DIR_DELTA[dir];
      const nr = row + delta.row;
      const nc = col + delta.col;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc, dist: dist + 1 });
      }
    }
  }

  return Infinity;
}

/**
 * Finds the nearest cell of a given tile type from a position.
 * Returns { pos, dist } or null.
 */
export function nearestTile(grid, start, tileType) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  visited[start.row][start.col] = true;

  const queue = [{ row: start.row, col: start.col, dist: 0 }];
  let head = 0;

  while (head < queue.length) {
    const { row, col, dist } = queue[head++];
    if (grid[row][col] === tileType) return { pos: { row, col }, dist };

    for (const dir of ALL_DIRS) {
      const delta = DIR_DELTA[dir];
      const nr = row + delta.row;
      const nc = col + delta.col;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== TILE.WALL && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc, dist: dist + 1 });
      }
    }
  }

  return null;
}
