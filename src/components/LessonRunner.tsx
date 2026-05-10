// src/components/LessonRunner.tsx
import type { Lesson } from "../types/lessons";

interface LessonRunnerProps {
  lesson: Lesson;
  stepIndex: number;
  awaitingNext: boolean;
  onNext: () => void;
  onStop: () => void;
}

export function LessonRunner({ lesson, stepIndex, awaitingNext, onNext, onStop }: LessonRunnerProps) {
  const total = lesson.steps.length;
  const step = lesson.steps[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === total - 1;
  const percent = Math.round(((stepIndex + 1) / total) * 100);
  const canAdvance = step.advanceOn.kind === "manual" || awaitingNext;
  const advanceClick = isLast ? onStop : onNext;
  const advanceLabel = isLast ? "Завершить сценарий" : "Следующий шаг";

  return (
    <div className="fixed bottom-4 left-1/2 z-30 w-[min(92vw,720px)] -translate-x-1/2 rounded-3xl border border-indigo-200 bg-white p-4 shadow-2xl">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{lesson.title}</p>
        <p className="text-xs text-slate-500">Шаг {stepIndex + 1} из {total}</p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-800">{step.text}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onStop}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          Прервать
        </button>
        {canAdvance ? (
          <button
            type="button"
            onClick={advanceClick}
            className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            {advanceLabel}
          </button>
        ) : (
          <span className="self-center text-[11px] text-slate-500">ждём наступления условия…</span>
        )}
      </div>
    </div>
  );
}
