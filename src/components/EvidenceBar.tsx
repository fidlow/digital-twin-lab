import { evidenceWeights, type EvidenceResult } from "../models/digitalTwin";

interface EvidenceBarProps {
  ev: EvidenceResult;
}

// Цвета по сигналу (а не по тону), чтобы три фактора одного уровня риска
// были различимы в легенде. Палитра дублирует SERIES в digitalTwin.ts;
// ключ `i` отсутствует на графике — для него подобран жёлтый из той же
// насыщенной группы, что и остальные.
const KEY_FILL: Record<string, string> = {
  t: "#ef4444",
  p: "#10b981",
  i: "#eab308",
  w: "#f97316",
  v: "#0ea5e9",
  s: "#8b5cf6",
};
const FALLBACK_FILL = "#94a3b8";

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
            className="h-full"
            style={{ width: `${w.percent}%`, background: KEY_FILL[w.key] ?? FALLBACK_FILL }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {weights.map((w) => (
          <li key={w.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: KEY_FILL[w.key] ?? FALLBACK_FILL }}
            />
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
