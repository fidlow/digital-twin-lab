export interface SliderProps {
  label: string;
  value: number;
  percent: number;
  onChange: (value: number) => void;
  limits: { min: number; max: number; step: number };
  accent: string;
  valueTint: string;
  ticks: readonly [string, string, string];
}

export function Slider({ label, value, percent, onChange, limits, accent, valueTint, ticks }: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className={`font-mono ${valueTint}`}>{percent}%</span>
      </div>
      <input
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-2 w-full ${accent}`}
      />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>{ticks[0]}</span>
        <span>{ticks[1]}</span>
        <span>{ticks[2]}</span>
      </div>
    </div>
  );
}
