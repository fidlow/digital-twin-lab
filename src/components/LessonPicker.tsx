// src/components/LessonPicker.tsx
import { LESSONS } from "../lessons/lessons";
import type { Lesson } from "../types/lessons";

interface LessonPickerProps {
  activeLessonId: string | null;
  onStart: (lesson: Lesson) => void;
  onStop: () => void;
}

export function LessonPicker({ activeLessonId, onStart, onStop }: LessonPickerProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Учебные истории</h2>
        {activeLessonId && (
          <button
            type="button"
            onClick={onStop}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900"
          >
            ⏹ остановить урок
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">Каждый урок ведёт через сценарий и поясняет, на что смотреть.</p>
      <ul className="space-y-2">
        {LESSONS.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onStart(l)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                activeLessonId === l.id
                  ? "border-indigo-700 bg-indigo-700 text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              <b className="text-sm">{l.title}</b>
              <p className={`text-xs ${activeLessonId === l.id ? "text-indigo-100" : "text-slate-500"}`}>{l.summary}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
