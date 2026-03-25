import { ROWS, COLS, DIR_DELTA } from './constants.js';
import { bfsDirection, fleeDirection, manhattanDist } from './pathfinding.js';

/**
 * Computes the next move direction for a ghost.
 *
 * Ghost 0 — Blinky (pink):
 *   Direct BFS chase. Always targets Pac-Man's current position.
 *
 * Ghost 1 — Clyde (orange):
 *   Ambush mode: targets 4 cells ahead of Pac-Man in his current direction.
 *   Scatter mode: when within 4 cells of Pac-Man, retreats to bottom-right corner
 *   to avoid overlapping with Blinky and create a pincer pattern.
 *
 * Both switch to flee (BFS away from Pac-Man) when frightened.
 */
export function ghostMove(ghost, index, grid, pacmanPos, pacDir, frightened) {
  if (frightened) {
    return fleeDirection(grid, ghost.pos, pacmanPos);
  }

  if (index === 0) {
    // Blinky: direct optimal chase
    return bfsDirection(grid, ghost.pos, pacmanPos);
  }

  if (index === 1) {
    const dist = manhattanDist(ghost.pos, pacmanPos);

    // Scatter: when too close, retreat to corner so Blinky and Clyde
    // don't stack on top of each other (creates pincering naturally)
    if (dist <= 4) {
      const corner = { row: ROWS - 2, col: COLS - 2 };
      const scatterDir = bfsDirection(grid, ghost.pos, corner);
      return scatterDir ?? bfsDirection(grid, ghost.pos, pacmanPos);
    }

    // Ambush: target 4 cells ahead of Pac-Man's facing direction
    const delta = DIR_DELTA[pacDir] ?? { row: 0, col: 1 };
    const target = {
      row: Math.max(0, Math.min(ROWS - 1, pacmanPos.row + delta.row * 4)),
      col: Math.max(0, Math.min(COLS - 1, pacmanPos.col + delta.col * 4)),
    };
    const ambushDir = bfsDirection(grid, ghost.pos, target);
    // Fallback to direct chase if ambush target is unreachable
    return ambushDir ?? bfsDirection(grid, ghost.pos, pacmanPos);
  }

  // Fallback for any additional ghosts
  return bfsDirection(grid, ghost.pos, pacmanPos);
}
