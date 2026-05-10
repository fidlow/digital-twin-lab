// src/components/ControlsPanel.tsx
import {
  CONTROL_LIMITS,
  DEFAULT_CONTROLS,
  SCENARIOS,
  type Controls,
  type EvidenceResult,
  type ModeKey,
} from "../models/digitalTwin";
import { Slider } from "./Slider";
import { EvidenceBar } from "./EvidenceBar";

interface ControlsPanelProps {
  mode: ModeKey;
  controls: Controls;
  setControls: (next: Controls | ((prev: Controls) => Controls)) => void;
  setMode: (mode: ModeKey) => void;
  rec: readonly [string, string, string];
  ev: EvidenceResult;
  previewMode: boolean;
  onPreviewToggle: (preview: boolean) => void;
  previewControls: Controls;
  onPreviewControls: (next: Controls) => void;
}

export function ControlsPanel({
  mode, controls, setControls, setMode, rec, ev,
  previewMode, onPreviewToggle, previewControls, onPreviewControls,
}: ControlsPanelProps) {
  const shown = previewMode ? previewControls : controls;
  const heaterPercent = Math.round(shown.heater * 100);
  const coolingPercent = Math.round(shown.cooling * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Управление</h2>
          <button
            onClick={() => {
              if (previewMode) onPreviewControls(DEFAULT_CONTROLS);
              else setControls(DEFAULT_CONTROLS);
            }}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
          >
            сброс
          </button>
        </div>
        <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onPreviewToggle(false)}
            className={`rounded-full px-3 py-1 transition ${!previewMode ? "bg-indigo-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Сразу применить
          </button>
          <button
            type="button"
            onClick={() => onPreviewToggle(true)}
            className={`rounded-full px-3 py-1 transition ${previewMode ? "bg-slate-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Только посмотреть
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {previewMode
            ? "Серая пунктирная линия на графике — что было бы, если бы воздействие применили сейчас."
            : "Двигайте ползунки — двойник немедленно отрабатывает воздействие."}
        </p>
        <div className="mt-4 space-y-4">
          <Slider
            label="Мощность нагревателя"
            value={shown.heater}
            percent={heaterPercent}
            onChange={(v) => previewMode
              ? onPreviewControls({ ...shown, heater: v })
              : setControls((c) => ({ ...c, heater: v }))}
            limits={CONTROL_LIMITS.heater}
            accent="accent-indigo-600"
            valueTint="text-indigo-700"
            ticks={["60%", "номинал", "160%"]}
          />
          <Slider
            label="Охлаждение"
            value={shown.cooling}
            percent={coolingPercent}
            onChange={(v) => previewMode
              ? onPreviewControls({ ...shown, cooling: v })
              : setControls((c) => ({ ...c, cooling: v }))}
            limits={CONTROL_LIMITS.cooling}
            accent="accent-sky-600"
            valueTint="text-sky-700"
            ticks={["выкл", "50%", "макс"]}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Диагностика</h2>
        <div className="mt-3 rounded-2xl border bg-slate-50 p-4">
          <p className="font-semibold">{rec[0]}</p>
          <p className="mt-2 text-sm text-slate-600">{rec[1]}</p>
          <p className="mt-3 rounded-xl bg-white p-3 text-sm font-medium">{rec[2]}</p>
          <div className="mt-3">
            <EvidenceBar ev={ev} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Сценарии отказов</h2>
        <div className="mt-3 space-y-2">
          {(Object.entries(SCENARIOS) as [ModeKey, readonly [string, string]][]).map(([key, [name, desc]]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                mode === key
                  ? "border-indigo-700 bg-indigo-700 text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              <b className="text-sm">{name}</b>
              <p className={`text-xs ${mode === key ? "text-indigo-100" : "text-slate-500"}`}>{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
