# PAC-MAN IA — guión corto para diapositivas

---

## Título
**PAC-MAN con aprendizaje por refuerzo (Q-Learning)**  
Pac-Man lo controla un agente, no el jugador.

---

## Idea general
- Entorno: tablero, fantasmas, reglas.
- Agente: elige **UP / DOWN / LEFT / RIGHT** cada paso.
- Objetivo: maximizar **recompensas** acumuladas.
- Memoria: **tabla Q** = “qué tan buena es cada acción en cada tipo de situación”.

---

## Tipo de agente
- **Aprendizaje por refuerzo**, algoritmo **Q-Learning**.
- **Basado en valores** (*value-based*): tabla **Q(s,a)**, no red neuronal.
- **Sin modelo** (*model-free*): no aprende transiciones del entorno, solo de la experiencia.
- **Exploración ε-greedy**; política derivada del **máximo Q** (Q-Learning típico = **off-policy**).
- Estados **discretos** (`encodeState`); comportamiento **reactivo** paso a paso.

---

## Arquitectura (4 piezas)
- **React**: tablero, stats, gráfico, controles.
- **`useGameLoop`**: intervalo = ticks del juego; fin de episodio.
- **`stepOnce`**: motor **puro** (sin React): siguiente estado + recompensa + fin.
- **`useQLearning`**: tabla Q, ε, episodios, `localStorage`.

---

## Episodio — cuándo termina
- **Gana**: se comen todos los puntos.
- **Pierde**: sin vidas (fantasma sin poder).
- **Timeout**: demasiados pasos (evita bucles infinitos).

---

## Q-Learning (1 línea)
**Q(s,a) ← Q(s,a) + α · [ r + γ · max Q(s′) − Q(s,a) ]**  
Aprende valores de acción a partir de recompensas y el futuro descontado.

---

## Cómo elige el agente (ε-greedy)
- Con probabilidad **ε**: movimiento **aleatorio** (explora).
- Si no: **mejor Q** entre direcciones válidas (explotación).
- Si todo Q = 0: **heurística** (ir a comida, huir, etc.).
- **ε baja** cada episodio → al final ~5% exploración (**explotación**).

---

## Estado (discretizado)
No guarda coordenadas exactas: **`encodeState`** → clave finita con:
- Paredes y “sensores” de comida por dirección.
- Fantasma más cercano (distancia + cuadrante).
- Poder activo y pellet cerca.
- Hacia dónde está el objetivo (punto o fantasma si hay poder).

---

## Recompensas + shaping
- Comer / ganar → **+** fuerte; morir → **−** grande; cada paso → **pequeño coste**.
- **Shaping**: bonus por acercarse al punto; penalización si no come mucho tiempo.

---

## Fantasmas
- **No aprenden**: reglas fijas (persecución BFS, emboscada, dispersión).
- Con poder: **huyen**. Pac-Man mueve cada tick; fantasmas más lentos.

---

## Mapa y persistencia
- Laberinto **generado** (backtracking + aleatorio).
- **Reset**: mapa nuevo + borra Q guardada.
- Tras ganar: mismo mapa o **nuevo mapa** (Q se **conserva**).
- **Entrenamiento rápido**: muchos episodios en lotes (`setTimeout`).
- Progreso en **`localStorage`**.

---

## Frase de cierre
**MDP discretizado**: estado codificado → acción ε-greedy → recompensa → actualización Q. Fantasmas = oponente fijo; lógica en **`stepOnce`** + **`useQLearning`**.

---

## Datos (UI)
α = 0.2 · γ = 0.9 · ε → ~0.05
