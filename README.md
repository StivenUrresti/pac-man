# PAC-MAN IA

Aplicación web (React + Vite) con un agente de **aprendizaje por refuerzo (Q-Learning)** que controla a Pac-Man.

## Requisitos

| Requisito | Notas |
|-----------|--------|
| **Node.js** | Versión **18** o superior (recomendado: [LTS actual](https://nodejs.org/)). Incluye **npm**. |
| **Navegador** | Cualquier navegador moderno (Chrome, Firefox, Safari, Edge). El juego usa `localStorage` para guardar el progreso del aprendizaje. |

No hace falta base de datos ni servicios externos para desarrollo local.

## Cómo ejecutarlo

1. **Instalar dependencias** (en la raíz del proyecto):

   ```bash
   npm install
   ```

2. **Arrancar el servidor de desarrollo** (recarga en caliente):

   ```bash
   npm run dev
   ```

3. Abre en el navegador la URL que muestra Vite (por defecto `http://localhost:5173`).

## Otros comandos

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente el contenido de `dist/` (tras un `build`). |
| `npm run lint` | Ejecuta ESLint sobre el código. |

## Estructura útil

- `src/` — componentes React, hooks (`useGameLoop`, `useQLearning`) y lógica del juego (`utils/`).
- `CONCEPTOS.md` — explicación conceptual del funcionamiento (y `CONCEPTOS_SLIDES.md` para presentaciones).
