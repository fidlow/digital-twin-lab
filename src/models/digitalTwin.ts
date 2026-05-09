// ─── Сценарии ────────────────────────────────────────────────────────────────

export const SCENARIOS = {
  normal: ["Норма", "Параметры установки стабильны."],
  thermal: ["Перегрев", "Температура образца растёт выше профиля."],
  vacuum: ["Утечка вакуума", "Давление в камере постепенно повышается."],
  signal: ["Дрейф сигнала", "Измерительный канал уходит от базовой линии."],
  power: ["Нестабильность питания", "Ток нагрузки и вибрация дают синхронные всплески."],
} as const;

export type ModeKey = keyof typeof SCENARIOS;
export type RiskLevel = "ok" | "warn" | "alarm";

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
  ["Температура", String.raw`T_{k+1} = T_k + \big(\alpha I^2 - \beta\,(T_k - T_a)\big)\,\Delta t + \varepsilon`, "α — нагрев, β — теплопотери (растёт при охлаждении), Tₐ = 25 °C — окружение"],
  ["Давление", String.raw`p_{k+1} = p_k + \Delta p_{\text{утечки}} + \varepsilon`, "Δp_утечки — скорость утечки, активна в сценарии «Утечка вакуума»"],
  ["Ток нагрузки", String.raw`I_k = I_{\text{баз}}\,u_h + \Delta I_{\text{реж}} + \varepsilon`, "I_баз ≈ 2,9 А, u_h — ползунок нагревателя (0,6–1,6), ΔI_реж — добавка сценария"],
  ["Мощность", String.raw`P_k = U \cdot I_k`, "U = 24 В — напряжение питания нагревателя"],
  ["Вибрация", String.raw`V_k = V_0 + A\sin(k/\tau) + \varepsilon`, "V₀ — фоновый уровень, A — амплитуда, τ — период"],
  ["Дрейф", String.raw`S_{k+1} = S_k + \Delta S_{\text{дрейфа}} + \varepsilon`, "ΔS_дрейфа — скорость ухода базовой линии (сценарий «Дрейф»)"],
  ["Индекс риска", String.raw`R = \sum_i r_i, \quad 0 \le R \le 100`, "rᵢ — вклад каждого параметра, превысившего порог"],
  ["Прогноз", String.raw`\hat x_{k+j} = f(\hat x_{k+j-1},\,u,\,m), \quad \sigma(j) = \sigma_0 \sqrt{j}`, "x̂ — оценка, j — шагов вперёд, u — управление, m — сценарий; коридор расширяется как √j"],
] as const;

// ─── Константы симуляции ──────────────────────────────────────────────────────

export const DT = 300;         // мс между тиками
export const HEATER_U = 24;   // В, напряжение нагревателя
export const N = 120;          // кол-во точек в буфере
export const W = 900;          // ширина SVG-графика
export const H = 330;          // высота SVG-графика
export const PAD = { l: 44, r: 18, t: 16, b: 30 }; // отступы графика
export const HISTORY_FRACTION = 0.78; // доля ширины графика под историю (остаток — прогноз)
export const FORECAST_STEPS = 70;     // шагов вперёд (≈21 сек при DT=300)
export const T_AMBIENT = 25;          // °C, температура окружения
export const IDLE_RESET_MS = 60_000;  // мс простоя до автосброса в kiosk-режиме
export const T_FORECAST_NOISE = 0.5;  // 1σ температуры на √шаг — ширина коридора неопределённости
export const P_FORECAST_NOISE = 0.0006; // 1σ давления на √шаг (в Па)

// ─── Тепловая модель ──────────────────────────────────────────────────────────
// T_{k+1} = T_k + (α·I² − (β + γ·cooling)·(T_k − Tₐ))·Δt
// При нагревателе на номинале (I≈2.9 А) равновесие около 58 °C; heater ≈ 1.33 уже
// разгоняет до аварии, охлаждение на максимуме держит T в районе ~35 °C.
export const HEAT_IN_K = 0.46;            // α — Джоулев нагрев на единицу I²
export const HEAT_LOSS_NAT = 0.12;        // β — естественные теплопотери в среду
export const HEAT_LOSS_COOL = 0.3;        // γ — добавка к потерям при cooling=1
export const THERMAL_HEAT_INJECT = 5.0;   // независимый внешний теплопоток в сценарии «Перегрев»
                                          // (повреждённая изоляция / заклинивший термостат — heater не помогает)

// ─── Контролы оператора ──────────────────────────────────────────────────────

export interface Controls {
  heater: number;  // 0.6..1.6 — множитель тока относительно номинала сценария
  cooling: number; // 0..1   — интенсивность охлаждения, 0 = выключено
}

export const DEFAULT_CONTROLS: Controls = { heater: 1, cooling: 0 };
export const CONTROL_LIMITS = {
  heater: { min: 0.6, max: 1.6, step: 0.02 },
  cooling: { min: 0, max: 1, step: 0.02 },
} as const;

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

export type RiskResult = [string, RiskLevel, string[], string[]];

export interface EvidenceFactor {
  key: string;
  label: string;
  raw: number;
  unit: string;
  tone: RiskLevel;
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

const LIMITS_ENTRIES = Object.entries(LIMITS);

export interface PointOpts { quiet?: boolean }

export function point(k: number, mode: ModeKey, prev?: DataPoint, controls: Controls = DEFAULT_CONTROLS, opts: PointOpts = {}): DataPoint {
  const q = DT / 900;
  const n = Math.sqrt(q);
  const nz = opts.quiet ? () => 0 : noise;
  // Косметические синусы — это «дыхание» живой ленты, не физика. В прогнозе их глушим,
  // иначе тень будущего пульсирует декорацией вместо того, чтобы показывать тренд.
  const cyc = opts.quiet ? 0 : 1;
  const base = prev || { k: 0, tm: "", t: 58, p: 0.018, i: 2.9, w: rnd(HEATER_U * 2.9, 1), v: 0.8, s: 4 };

  let p = 0.018 + Math.sin(k / 30) * 0.004 * cyc + nz(0.0015 * n);
  let i = 2.9 + Math.sin(k / 22) * 0.16 * cyc + nz(0.1 * n);
  let v = 0.82 + Math.sin(k / 16) * 0.12 * cyc + nz(0.14 * n);
  let s = 4 + Math.sin(k / 20) * 4 * cyc + nz(1.6 * n);

  if (mode === "thermal") {
    i = base.i + 0.12 * q + nz(0.04 * n);
  }
  if (mode === "vacuum") {
    p = base.p + 0.0045 * q + nz(0.0018 * n);
    v = base.v + 0.03 * q + nz(0.06 * n);
  }
  if (mode === "signal") {
    s = base.s + 1.7 * q + nz(1.6 * n);
  }
  if (mode === "power") {
    i = 3.3 + Math.abs(Math.sin(k / 4.2)) * 1.4 + nz(0.28 * n);
    v = 1.1 + Math.abs(Math.sin(k / 5.6)) * 2.1 + nz(0.28 * n);
    s = base.s + nz(5.4 * n);
  }

  i = i * controls.heater;

  // Накапливающаяся тепловая модель: heater разгоняет нагрев через I², cooling
  // увеличивает теплопотери. «Перегрев» добавляет внешний теплопоток, не зависящий
  // от heater — снижение мощности помогает лишь частично, спасает охлаждение.
  const externalHeat = mode === "thermal" ? THERMAL_HEAT_INJECT : 0;
  const heatIn = HEAT_IN_K * i * i + externalHeat;
  const heatLoss = (HEAT_LOSS_NAT + controls.cooling * HEAT_LOSS_COOL) * (base.t - T_AMBIENT);
  const t = base.t + (heatIn - heatLoss) * q + nz(0.3 * n);

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

export interface ParamTone {
  raw: number;       // знаковое значение параметра
  value: number;     // значение для сравнения с порогами (для «s» — модуль)
  tone: RiskLevel;
  warnAt: number;
  alarmAt: number;
  unit: string;
  label: string;
}

// Единая точка истины для оценки одного параметра: используется в risk/evidence
// и в карточках UI, чтобы пороги и знаковая семантика «s» не расходились.
export function paramTone(m: DataPoint, key: string): ParamTone {
  const [warnAt, alarmAt, unit, label] = LIMITS[key]!;
  const raw = m[key as keyof DataPoint] as number;
  const value = key === "s" ? Math.abs(raw) : raw;
  const tone: RiskLevel = value >= alarmAt ? "alarm" : value >= warnAt ? "warn" : "ok";
  return { raw, value, tone, warnAt, alarmAt, unit, label };
}

export function risk(m: DataPoint): RiskResult {
  const bad: string[] = [];
  const warn: string[] = [];
  LIMITS_ENTRIES.forEach(([key]) => {
    const t = paramTone(m, key).tone;
    if (t === "alarm") bad.push(key);
    else if (t === "warn") warn.push(key);
  });
  if (bad.length) return ["Авария", "alarm", bad, warn];
  if (warn.length) return ["Предупреждение", "warn", bad, warn];
  return ["Норма", "ok", bad, warn];
}

export function evidence(m: DataPoint): EvidenceResult {
  const factors = LIMITS_ENTRIES
    .map(([key]) => {
      const p = paramTone(m, key);
      const score = p.tone === "ok" ? 0 : clamp(((p.value - p.warnAt) / Math.max(p.alarmAt - p.warnAt, 0.0001)) * 35 + (p.tone === "alarm" ? 25 : 8), 0, 60);
      const text = p.tone === "alarm" ? `выше аварийного порога ${p.alarmAt} ${p.unit}` : p.tone === "warn" ? `выше порога ${p.warnAt} ${p.unit}` : "в норме";
      return { key, label: p.label, raw: p.raw, unit: p.unit, tone: p.tone, score, text };
    })
    .filter((x): x is EvidenceFactor => x.tone !== "ok")
    .sort((a, b) => b.score - a.score);

  return { score: rnd(clamp(factors.reduce((sum, x) => sum + x.score, 0), 0, 100), 0), factors };
}

export function advice(mode: ModeKey, r: RiskResult): [string, string, string] {
  const keys = new Set([...r[2], ...r[3]]);
  if (r[1] === "ok") return ["Система работает штатно", "Продолжайте эксперимент и контролируйте тренды.", "Действие не требуется."];
  if (keys.has("t") || keys.has("w") || mode === "thermal") return ["Вероятен перегрев", "Внешний теплопоток превышает естественные потери — снижение мощности нагревателя поможет лишь частично.", "Включить охлаждение и снизить мощность, перевести установку в безопасный режим."];
  if (keys.has("p") || mode === "vacuum") return ["Вероятна утечка вакуума", "Давление растёт быстрее фонового дрейфа.", "Поставить эксперимент на паузу, проверить клапаны и соединения."];
  if (keys.has("s") || mode === "signal") return ["Дрейф измерительного канала", "Сигнал уходит от базовой линии.", "Проверить заземление, контакты и выполнить калибровку."];
  return ["Нестабильность питания или механики", "Ток нагрузки и вибрация показывают синхронные всплески.", "Отключить нагрузку, проверить источник питания, контакты и крепления."];
}

// ─── Подготовка данных для графика ───────────────────────────────────────────

export function build(rows: DataPoint[]): ChartDataPoint[] {
  return rows.map((x, idx) => ({ ...x, pChart: rnd(x.p * 1000, 2), label: idx - rows.length + 1 } as ChartDataPoint));
}

// ─── Прогноз («тень будущего») ────────────────────────────────────────────────
// Физический прогноз: тот же point() прокручивается вперёд без шума с фиксированными
// mode и controls. То есть «что будет, если оператор ничего не изменит». Шум подменяется
// доверительным коридором ±σ·√step (random-walk-приближение).

export interface ForecastPoint {
  step: number; // 1..FORECAST_STEPS, шаг от «сейчас»
  t: number;
  p: number;
  pChart: number;
  tBand: number;       // ±°C, σ температуры на этом шаге
  pChartBand: number;  // ±ед. шкалы давления на графике
}

export function forecast(rows: DataPoint[], mode: ModeKey, controls: Controls, steps: number = FORECAST_STEPS): ForecastPoint[] {
  if (rows.length < 1 || steps <= 0) return [];
  const out: ForecastPoint[] = [];
  let prev = rows[rows.length - 1]!;
  for (let i = 1; i <= steps; i += 1) {
    const next = point(prev.k + i, mode, prev, controls, { quiet: true });
    const sqrtStep = Math.sqrt(i);
    out.push({
      step: i,
      t: next.t,
      p: next.p,
      pChart: rnd(next.p * 1000, 2),
      tBand: rnd(T_FORECAST_NOISE * sqrtStep, 2),
      pChartBand: rnd(P_FORECAST_NOISE * 1000 * sqrtStep, 2),
    });
    prev = next;
  }
  return out;
}

// ─── Координатные функции SVG ─────────────────────────────────────────────────

export function sx(idx: number, len: number, phase: number, plotW: number): number {
  return plotW - ((len - 1 - idx) + phase) * (plotW / (N - 1));
}

export function fx(step: number, phase: number, historyW: number, forecastW: number, steps: number = FORECAST_STEPS): number {
  // step ∈ [1..steps], phase ∈ [0..1], сдвигаем прогноз синхронно с лентой истории.
  return historyW + (step - phase) * (forecastW / steps);
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
  console.assert(FORMULAS.length === 8, "formula count");
  console.assert(hoverValue({ ...n, p: 0.03, pChart: 30, label: 0 }, "pChart") === 0.03, "hover should show real pressure value");
  console.assert(hoverUnit(SERIES[0]!) === "°C", "series should expose units for tooltip");

  const sample = point(1, "normal", n);
  console.assert(sample.w === rnd(sample.i * HEATER_U, 1), "heater power formula");

  const hot1 = point(1, "thermal", { ...n, i: 3.1, t: 60 });
  const hot2 = point(2, "thermal", { ...n, i: 4.3, t: 60 });
  console.assert(hot2.t >= hot1.t, "temperature should react stronger after current overload");

  const boosted = point(1, "normal", n, { heater: 1.4, cooling: 0 });
  const baseline = point(1, "normal", n, DEFAULT_CONTROLS);
  console.assert(boosted.i >= baseline.i, "heater control should raise current");

  const cooled = point(1, "normal", { ...n, t: 80 }, { heater: 1, cooling: 1 });
  const noCool = point(1, "normal", { ...n, t: 80 }, DEFAULT_CONTROLS);
  console.assert(cooled.t <= noCool.t, "cooling control should reduce temperature");

  const heaterHot = point(1, "normal", { ...n, t: 70 }, { heater: 1.5, cooling: 0 });
  const heaterCold = point(1, "normal", { ...n, t: 70 }, DEFAULT_CONTROLS);
  console.assert(heaterHot.t > heaterCold.t, "heater should raise temperature even in normal mode");

  const thermalMinHeater = point(1, "thermal", { ...n, t: 70, i: 2 }, { heater: 0.6, cooling: 0 });
  console.assert(thermalMinHeater.t > 70, "thermal injects external heat even when heater is at minimum");

  const thermalCooled = point(1, "thermal", { ...n, t: 80, i: 3 }, { heater: 1, cooling: 1 });
  console.assert(thermalCooled.t < 80, "cooling counters the thermal scenario");

  const trend: DataPoint[] = [];
  for (let k = 0; k < 5; k += 1) trend.push({ ...n, k, t: 60, p: 0.02 });
  const fcThermal = forecast(trend, "thermal", DEFAULT_CONTROLS, 10);
  console.assert(fcThermal.length === 10, "forecast should produce requested number of steps");
  console.assert(fcThermal[9]!.t > fcThermal[0]!.t, "thermal forecast should rise over time");
  console.assert(fcThermal[9]!.tBand > fcThermal[0]!.tBand, "uncertainty band should widen with horizon");

  const fcCool = forecast([{ ...n, k: 0, t: 80 }], "thermal", { heater: 1, cooling: 1 }, 10);
  const fcNoCool = forecast([{ ...n, k: 0, t: 80 }], "thermal", DEFAULT_CONTROLS, 10);
  console.assert(fcCool[9]!.t < fcNoCool[9]!.t, "cooling slider should bend forecast downward");
  console.assert(fcCool[0]!.pChart === rnd(fcCool[0]!.p * 1000, 2), "forecast pChart should mirror p scaling");
}
