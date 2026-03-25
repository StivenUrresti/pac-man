import { useRef } from 'react';
import { QL, STORAGE_KEY } from '../utils/constants.js';
import { encodeState, validDirections, heuristicAction } from '../utils/aiAgent.js';

// ── localStorage helpers ───────────────────────────────────────────────────
function saveToStorage(qTable, epsilon, episodeCount) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ qTable, epsilon, episodeCount }));
  } catch (_) {
    // ignore quota errors
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw); // { qTable, epsilon, episodeCount }
  } catch (_) {
    return null;
  }
}

export function useQLearning() {
  // Try to restore a previously saved Q-table on mount
  const saved = useRef(loadFromStorage());

  const qTable = useRef(saved.current?.qTable ?? {});
  const epsilon = useRef(
    saved.current?.epsilon != null
      ? saved.current.epsilon
      : QL.EPSILON_START
  );
  const episodeCount = useRef(saved.current?.episodeCount ?? 0);

  function getQValues(stateKey) {
    if (!qTable.current[stateKey]) {
      qTable.current[stateKey] = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 };
    }
    return qTable.current[stateKey];
  }

  /**
   * Epsilon-greedy action selection.
   * When powered: heuristic que balancea entre comida y fantasmas según contexto.
   *
   * @param {number} dotsLeft - puntos restantes (para decidir si priorizar comida)
   */
  function chooseAction(grid, pacmanPos, ghostPositions, hasPower, powerTimer = 0, dotsLeft = Infinity) {
    const valid = validDirections(grid, pacmanPos);
    if (valid.length === 0) return 'UP';

    if (hasPower) {
      return heuristicAction(grid, pacmanPos, ghostPositions, true, powerTimer, dotsLeft);
    }

    if (Math.random() < epsilon.current) {
      return valid[Math.floor(Math.random() * valid.length)];
    }

    const stateKey = encodeState(grid, pacmanPos, ghostPositions, false);
    const qVals = getQValues(stateKey);

    const allZero = valid.every(dir => qVals[dir] === 0);
    if (allZero) {
      return heuristicAction(grid, pacmanPos, ghostPositions, false, 0, dotsLeft);
    }

    let bestDir = valid[0];
    let bestQ = -Infinity;
    for (const dir of valid) {
      if (qVals[dir] > bestQ) { bestQ = qVals[dir]; bestDir = dir; }
    }
    return bestDir;
  }

  /**
   * Q(s,a) ← Q(s,a) + α·[r + γ·max_a' Q(s',a') − Q(s,a)]
   */
  function updateQ(prevStateKey, action, reward, nextGrid, nextPacman, nextGhosts, nextHasPower, done) {
    const qVals = getQValues(prevStateKey);
    const oldQ = qVals[action] || 0;

    let maxNextQ = 0;
    if (!done) {
      const nextKey = encodeState(nextGrid, nextPacman, nextGhosts, nextHasPower);
      const nextQVals = getQValues(nextKey);
      maxNextQ = Math.max(...Object.values(nextQVals));
    }

    qVals[action] = oldQ + QL.ALPHA * (reward + QL.GAMMA * maxNextQ - oldQ);
  }

  function onEpisodeEnd() {
    episodeCount.current += 1;
    epsilon.current = Math.max(QL.EPSILON_MIN, epsilon.current * QL.EPSILON_DECAY);
    // Persist to localStorage after every episode
    saveToStorage(qTable.current, epsilon.current, episodeCount.current);
  }

  function getEpsilon() { return epsilon.current; }
  function getQTableSize() { return Object.keys(qTable.current).length; }
  function getEpisode() { return episodeCount.current; }
  function hasSavedData() { return localStorage.getItem(STORAGE_KEY) !== null; }

  function resetLearning() {
    qTable.current = {};
    epsilon.current = QL.EPSILON_START;
    episodeCount.current = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  return {
    chooseAction,
    updateQ,
    onEpisodeEnd,
    encodeState,
    getEpsilon,
    getQTableSize,
    getEpisode,
    hasSavedData,
    resetLearning,
  };
}
