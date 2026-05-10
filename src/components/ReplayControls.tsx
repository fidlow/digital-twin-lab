// src/components/ReplayControls.tsx
import type { DecisionAction } from "../types/ui";

interface ReplayControlsProps {
  actions: DecisionAction[];
  replayActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ReplayControls({ actions, replayActive, onStart, onStop }: ReplayControlsProps) {
  const total = actions.length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {replayActive ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
          >
            ⏹ Остановить
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={total === 0}
            className="rounded-xl bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ▶ Воспроизвести
          </button>
        )}
        <span className="text-[11px] text-slate-500">
          {replayActive
            ? "Идёт воспроизведение..."
            : total === 0
              ? "Нечего воспроизводить — никаких действий ещё не записано"
              : `Записано действий: ${total}`}
        </span>
      </div>
    </div>
  );
}
