// ─── Сценарии ────────────────────────────────────────────────────────────────

export const SCENARIOS = {
  normal: ["Норма", "Параметры установки стабильны."],
  thermal: ["Перегрев", "Температура образца растёт выше профиля."],
  vacuum: ["Утечка вакуума", "Давление в камере постепенно повышается."],
  signal: ["Дрейф сигнала", "Измерительный канал уходит от базовой линии."],
  power: ["Нестабильность питания", "Ток нагрузки и вибрация дают синхронные всплески."],
} as const;

export type ModeKey = keyof typeof SCENARIOS;

// ─── Пороги параметров ────────────────────────────────────────────────────────

export const LIMITS: Record<string, [number, number, string, string]> = {
  t: [74, 82, "°C", "Температура"],
  p: [0.035, 0.06, "Па", "Давление"],
  i: [3.8, 4.4, "А", "Ток нагрузки"],
  w: [90, 106, "Вт", "Мощность нагревателя"],
  v: [1.8, 2.8, "мм/с", "Вибрация"],
  s: [24, 38, "мВ", "Дрейф"],
};

// ─── Ряды графика ─────────────────────────────────────────────────────────────

export type SeriesItem = [string, string, string, number[], string];

export const SERIES: SeriesItem[] = [
  ["t", "Температура", "#ef4444", [45, 96], "°C"],
  ["pChart", "Давление", "#10b981", [6, 95], "Па"],
  ["w", "Мощность", "#f97316", [38, 130], "Вт"],
  ["s", "Дрейф", "#8b5cf6", [-12, 58], "мВ"],
  ["v", "Вибрация", "#0ea5e9", [0.2, 4.2], "мм/с"],
];

// ─── Формулы модели ───────────────────────────────────────────────────────────

export const FORMULAS = [
  ["Температура", "Tₖ₊₁ = Tₖ + f(Pₖ)·Δt + ε", "рост зависит от мощности нагревателя"],
  ["Давление", "pₖ₊₁ = pₖ + Δpутечки + ε", "при утечке давление постепенно растёт"],
  ["Ток нагрузки", "Iₖ₊₁ = Iₖ + ΔIрежима + ε", "характеризует силовую цепь установки"],
  ["Мощность", "Pₖ = U·Iₖ, U = 24 В", "расчётная мощность нагревателя"],
  ["Вибрация", "Vₖ = V₀ + A·sin(k/τ) + ε", "модель механических колебаний"],
  ["Дрейф", "Sₖ₊₁ = Sₖ + ΔSдрейфа + ε", "уход измерительного канала"],
  ["Индекс риска", "R = Σ rᵢ, 0 ≤ R ≤ 100", "сумма вкладов параметров за порогами"],
] as const;

// ─── Константы симуляции ──────────────────────────────────────────────────────

export const DT = 300;         // мс между тиками
export const HEATER_U = 24;   // В, напряжение нагревателя
export const N = 120;          // кол-во точек в буфере
export const W = 900;          // ширина SVG-графика
export const H = 330;          // высота SVG-графика
export const PAD = { l: 44, r: 18, t: 16, b: 30 }; // отступы графика

// ─── Типы данных ──────────────────────────────────────────────────────────────

export interface DataPoint {
  k: number;
  tm: string;
  t: number;
  p: number;
  i: number;
  v: number;
  s: number;
  w: number;
}

export interface ChartDataPoint extends DataPoint {
  pChart: number;
  label: number;
}

export type RiskResult = [string, string, string[], string[]];

export interface EvidenceFactor {
  key: string;
  label: string;
  raw: number;
  unit: string;
  tone: string;
  score: number;
  text: string;
}

export interface EvidenceResult {
  score: number;
  factors: EvidenceFactor[];
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const rnd = (x: number, d: number = 2) => Number(x.toFixed(d));
export const noise = (a: number) => (Math.random() - 0.5) * a;
export const time = () =>
  new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// ─── Генерация точки ──────────────────────────────────────────────────────────

export function point(k: number, mode: string, prev?: DataPoint): DataPoint {
  const q = DT / 900;
  const n = Math.sqrt(q);
  const base = prev || { k: 0, tm: "", t: 58, p: 0.018, i: 2.9, w: rnd(HEATER_U * 2.9, 1), v: 0.8, s: 4 };

  let t = 58 + Math.sin(k / 24) * 2.4 + noise(1.2 * n);
  let p = 0.018 + Math.sin(k / 30) * 0.004 + noise(0.0015 * n);
  let i = 2.9 + Math.sin(k / 22) * 0.16 + noise(0.1 * n);
  let v = 0.82 + Math.sin(k / 16) * 0.12 + noise(0.14 * n);
  let s = 4 + Math.sin(k / 20) * 4 + noise(1.6 * n);

  if (mode === "thermal") {
    i = base.i + 0.12 * q + noise(0.04 * n);
    const overload = clamp((base.i - 3.35) / 1.05, 0, 1.25);
    t = base.t + (0.18 + overload * 0.95) * q + noise(0.3 * n);
  }
  if (mode === "vacuum") {
    p = base.p + 0.0045 * q + noise(0.0018 * n);
    v = base.v + 0.03 * q + noise(0.06 * n);
  }
  if (mode === "signal") {
    s = base.s + 1.7 * q + noise(1.6 * n);
  }
  if (mode === "power") {
    i = 3.3 + Math.abs(Math.sin(k / 4.2)) * 1.4 + noise(0.28 * n);
    v = 1.1 + Math.abs(Math.sin(k / 5.6)) * 2.1 + noise(0.28 * n);
    s = base.s + noise(5.4 * n);
  }

  return {
    k,
    tm: time(),
    t: rnd(clamp(t, 45, 96), 1),
    p: rnd(clamp(p, 0.006, 0.095), 4),
    i: rnd(clamp(i, 1.6, 5.4), 2),
    v: rnd(clamp(v, 0.2, 4.2), 2),
    s: rnd(clamp(s, -12, 58), 1),
    w: rnd(clamp(HEATER_U * i, 38, 130), 1),
  };
}

// ─── Начальные данные ─────────────────────────────────────────────────────────

export function seed(): DataPoint[] {
  const rows: DataPoint[] = [];
  let prev: DataPoint | undefined;
  for (let k = 0; k < N; k += 1) {
    prev = point(k, "normal", prev);
    rows.push(prev);
  }
  return rows;
}

// ─── Диагностика ──────────────────────────────────────────────────────────────

export function risk(m: DataPoint): RiskResult {
  const bad: string[] = [];
  const warn: string[] = [];
  Object.entries(LIMITS).forEach(([key, [w, a]]) => {
    const value = key === "s" ? Math.abs(m[key as keyof DataPoint] as number) : (m[key as keyof DataPoint] as number);
    if (value >= a) bad.push(key);
    else if (value >= w) warn.push(key);
  });
  if (bad.length) return ["Авария", "alarm", bad, warn];
  if (warn.length) return ["Предупреждение", "warn", bad, warn];
  return ["Норма", "ok", bad, warn];
}

export function evidence(m: DataPoint): EvidenceResult {
  const factors = Object.entries(LIMITS)
    .map(([key, [w, a, unit, label]]) => {
      const raw = m[key as keyof DataPoint] as number;
      const value = key === "s" ? Math.abs(raw) : raw;
      const tone = value >= a ? "alarm" : value >= w ? "warn" : "ok";
      const score = tone === "ok" ? 0 : clamp(((value - w) / Math.max(a - w, 0.0001)) * 35 + (tone === "alarm" ? 25 : 8), 0, 60);
      const text = tone === "alarm" ? `выше аварийного порога ${a} ${unit}` : tone === "warn" ? `выше порога ${w} ${unit}` : "в норме";
      return { key, label, raw, unit, tone, score, text };
    })
    .filter((x): x is EvidenceFactor => x.tone !== "ok")
    .sort((a, b) => b.score - a.score);

  return { score: rnd(clamp(factors.reduce((sum, x) => sum + x.score, 0), 0, 100), 0), factors };
}

export function advice(mode: string, r: RiskResult): [string, string, string] {
  const keys = new Set([...r[2], ...r[3]]);
  if (r[1] === "ok") return ["Система работает штатно", "Продолжайте эксперимент и контролируйте тренды.", "Действие не требуется."];
  if (keys.has("t") || keys.has("w") || mode === "thermal") return ["Вероятен перегрев", "Повышенная мощность нагревателя и ток нагрузки предшествуют ускоренному росту температуры.", "Снизить мощность, перевести установку в безопасный режим, сохранить лог."];
  if (keys.has("p") || mode === "vacuum") return ["Вероятна утечка вакуума", "Давление растёт быстрее фонового дрейфа.", "Поставить эксперимент на паузу, проверить клапаны и соединения."];
  if (keys.has("s") || mode === "signal") return ["Дрейф измерительного канала", "Сигнал уходит от базовой линии.", "Проверить заземление, контакты и выполнить калибровку."];
  return ["Нестабильность питания или механики", "Ток нагрузки и вибрация показывают синхронные всплески.", "Отключить нагрузку, проверить источник питания, контакты и крепления."];
}

// ─── Подготовка данных для графика ───────────────────────────────────────────

export function build(rows: DataPoint[]): ChartDataPoint[] {
  return rows.map((x, idx) => ({ ...x, w: rnd(HEATER_U * x.i, 1), pChart: rnd(x.p * 1000, 2), label: idx - rows.length + 1 } as ChartDataPoint));
}

// ─── Координатные функции SVG ─────────────────────────────────────────────────

export function sx(idx: number, len: number, phase: number, plotW: number): number {
  return plotW - ((len - 1 - idx) + phase) * (plotW / (N - 1));
}

export function sy(value: number, domain: number[], plotH: number): number {
  const [min, max] = domain;
  return plotH - clamp((value - min) / Math.max(max - min, 0.0001), 0, 1) * plotH;
}

export function hoverValue(row: ChartDataPoint, key: string): number {
  if (key === "pChart") return row.p;
  return row[key as keyof ChartDataPoint] as number;
}

export function hoverUnit(series: SeriesItem): string {
  return series[4];
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

export function runTests() {
  const n: DataPoint = { k: 0, tm: "", t: 60, p: 0.02, i: 3, w: 72, v: 0.8, s: 5 };
  console.assert(risk(n)[0] === "Норма", "normal risk");
  console.assert(risk({ ...n, t: 75 })[0] === "Предупреждение", "warning risk");
  console.assert(risk({ ...n, t: 83 })[0] === "Авария", "alarm risk");
  console.assert(evidence({ ...n, s: -42 }).factors[0].key === "s", "signal abs evidence");
  console.assert(build([{ ...n, p: 0.03 }])[0].pChart === 30, "pressure scaling");
  console.assert(sx(119, 120, 1, 119) === sx(118, 120, 0, 119), "smooth continuity");
  console.assert(seed().length === N, "seed length");
  console.assert(Object.keys(SCENARIOS).length === 5, "scenario count");
  console.assert(SERIES.length === 5, "series count");
  console.assert(FORMULAS.length === 7, "formula count");
  console.assert(hoverValue({ ...n, p: 0.03, pChart: 30, label: 0 }, "pChart") === 0.03, "hover should show real pressure value");
  console.assert(hoverUnit(SERIES[0]!) === "°C", "series should expose units for tooltip");

  const sample = point(1, "normal", n);
  console.assert(sample.w === rnd(sample.i * HEATER_U, 1), "heater power formula");

  const hot1 = point(1, "thermal", { ...n, i: 3.1, t: 60 });
  const hot2 = point(2, "thermal", { ...n, i: 4.3, t: 60 });
  console.assert(hot2.t >= hot1.t, "temperature should react stronger after current overload");
}
