// src/components/EvidenceBar.tsx
import { evidenceWeights, type EvidenceResult } from "../models/digitalTwin";

interface EvidenceBarProps {
  ev: EvidenceResult;
}

const TONE_FILL: Record<string, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  alarm: "bg-red-500",
};

export function EvidenceBar({ ev }: EvidenceBarProps) {
  const weights = evidenceWeights(ev);

  if (weights.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        Все факторы в норме — риск нулевой.
      </div>
    );
  }

  const top = weights[0]!;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Вклад в риск</p>
        <p className="text-xs text-slate-500">всего: {ev.score} / 100</p>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {weights.map((w) => (
          <span
            key={w.key}
            title={`${w.label}: ${w.percent}%`}
            className={`${TONE_FILL[w.tone] ?? "bg-slate-400"} h-full`}
            style={{ width: `${w.percent}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {weights.map((w) => (
          <li key={w.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${TONE_FILL[w.tone] ?? "bg-slate-400"}`} />
            {w.label} <span className="text-slate-400">— {w.percent}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-700">
        <b>Главная причина:</b> {top.label} ({top.percent}%).
      </p>
    </div>
  );
}
