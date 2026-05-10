// src/components/QuizOverlay.tsx
import type { Quiz, QuizOption } from "../types/lessons";

interface QuizOverlayProps {
  quiz: Quiz | null;
  outcome: string | null;
  onChoose: (option: QuizOption) => void;
  onDismiss: () => void;
}

export function QuizOverlay({ quiz, outcome, onChoose, onDismiss }: QuizOverlayProps) {
  if (!quiz) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">🎓 Вопрос аудитории</p>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">{quiz.prompt}</h2>
        {outcome ? (
          <>
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {outcome}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <ul className="mt-4 space-y-2">
            {quiz.options.map((opt, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onChoose(opt)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <span className="font-semibold text-slate-700">{String.fromCharCode(65 + i)}.</span> {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
