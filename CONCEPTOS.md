# Conceptos: cómo funciona PAC-MAN IA

Documento orientado a **explicar en viva voz o por escrito** el funcionamiento del proyecto: qué hace cada pieza y cómo encajan.

---

## 1. Idea general

La aplicación es un **Pac-Man en el navegador** donde **Pac-Man no lo controla el usuario**: lo mueve un **agente de aprendizaje por refuerzo** basado en **Q-Learning**. El tablero, los fantasmas y las reglas forman el **entorno**; el agente elige en cada instante una de cuatro **acciones** (arriba, abajo, izquierda, derecha) y recibe **recompensas** o **penalizaciones** según lo que pasa. Con el tiempo, la **tabla Q** guarda qué tan buena es cada acción en cada “tipo de situación” (estado discretizado).

---

## 2. Tipo de agente

En este proyecto se usa un **agente de aprendizaje por refuerzo**, concretamente un esquema **basado en valores** (*value-based*):

- **Algoritmo: Q-Learning** — actualiza estimaciones **Q(s, a)** (valor de tomar la acción `a` en el estado `s`) sin aprender un modelo explícito de transiciones del entorno.
- **Sin modelo (*model-free*)** — no estima probabilidades del tipo “si hago esta acción, qué estado viene”; solo aprende de la interacción (prueba–error) mediante la ecuación de Bellman en forma tabular.
- **Política implícita** — la política se deriva de la tabla Q (elegir acciones con mayor Q entre las válidas); la exploración es **ε-greedy** (a veces elige al azar para seguir explorando).
- **Off-policy (en el sentido habitual de Q-Learning)** — el objetivo de aprendizaje usa el **máximo** sobre acciones del siguiente estado, mientras que la conducta puede ser exploratoria (ε-greedy).
- **Estados y acciones discretos** — espacio de estados **codificado** en una cadena finita (`encodeState`) y **tabla Q** explícita (no hay red neuronal ni aproximador continuo).

En la taxonomía clásica de agentes (p. ej. Russell & Norvig), encaja como **agente que aprende** y, en cada instante, como **agente reactivo** basado en el estado observado (no mantiene un plan simbólico de largo plazo aparte de los valores Q).

---

## 3. Capas del software (arquitectura)

| Capa | Rol |
|------|-----|
| **React (UI)** | Muestra el tablero, estadísticas, gráfico de recompensas por episodio y controles (play, pausa, reset, entrenamiento rápido, cambio de mapa). |
| **`useGameLoop`** | Orquesta el tiempo: un **intervalo** dispara un “tick” cuando el juego está en marcha; acumula recompensa del episodio y llama a la lógica de fin de episodio. |
| **`stepOnce` (motor del juego)** | Función **pura**: dado el estado actual, la interfaz de Q-Learning y contadores de fantasmas, devuelve el **siguiente estado**, la **recompensa del paso** y si el episodio **terminó**. No usa React; así el mismo código sirve para jugar paso a paso y para **entrenar muchos episodios seguidos** sin animar cada frame. |
| **`useQLearning`** | Mantiene la **tabla Q**, **epsilon** (exploración), **número de episodio** y la **persistencia** en `localStorage`. |

Separar el **motor** (`stepOnce`) de la **UI** evita duplicar reglas y permite “fast training” por lotes sin bloquear la interfaz.

---

## 4. Episodio, paso y condiciones de parada

- Un **episodio** es un intento desde el estado inicial hasta:
  - **Victoria**: no quedan puntos en el mapa.
  - **Derrota**: se pierden todas las vidas (colisión con fantasma sin poder).
  - **Timeout**: se supera un **límite de pasos** por episodio (evita bucles infinitos).

En cada **paso** del bucle: el agente elige acción → se mueve Pac-Man → se actualizan comida, poder, fantasmas → colisiones → se calcula recompensa → se actualiza Q.

---

## 5. Q-Learning en pocas palabras

- Para cada **estado** `s` y **acción** `a` se guarda un valor **Q(s, a)**: una estimación de “qué tan bueno” es hacer `a` en `s` a largo plazo.
- Tras cada paso se aplica la regla de actualización (conceptualmente):

  **Q(s,a) ← Q(s,a) + α · [ r + γ · max Q(s′,a′) − Q(s,a) ]**

  donde **α** es la tasa de aprendizaje, **γ** el factor de descuento futuro, **r** la recompensa del paso y **s′** el estado siguiente.

- **Selección de acción (ε-greedy)**:
  - Con probabilidad **ε** se elige una dirección **válida al azar** (exploración).
  - En caso contrario se elige la acción con **mayor Q** entre las direcciones que no chocan con pared.
  - Si todas las Q válidas son cero (aún no hay señal), se usa una **heurística** (BFS hacia comida, huir de fantasmas cercanos, etc.).

- **ε** **decae** al terminar cada episodio: al principio hay mucha exploración; al final casi siempre se **explotan** las políticas aprendidas (en la UI aparece como fase de **explotación** cuando ε es muy bajo, ~5%).

---

## 6. ¿Qué es “el estado” para el agente?

El juego tiene posiciones continuas en la rejilla, pero Q-Learning necesita un **conjunto finito de estados**. Por eso se usa **`encodeState`**: convierte el mapa, Pac-Man, fantasmas y si hay poder activo en una **cadena clave** (una fila en la tabla Q).

Esa clave resume, entre otras cosas:

- Paredes en las cuatro direcciones.
- Si hay **comida** (punto o pellet) en los próximos pasos en cada dirección (sensores de comida).
- Distancia **discretizada** al fantasma más cercano y cuadrante aproximado.
- Si hay **poder** y si hay **power pellet** cerca.
- Hacia dónde está el **objetivo** relevante (punto o fantasma si está powered).

Así el agente distingue situaciones útiles sin memorizar coordenadas exactas.

---

## 7. Recompensas y “reward shaping”

Las recompensas guían el comportamiento:

- Comer punto / pellet / fantasma / ganar → **refuerzo positivo fuerte**.
- Morir → **penalización grande**.
- Cada paso tiene un **coste pequeño** (incentiva terminar con pocos pasos).

Además hay **shaping**:

- Bonus si se **acerca** al punto más cercano (respecto al turno anterior).
- Penalización si pasa **mucho tiempo sin comer** (reduce bucles inútiles).

Esto no cambia el algoritmo Q-Learning en sí, pero **facilita** que aprenda más rápido.

---

## 8. Fantasmas (no aprenden)

Los fantasmas siguen reglas **fijas**:

- Uno persigue con **BFS** hacia Pac-Man.
- Otro combina **emboscada** (apunta a celdas delante de Pac-Man) y **scatter** cerca del jugador para no amontonarse.
- Con **poder activo**, huyen por BFS lejos de Pac-Man.

Pac-Man se mueve **cada tick**; los fantasmas tienen **intervalos distintos** (más lentos), lo que da tiempo al agente de reaccionar.

---

## 9. Mapa y variantes

- El laberinto se genera con **backtracking recursivo** y algo de apertura aleatoria; las dimensiones son fijas en configuración.
- Tras un **reset** completo se genera un mapa nuevo y se **borra** el aprendizaje guardado.
- Tras **ganar**, el usuario puede **seguir en el mismo mapa** o **cambiar de mapa**: la **tabla Q se conserva** (transferencia al nuevo entorno con el conocimiento acumulado).

---

## 10. Entrenamiento rápido y persistencia

- **Entrenamiento rápido** ejecuta muchos episodios en bucle con `stepOnce`, en **trozos** (`setTimeout`) para no congelar el navegador, y al final refresca la vista.
- La **tabla Q**, **ε** y el **contador de episodios** se guardan en **`localStorage`** para no perder progreso al recargar la página.

---

## 11. Frase-resumen para una defensa oral

> “Modelamos Pac-Man como un **MDP discretizado**: en cada paso el agente observa un **estado codificado**, elige una **acción** con ε-greedy, recibe una **recompensa** y actualiza **Q-Learning**. Los fantasmas son **oponentes con política fija**; el mapa es el **entorno**. La interfaz solo **visualiza** y **dispara** el bucle de tiempo; la lógica de juego y aprendizaje está en **`stepOnce`** y **`useQLearning`**.”

---

## Referencia de hiperparámetros (como en la UI)

- **α (alpha)**, **γ (gamma)**, **ε** inicial, mínimo y decaimiento están definidos en código y se muestran de forma resumida en la interfaz (por ejemplo α=0.2, γ=0.9, ε→0.05).

Si necesitas profundizar en un solo tema para la exposición, lo más pedagógico suele ser: **(1)** qué es un episodio, **(2)** cómo se construye la clave de estado, **(3)** una iteración de la actualización de Q, **(4)** por qué baja ε con el tiempo.
