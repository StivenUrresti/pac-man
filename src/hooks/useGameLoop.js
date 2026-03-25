import { useState, useRef, useCallback, useEffect } from 'react';
import { MAX_EPISODES_PER_MAP, MAX_STEPS_PER_EPISODE } from '../utils/constants.js';
import { generateMap, countDots } from '../utils/mapGenerator.js';
import { useQLearning } from './useQLearning.js';
import { stepOnce } from '../utils/gameStepper.js';

/**
 * Crea un registro de victoria para el historial.
 * @param {number} mapNumber
 * @param {number} episodeOnMap - intentos en este mapa hasta ganar
 * @param {number} totalEpisode - episodio global
 * @param {number} steps - pasos del episodio ganador
 * @param {number} score
 */
function makeWinRecord(mapNumber, episodeOnMap, totalEpisode, steps, score) {
  return { mapNumber, episodeOnMap, totalEpisode, steps, score, timestamp: Date.now() };
}

function makeEpisodeState(baseMap, spawnMap, prevScore, prevLives) {
  return {
    grid: baseMap.grid.map(r => [...r]),
    pacmanPos: { ...spawnMap.pacmanPos },
    ghosts: spawnMap.ghostPositions.map((pos, i) => ({
      pos: { ...pos }, id: i, frightened: false, frightenTimer: 0,
    })),
    score: prevScore ?? 0,
    lives: prevLives ?? 3,
    powerTimer: 0,
    hasPower: false,
    dotsLeft: countDots(baseMap.grid),
    dead: false,
    won: false,
    pacDir: 'RIGHT',
    mouthOpen: true,
    stepsWithoutDot: 0,
    episodeSteps: 0,
  };
}

export function useGameLoop() {
  const [gameState, setGameState] = useState(() => {
    const m = generateMap();
    return makeEpisodeState(m, m, 0, 3);
  });
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [episodeRewards, setEpisodeRewards] = useState([]);
  const [phase, setPhase] = useState('training');
  const [isFastTraining, setIsFastTraining] = useState(false);
  const [fastProgress, setFastProgress] = useState({ done: 0, total: 0 });
  // Historial de victorias: cada entrada = { mapNumber, episodeOnMap, totalEpisode, steps, score }
  const [winHistory, setWinHistory] = useState([]);
  // Victoria pendiente de confirmar (muestra el modal)
  const [pendingWin, setPendingWin] = useState(null);
  const mapNumberRef = useRef(1);

  const phaseRef = useRef('training');
  const gameRef = useRef(null);
  const persistentMap = useRef(generateMap());
  const episodesOnCurrentMap = useRef(0);
  const ghostTickCounters = useRef([0, 0, 0]);
  const mouthOpenRef = useRef(true);
  const episodeRewardAccum = useRef(0);

  // Initialise gameRef on first render
  if (!gameRef.current) {
    gameRef.current = makeEpisodeState(persistentMap.current, persistentMap.current, 0, 3);
    setGameState({ ...gameRef.current });
  }

  const ql = useQLearning();
  const qlRef = useRef(ql);
  qlRef.current = ql;

  // ── Shared episode-end logic ───────────────────────────────────────────────
  function handleEpisodeEnd(finalState, accumulatedReward, setStateCallback) {
    qlRef.current.onEpisodeEnd();

    if (phaseRef.current === 'training' && qlRef.current.getEpsilon() <= 0.051) {
      phaseRef.current = 'exploitation';
      setPhase('exploitation');
    }

    setEpisodeRewards(prev => [...prev.slice(-49), accumulatedReward]);
    episodesOnCurrentMap.current += 1;

    // ── Victoria: pausar y mostrar modal en lugar de reiniciar solo ───────────
    if (finalState.won) {
      setIsRunning(false);
      const record = makeWinRecord(
        mapNumberRef.current,
        episodesOnCurrentMap.current,
        qlRef.current.getEpisode(),
        finalState.episodeSteps ?? 0,
        finalState.score,
      );
      setWinHistory(prev => [...prev, record]);
      setPendingWin(record);
      // Mantener el estado de victoria visible (no reiniciar todavía)
      if (setStateCallback) setStateCallback({ ...finalState });
      return;
    }

    // ── Derrota o timeout: reiniciar episodio normalmente ────────────────────
    const isGameOver = finalState.lives <= 0;
    const baseMap = persistentMap.current;
    const spawnMap = generateMap();
    const nextGs = makeEpisodeState(
      baseMap,
      spawnMap,
      isGameOver ? 0 : finalState.score,
      isGameOver ? 3 : finalState.lives,
    );

    ghostTickCounters.current = [0, 0, 0];
    mouthOpenRef.current = true;
    gameRef.current = nextGs;
    if (setStateCallback) setStateCallback({ ...nextGs });
  }

  // ── Single visual tick ─────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = gameRef.current;
    // También parar si ya se alcanzó el límite de pasos del episodio anterior
    if (s.dead || s.won || (s.episodeSteps ?? 0) >= MAX_STEPS_PER_EPISODE) return;

    const { nextState, stepReward, done } = stepOnce(s, qlRef.current, ghostTickCounters.current);
    nextState.mouthOpen = mouthOpenRef.current = !mouthOpenRef.current;

    episodeRewardAccum.current += stepReward;
    gameRef.current = nextState;
    setGameState({ ...nextState });

    if (done) {
      const totalReward = episodeRewardAccum.current;
      episodeRewardAccum.current = 0;
      const isGameOver = nextState.lives <= 0 && !nextState.won;
      const delay = isGameOver ? 1000 : 500;
      setTimeout(() => handleEpisodeEnd(nextState, totalReward, setGameState), delay);
    }
  }, []); // stable — all state via refs

  // ── Interval ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [isRunning, speed, tick]);

  // ── Fast batch training ────────────────────────────────────────────────────
  const fastTrain = useCallback((numEpisodes) => {
    setIsRunning(false);
    setIsFastTraining(true);
    setFastProgress({ done: 0, total: numEpisodes });

    const CHUNK = 10; // episodes per setTimeout chunk (keeps UI responsive)
    let episodesDone = 0;

    function runChunk() {
      const chunkSize = Math.min(CHUNK, numEpisodes - episodesDone);

      for (let e = 0; e < chunkSize; e++) {
        // Run one full episode synchronously
        const localGhostTick = [0, 0, 0];
        let state = makeEpisodeState(
          persistentMap.current,
          generateMap(),
          gameRef.current.score,
          gameRef.current.lives,
        );
        let accReward = 0;
        let steps = 0;
        const MAX_STEPS = MAX_STEPS_PER_EPISODE * 2; // fallback de seguridad (stepOnce ya controla MAX_STEPS_PER_EPISODE)

        while (!state.dead && !state.won && steps < MAX_STEPS) {
          const { nextState, stepReward, done } = stepOnce(state, qlRef.current, localGhostTick);
          accReward += stepReward;
          state = nextState;
          steps++;
          if (done) break;
        }

        // Episode ended — update Q-learning metadata and get next base state
        qlRef.current.onEpisodeEnd();
        if (phaseRef.current === 'training' && qlRef.current.getEpsilon() <= 0.051) {
          phaseRef.current = 'exploitation';
          setPhase('exploitation');
        }
        setEpisodeRewards(prev => [...prev.slice(-49), accReward]);
        episodesOnCurrentMap.current += 1;

        // Registrar victoria silenciosamente en fast-train
        if (state.won) {
          const record = makeWinRecord(
            mapNumberRef.current,
            episodesOnCurrentMap.current,
            qlRef.current.getEpisode(),
            state.episodeSteps ?? steps,
            state.score,
          );
          setWinHistory(prev => [...prev, record]);
        }

        // Update gameRef so the visual state after fast-train reflects progress
        const isGameOver = state.lives <= 0 && !state.won;
        const nextGs = makeEpisodeState(
          persistentMap.current,
          generateMap(),
          isGameOver ? 0 : state.score,
          isGameOver ? 3 : state.lives,
        );
        gameRef.current = nextGs;
      }

      episodesDone += chunkSize;
      setFastProgress({ done: episodesDone, total: numEpisodes });

      if (episodesDone < numEpisodes) {
        setTimeout(runChunk, 0); // yield to browser between chunks
      } else {
        // Done — update visual state once
        setGameState({ ...gameRef.current });
        setIsFastTraining(false);
        setFastProgress({ done: 0, total: 0 });
        ghostTickCounters.current = [0, 0, 0];
        mouthOpenRef.current = true;
        episodeRewardAccum.current = 0;
      }
    }

    setTimeout(runChunk, 0);
  }, []);

  // ── Controls ───────────────────────────────────────────────────────────────
  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  // ── Cambiar a un mapa nuevo conservando el aprendizaje acumulado ──────────
  const changeMap = useCallback(() => {
    setPendingWin(null);
    setIsRunning(false);
    mapNumberRef.current += 1;
    episodesOnCurrentMap.current = 0;
    persistentMap.current = generateMap();
    ghostTickCounters.current = [0, 0, 0];
    mouthOpenRef.current = true;
    episodeRewardAccum.current = 0;
    const fresh = makeEpisodeState(persistentMap.current, generateMap(), 0, 3);
    gameRef.current = fresh;
    setGameState({ ...fresh });
    // Q-table se conserva — el agente llega entrenado al nuevo mapa
  }, []);

  // ── Seguir en el mismo mapa después de ganar ──────────────────────────────
  const continueAfterWin = useCallback(() => {
    setPendingWin(null);
    ghostTickCounters.current = [0, 0, 0];
    mouthOpenRef.current = true;
    episodeRewardAccum.current = 0;
    const nextGs = makeEpisodeState(persistentMap.current, generateMap(), 0, 3);
    gameRef.current = nextGs;
    setGameState({ ...nextGs });
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsFastTraining(false);
    setPendingWin(null);
    setWinHistory([]);
    qlRef.current.resetLearning();
    episodeRewardAccum.current = 0;
    ghostTickCounters.current = [0, 0, 0];
    mouthOpenRef.current = true;
    persistentMap.current = generateMap();
    episodesOnCurrentMap.current = 0;
    mapNumberRef.current = 1;
    phaseRef.current = 'training';
    setPhase('training');
    setEpisodeRewards([]);
    setFastProgress({ done: 0, total: 0 });
    const fresh = makeEpisodeState(persistentMap.current, generateMap(), 0, 3);
    gameRef.current = fresh;
    setGameState({ ...fresh });
  }, []);

  return {
    gameState,
    isRunning,
    isFastTraining,
    fastProgress,
    speed,
    setSpeed,
    episodeRewards,
    play,
    pause,
    reset,
    fastTrain,
    ql,
    phase,
    episodesOnCurrentMap,
    maxEpisodesPerMap: MAX_EPISODES_PER_MAP,
    winHistory,
    pendingWin,
    changeMap,
    continueAfterWin,
    mapNumber: mapNumberRef,
  };
}
