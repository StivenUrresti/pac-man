// Tile types
export const TILE = {
  WALL: 0,
  DOT: 1,
  POWER_PELLET: 2,
  EMPTY: 3,
};

// Entity types (overlaid on tiles)
export const ENTITY = {
  NONE: 'none',
  PACMAN: 'pacman',
  GHOST: 'ghost',
};

// Directions
export const DIR = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
};

export const DIR_DELTA = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
};

export const ALL_DIRS = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];

// Grid dimensions (odd numbers so maze generation works cleanly)
export const ROWS = 13;
export const COLS = 13;

// Reward values (from project spec)
export const REWARD = {
  DOT: 10,
  POWER_PELLET: 50,
  EAT_GHOST: 200,
  DIE: -500,
  STEP: -1,
  WIN: 300,           // bonus mayor por completar el mapa
  CLOSER_TO_DOT: 2,   // shaping: recompensa neta positiva por acercarse (+2-1=+1)
  STUCK: -4,          // penalización por no comer puntos durante mucho tiempo
};

// Q-Learning hyperparameters
export const QL = {
  ALPHA: 0.2,         // learning rate
  GAMMA: 0.9,         // discount factor
  EPSILON_START: 0.9, // más exploración inicial (era 0.5)
  EPSILON_MIN: 0.05,  // minimum exploration rate
  EPSILON_DECAY: 0.997, // llega a 5% en ~960 episodios (era 0.92 → 35 episodios!)
};

// localStorage key for Q-table persistence
// v2: nuevo encoding de estado (incompatible con v1 — empieza limpio)
export const STORAGE_KEY = 'pacman-ia-v2';

// Pasos sin comer un punto antes de aplicar penalización STUCK
export const STUCK_THRESHOLD = 40;

// Límite de pasos por episodio (evita loops infinitos)
export const MAX_STEPS_PER_EPISODE = 600;

// Ghost colors
export const GHOST_COLORS = ['#f472b6', '#fb923c', '#34d399'];

// Cell size in pixels for rendering
export const CELL_SIZE = 36;

// Power pellet duration in ticks
export const POWER_DURATION = 50;

// The map NEVER changes automatically — only when the user clicks Reset.
// This lets Q-Learning truly converge on one environment.
export const MAX_EPISODES_PER_MAP = Infinity;

// Ghost move interval: ghost i moves every GHOST_TICK_INTERVAL[i] ticks
// Pac-Man always moves every tick, so these values make ghosts slower
export const GHOST_TICK_INTERVAL = [2, 3, 4];

// Number of ghosts
export const NUM_GHOSTS = 2;
