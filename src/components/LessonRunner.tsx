// src/components/LessonRunner.tsx
import type { Lesson } from "../types/lessons";

interface LessonRunnerProps {
  lesson: Lesson;
  stepIndex: number;
  onNext: () => void;
  onStop: () => void;
}

export function LessonRunner({ lesson, stepIndex, onNext, onStop }: LessonRunnerProps) {
  const total = lesson.steps.length;
  const finished = stepIndex >= total;
  const step = lesson.steps[stepIndex];
  const percent = Math.round(((finished ? total : stepIndex) / total) * 100);
  const isManual = step?.advanceOn.kind === "manual";

  return (
    <div className="fixed bottom-4 left-1/2 z-30 w-[min(92vw,720px)] -translate-x-1/2 rounded-3xl border border-indigo-200 bg-white p-4 shadow-2xl">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{lesson.title}</p>
        <p className="text-xs text-slate-500">
          {finished ? `Готово (${total} из ${total})` : `Шаг ${stepIndex + 1} из ${total}`}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-800">
        {finished ? "Урок завершён. Нажмите «Закончить», чтобы вернуться к свободному режиму." : step?.text}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        {finished ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            Закончить
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onStop}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Прервать
            </button>
            {isManual ? (
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Следующий шаг
              </button>
            ) : (
              <span className="self-center text-[11px] text-slate-500">ждём наступления условия…</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
