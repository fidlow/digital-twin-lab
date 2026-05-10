// src/components/DifficultyToggle.tsx
import type { Difficulty } from "../contexts/DifficultyContext";

interface DifficultyToggleProps {
  value: Difficulty;
  onChange: (next: Difficulty) => void;
}

export function DifficultyToggle({ value, onChange }: DifficultyToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-white/20 bg-white/10 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("basic")}
        className={`rounded-full px-3 py-1 transition ${value === "basic" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}
      >
        Базовый
      </button>
      <button
        type="button"
        onClick={() => onChange("advanced")}
        className={`rounded-full px-3 py-1 transition ${value === "advanced" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}
      >
        Продвинутый
      </button>
    </div>
  );
}
