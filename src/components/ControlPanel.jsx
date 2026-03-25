import React from 'react';

function NeonButton({ onClick, children, color = '#6366f1', disabled = false, variant = 'primary', fullWidth = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-lg font-retro text-xs uppercase tracking-wider${fullWidth ? ' w-full' : ''}`}
      style={{
        background: variant === 'primary' ? `${color}22` : 'transparent',
        border: `1px solid ${color}`,
        color,
        boxShadow: `0 0 8px ${color}44`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.boxShadow = `0 0 16px ${color}88, 0 0 30px ${color}44`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 8px ${color}44`; }}
    >
      {children}
    </button>
  );
}

function SpeedSlider({ speed, setSpeed, disabled }) {
  const SPEED_MIN = 80;
  const SPEED_MAX = 500;

  const handleChange = (e) => {
    const val = parseInt(e.target.value, 10);
    const ms = Math.round(SPEED_MAX - ((val - 1) / 4) * (SPEED_MAX - SPEED_MIN));
    setSpeed(ms);
  };

  const displayVal = Math.round(1 + ((SPEED_MAX - speed) / (SPEED_MAX - SPEED_MIN)) * 4);
  const speedLabels = ['Muy lento', 'Lento', 'Normal', 'Rápido', 'Turbo'];

  return (
    <div className="flex flex-col gap-1" style={{ opacity: disabled ? 0.4 : 1 }}>
      <div className="flex justify-between">
        <span className="text-slate-400 text-xs font-retro">Velocidad</span>
        <span className="text-xs font-retro" style={{ color: '#818cf8' }}>
          {speedLabels[displayVal - 1]}
        </span>
      </div>
      <input
        type="range" min="1" max="5" value={displayVal}
        onChange={handleChange} disabled={disabled}
        className="w-full cursor-pointer"
        style={{ accentColor: '#818cf8' }}
      />
    </div>
  );
}

function FastTrainProgress({ progress }) {
  const { done, total } = progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between">
        <span className="text-xs font-retro" style={{ color: '#facc15' }}>Entrenando...</span>
        <span className="text-xs font-retro" style={{ color: '#facc15' }}>{done}/{total}</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: '#1e1b4b' }}>
        <div
          className="h-2 rounded-full transition-all duration-200"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #facc15, #fb923c)',
            boxShadow: '0 0 8px #facc1580',
          }}
        />
      </div>
    </div>
  );
}

export default function ControlPanel({
  isRunning, play, pause, reset, speed, setSpeed,
  fastTrain, isFastTraining, fastProgress,
}) {
  const busy = isFastTraining;

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 rounded-xl"
      style={{
        background: 'linear-gradient(180deg, #0d0d1f 0%, #0a0a1a 100%)',
        border: '1px solid #1e1b4b',
      }}
    >
      <p className="text-slate-500 text-xs font-retro uppercase tracking-widest mb-1">Controles</p>

      {/* Play / Pause */}
      <div className="flex gap-2">
        <NeonButton onClick={play} color="#34d399" disabled={isRunning || busy} fullWidth>
          ▶ Iniciar
        </NeonButton>
        <NeonButton onClick={pause} color="#facc15" disabled={!isRunning || busy} variant="ghost" fullWidth>
          ⏸ Pausar
        </NeonButton>
      </div>

      {/* Fast train or progress bar */}
      {isFastTraining ? (
        <FastTrainProgress progress={fastProgress} />
      ) : (
        <div className="flex gap-2">
          <NeonButton onClick={() => fastTrain(50)} color="#facc15" disabled={isRunning} variant="ghost" fullWidth>
            ⚡ 50 ep
          </NeonButton>
          <NeonButton onClick={() => fastTrain(200)} color="#a855f7" disabled={isRunning} variant="ghost" fullWidth>
            ⚡ 200 ep
          </NeonButton>
        </div>
      )}

      {/* Speed */}
      <div className="pt-1">
        <SpeedSlider speed={speed} setSpeed={setSpeed} disabled={busy} />
      </div>

      {/* Reset */}
      <NeonButton onClick={reset} color="#f472b6" variant="ghost" disabled={busy} fullWidth>
        ↺ Reiniciar todo
      </NeonButton>
    </div>
  );
}
