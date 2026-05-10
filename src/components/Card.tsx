import { usePresenter } from "../contexts/PresenterContext";

export function toneClass(tone: string): string {
  if (tone === "alarm") return "border-red-300 bg-red-50 text-red-800";
  if (tone === "warn") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

export interface CardProps {
  title: string;
  value: number;
  unit: string;
  tone: string;
  hint: string;
}

export function Card({ title, value, unit, tone, hint }: CardProps) {
  const presenter = usePresenter();
  const sizeValue = presenter ? "text-4xl" : "text-2xl";
  const sizeUnit = presenter ? "text-base" : "text-sm";
  const sizeTitle = presenter ? "text-sm" : "text-xs";
  const sizeHint = presenter ? "text-sm" : "text-xs";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(tone)}`}>
      <p className={`${sizeTitle} uppercase opacity-70`}>{title}</p>
      <p className={`mt-2 ${sizeValue} font-semibold`}>
        {value} <span className={sizeUnit}>{unit}</span>
      </p>
      <p className={`mt-2 ${sizeHint} opacity-80`}>{hint}</p>
    </div>
  );
}
