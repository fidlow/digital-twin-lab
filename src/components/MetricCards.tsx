import { paramTone, SCENARIOS, type DataPoint, type EvidenceResult, type ModeKey, type RiskResult } from "../models/digitalTwin";
import { Card, toneClass } from "./Card";
import { usePresenter } from "../contexts/PresenterContext";

interface MetricCardsProps {
  mode: ModeKey;
  latest: DataPoint;
  riskResult: RiskResult;
  ev: EvidenceResult;
}

export function MetricCards({ mode, latest, riskResult, ev }: MetricCardsProps) {
  const presenter = usePresenter();
  const sizeRisk = presenter ? "text-5xl" : "text-2xl";
  const sizeName = presenter ? "text-xl" : "text-base";
  const sizeMeta = presenter ? "text-sm" : "text-xs";

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        <p className={`${sizeMeta} uppercase opacity-70`}>Сценарий</p>
        <p className={`mt-2 ${sizeName} font-semibold leading-tight`}>{SCENARIOS[mode][0]}</p>
        <p className={`mt-2 ${sizeMeta} opacity-80`}>{SCENARIOS[mode][1]}</p>
      </div>
      <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        <p className={`${sizeMeta} uppercase opacity-70`}>Риск</p>
        <p className={`mt-2 ${sizeRisk} font-semibold`}>{ev.score} <span className={presenter ? "text-base" : "text-sm"}>/ 100</span></p>
        <p className={`mt-2 ${sizeMeta} opacity-80`}>{riskResult[0]}</p>
      </div>
      <Card title="Температура" value={latest.t} unit="°C" tone={paramTone(latest, "t").tone} hint="Порог: 74 / 82 °C" />
      <Card title="Давление" value={latest.p} unit="Па" tone={paramTone(latest, "p").tone} hint="Порог: 0.035 / 0.06 Па" />
      <Card title="Ток нагрузки" value={latest.i} unit="А" tone={paramTone(latest, "i").tone} hint="Силовая цепь нагревателя" />
      <Card title="Мощность" value={latest.w} unit="Вт" tone={paramTone(latest, "w").tone} hint="P = U × I, U = 24 В" />
    </section>
  );
}
