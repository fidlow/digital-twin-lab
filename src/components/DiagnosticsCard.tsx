import type { EvidenceResult } from "../models/digitalTwin";
import { EvidenceBar } from "./EvidenceBar";

interface DiagnosticsCardProps {
  rec: readonly [string, string, string];
  ev: EvidenceResult;
}

export function DiagnosticsCard({ rec, ev }: DiagnosticsCardProps) {
  return (
    <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Диагностика</h3>
      <p className="mt-2 font-semibold">{rec[0]}</p>
      <p className="mt-2 text-sm text-slate-600">{rec[1]}</p>
      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-medium">{rec[2]}</p>
      <div className="mt-3">
        <EvidenceBar ev={ev} />
      </div>
    </div>
  );
}
