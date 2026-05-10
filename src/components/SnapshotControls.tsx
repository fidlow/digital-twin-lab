// src/components/SnapshotControls.tsx
import type { SnapshotEntry } from "../types/ui";

interface SnapshotControlsProps {
  snapshots: SnapshotEntry[];
  snapshotIndex: number;
  onSnapshot: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRestore: (idx: number) => void;
}

export function SnapshotControls({
  snapshots, snapshotIndex, onSnapshot, onUndo, onRedo, onRestore,
}: SnapshotControlsProps) {
  const canUndo = snapshotIndex > 0;
  const canRedo = snapshotIndex >= 0 && snapshotIndex < snapshots.length - 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSnapshot}
          className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          📷 Снимок
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Откат
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Вперёд →
        </button>
        <span className="ml-auto text-[11px] text-slate-500">
          {snapshots.length === 0
            ? "Снимков нет"
            : `Снимок ${snapshotIndex + 1} из ${snapshots.length}`}
        </span>
      </div>
      {snapshots.length > 0 && (
        <ol className="mt-3 flex flex-wrap gap-1.5">
          {snapshots.map((s, i) => (
            <li key={s.ts}>
              <button
                type="button"
                onClick={() => onRestore(i)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                  i === snapshotIndex
                    ? "bg-indigo-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={`${s.label} (${new Date(s.ts).toLocaleTimeString("ru-RU")})`}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
