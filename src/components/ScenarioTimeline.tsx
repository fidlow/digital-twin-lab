import type { ScenarioLogEntry } from "../types/ui";

const KIND_CHIP: Record<ScenarioLogEntry["kind"], { className: string; label: string }> = {
  scenario: { className: "bg-indigo-100 text-indigo-800", label: "Сценарий" },
  snapshot: { className: "bg-amber-100 text-amber-800", label: "Снимок" },
  reset: { className: "bg-slate-200 text-slate-700", label: "Сброс" },
};

interface ScenarioTimelineProps {
  log: ScenarioLogEntry[];
  onSnapshot: () => void;
}

export function ScenarioTimeline({ log, onSnapshot }: ScenarioTimelineProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Лента сценариев</h2>
        <button
          onClick={onSnapshot}
          className="rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          📷 Снимок состояния
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        История действий. Снимок — закладка, к которой можно вернуться обсудить.
      </p>
      {log.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-5 text-sm text-slate-500">
          Лента пуста. Переключи сценарий или нажми «Снимок состояния».
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {log
            .slice()
            .reverse()
            .map((entry, idx) => {
              const chip = KIND_CHIP[entry.kind];
              return (
                <li key={`${entry.ts}-${idx}`} className="flex items-baseline justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${chip.className}`}>
                      {chip.label}
                    </span>
                    <span className="font-medium text-slate-900">{entry.label}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{entry.tm}</span>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
