import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CONTROL_LIMITS,
  DEFAULT_CONTROLS,
  DT,
  FORECAST_STEPS,
  FORMULAS,
  H,
  HISTORY_FRACTION,
  IDLE_RESET_MS,
  N,
  PAD,
  SCENARIOS,
  SERIES,
  W,
  advice,
  build,
  clamp,
  evidence,
  forecast,
  fx,
  hoverUnit,
  hoverValue,
  paramTone,
  point,
  risk,
  runTests,
  seed,
  sx,
  sy,
  type ChartDataPoint,
  type Controls,
  type DataPoint,
  type ForecastPoint,
  type ModeKey,
  type SeriesItem,
} from "./models/digitalTwin";
import { TheorySection } from "./components/TheorySection";
import { Tex } from "./components/Tex";

declare global {
  interface Window {
    __FTI_TESTS__?: boolean;
  }
}

interface ChartProps {
  rows: ChartDataPoint[];
  fc: ForecastPoint[];
  running: boolean;
  last: number;
}

const FORECAST_KEYS = ["t", "pChart"] as const;
const FORECAST_META: Record<(typeof FORECAST_KEYS)[number], { color: string; domain: number[]; width: number }> = {
  t: { color: SERIES.find((s) => s[0] === "t")![2], domain: SERIES.find((s) => s[0] === "t")![3], width: 2.4 },
  pChart: { color: SERIES.find((s) => s[0] === "pChart")![2], domain: SERIES.find((s) => s[0] === "pChart")![3], width: 2 },
};

function Chart({ rows, fc, running, last }: ChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [now, setNow] = useState(Date.now());
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return undefined;
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [running]);

  const data = rows.slice(-N);
  const phase = clamp((now - last) / DT, 0, 1);
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;
  const pwH = pw * HISTORY_FRACTION;
  const pwF = pw - pwH;
  const nowX = PAD.l + pwH;
  const x = (idx: number) => PAD.l + sx(idx, data.length, phase, pwH);
  const xFc = (step: number) => PAD.l + fx(step, phase, pwH, pwF);
  const y = (val: number, domain: number[]) => PAD.t + sy(val, domain, ph);
  const path = (series: SeriesItem): string =>
    data.map((row, idx) => `${idx ? "L" : "M"}${x(idx).toFixed(1)},${y(row[series[0] as keyof ChartDataPoint] as number, series[3]).toFixed(1)}`).join(" ");

  const lastIdx = data.length - 1;
  const lastRow = data[lastIdx];
  const bandKey = { t: "tBand", pChart: "pChartBand" } as const;
  const forecastPath = (key: (typeof FORECAST_KEYS)[number]): string => {
    if (!fc.length || !lastRow) return "";
    const domain = FORECAST_META[key].domain;
    const segments = [`M${x(lastIdx).toFixed(1)},${y(lastRow[key] as number, domain).toFixed(1)}`];
    for (const fp of fc) {
      segments.push(`L${xFc(fp.step).toFixed(1)},${y(fp[key], domain).toFixed(1)}`);
    }
    return segments.join(" ");
  };
  const bandPath = (key: (typeof FORECAST_KEYS)[number]): string => {
    if (!fc.length || !lastRow) return "";
    const domain = FORECAST_META[key].domain;
    const bk = bandKey[key];
    const startX = x(lastIdx).toFixed(1);
    const startY = y(lastRow[key] as number, domain).toFixed(1);
    const upper = fc.map((fp) => `L${xFc(fp.step).toFixed(1)},${y(fp[key] + fp[bk], domain).toFixed(1)}`);
    const lower = fc
      .slice()
      .reverse()
      .map((fp) => `L${xFc(fp.step).toFixed(1)},${y(fp[key] - fp[bk], domain).toFixed(1)}`);
    return [`M${startX},${startY}`, ...upper, ...lower, "Z"].join(" ");
  };

  function move(event: React.MouseEvent<SVGSVGElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xx = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * W;
    if (xx > nowX || xx < PAD.l) {
      setHover(null);
      return;
    }
    const step = pwH / (N - 1);
    setHover(clamp(Math.round(data.length - 1 + phase - (nowX - xx) / step), 0, data.length - 1));
  }

  const h = hover == null ? null : data[hover];

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-full w-full select-none" onMouseMove={move} onMouseLeave={() => setHover(null)}>
      <rect width={W} height={H} fill="white" />
      <rect x={PAD.l} y={PAD.t} width={pw} height={ph} rx="12" fill="#f8fafc" />

      {[0, 0.25, 0.5, 0.75, 1].map((row, i) => (
        <line key={`h-${i}`} x1={PAD.l} x2={PAD.l + pw} y1={PAD.t + row * ph} y2={PAD.t + row * ph} stroke="#e2e8f0" strokeDasharray="4 5" />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((col, i) => (
        <line key={`v-${i}`} x1={PAD.l + col * pw} x2={PAD.l + col * pw} y1={PAD.t} y2={PAD.t + ph} stroke="#e2e8f0" strokeDasharray="4 5" />
      ))}

      <clipPath id="fti-telemetry-clip">
        <rect x={PAD.l} y={PAD.t} width={pw} height={ph} rx="12" />
      </clipPath>

      <g clipPath="url(#fti-telemetry-clip)">
        <rect x={nowX} y={PAD.t} width={pwF} height={ph} fill="#6366f1" opacity="0.07" />
        {SERIES.map((series) => (
          <path key={series[0]} d={path(series)} fill="none" stroke={series[2]} strokeWidth={series[0] === "t" ? 2.7 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {FORECAST_KEYS.map((key) => (
          <path key={`band-${key}`} d={bandPath(key)} fill={FORECAST_META[key].color} opacity="0.13" stroke="none" />
        ))}
        {FORECAST_KEYS.map((key) => (
          <path key={`fc-${key}`} d={forecastPath(key)} fill="none" stroke={FORECAST_META[key].color} strokeWidth={FORECAST_META[key].width} strokeLinecap="round" strokeDasharray="6 5" opacity="0.6" />
        ))}
      </g>

      <line x1={nowX} x2={nowX} y1={PAD.t} y2={PAD.t + ph} stroke="#0f172a" opacity="0.35" />
      <text x={PAD.l + 12} y={PAD.t + ph - 12} fontSize="14" fontWeight="700" fill="#475569">история</text>
      <text x={nowX + 8} y={PAD.t + 22} fontSize="13" fontWeight="800" fill="#4f46e5" letterSpacing="0.06em">ПРОГНОЗ</text>
      <text x={nowX + 8} y={PAD.t + 40} fontSize="11" fontWeight="600" fill="#6366f1">экстраполяция модели</text>

      {[0, 30, 60, 90].map((back) => {
        const xx = nowX - back * (pwH / (N - 1));
        return xx < PAD.l ? null : <text key={back} x={xx} y={H - 9} textAnchor="middle" fontSize="13" fontWeight="600" fill="#64748b">{back ? `-${back}` : "сейчас"}</text>;
      })}
      {[30, 60].map((ahead) => {
        const xx = nowX + ahead * (pwF / FORECAST_STEPS);
        return xx > PAD.l + pw ? null : <text key={`f-${ahead}`} x={xx} y={H - 9} textAnchor="middle" fontSize="13" fontWeight="700" fill="#4f46e5">+{ahead}</text>;
      })}

      {h && (
        <g pointerEvents="none">
          <line x1={x(hover!)} x2={x(hover!)} y1={PAD.t} y2={PAD.t + ph} stroke="#0f172a" opacity="0.25" />
          <rect x={clamp(x(hover!) + 12, PAD.l, W - 275)} y={PAD.t + 10} width="260" height="154" rx="14" fill="white" stroke="#e2e8f0" />
          <text x={clamp(x(hover!) + 26, PAD.l + 14, W - 260)} y={PAD.t + 34} fontSize="16" fontWeight="800" fill="#0f172a">{h.tm}</text>
          {SERIES.map((series, i) => (
            <text key={series[0]} x={clamp(x(hover!) + 26, PAD.l + 14, W - 260)} y={PAD.t + 60 + i * 20} fontSize="14" fontWeight="700" fill={series[2]}>
              {series[1]}: {hoverValue(h!, series[0])} {hoverUnit(series)}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

if (import.meta.env.DEV && typeof window !== "undefined" && !window.__FTI_TESTS__) {
  window.__FTI_TESTS__ = true;
  runTests();
}

function toneClass(tone: string): string {
  if (tone === "alarm") return "border-red-300 bg-red-50 text-red-800";
  if (tone === "warn") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

interface CardProps {
  title: string;
  value: number;
  unit: string;
  tone: string;
  hint: string;
}

function Card({ title, value, unit, tone, hint }: CardProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(tone)}`}>
      <p className="text-xs uppercase opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value} <span className="text-sm">{unit}</span></p>
      <p className="mt-2 text-xs opacity-80">{hint}</p>
    </div>
  );
}

interface EventItem {
  key: string;
  ts: number;
  tm: string;
  title: string;
  text: string;
}

interface SliderProps {
  label: string;
  value: number;
  percent: number;
  onChange: (value: number) => void;
  limits: { min: number; max: number; step: number };
  accent: string;
  valueTint: string;
  ticks: readonly [string, string, string];
}

function Slider({ label, value, percent, onChange, limits, accent, valueTint, ticks }: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className={`font-mono ${valueTint}`}>{percent}%</span>
      </div>
      <input
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-2 w-full ${accent}`}
      />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>{ticks[0]}</span><span>{ticks[1]}</span><span>{ticks[2]}</span>
      </div>
    </div>
  );
}

export default function FTIDigitalTwinPrototype() {
  const [mode, setMode] = useState<ModeKey>("normal");
  const [running, setRunning] = useState(true);
  const [data, setData] = useState<DataPoint[]>(seed);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [last, setLast] = useState(Date.now());
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [kiosk, setKiosk] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const idleRef = useRef(Date.now());

  const latest = data[data.length - 1]!;
  const chart = useMemo(() => build(data), [data]);
  const fc = useMemo(() => forecast(data, mode, controls), [data, mode, controls]);
  const r = useMemo(() => risk(latest), [latest]);
  const ev = useMemo(() => evidence(latest), [latest]);
  const rec = useMemo(() => advice(mode, r), [mode, r]);

  // Симуляционный интервал зависит только от mode/running — слайдеры читаются через ref,
  // иначе каждое движение ползунка пересоздавало бы таймер и сбивало плавность ленты.
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const stamp = Date.now();
      setData((cur) => [...cur.slice(-(N - 1)), point(cur[cur.length - 1]!.k + 1, mode, cur[cur.length - 1], controlsRef.current)]);
      setLast(stamp);
    }, DT);
    return () => clearInterval(id);
  }, [running, mode]);

  useEffect(() => {
    if (r[1] === "ok") return;
    const key = [...r[2], ...r[3]][0]!;
    setEvents((cur) => {
      if (cur[0]?.key === key && Date.now() - cur[0].ts < 7000) return cur;
      const p = paramTone(latest, key);
      // Для дрейфа риск считается по модулю — показываем «±X», иначе пользователь
      // увидит, например, «-42 мВ выше порога», и это сбивает с толку.
      const display = key === "s" ? `±${p.value}` : `${p.raw}`;
      return [{ key, ts: Date.now(), tm: latest.tm, title: `${r[0]}: ${p.label}`, text: `${display} ${p.unit}. ${rec[2]}` }, ...cur].slice(0, 10);
    });
  }, [latest, r, rec]);

  function reset() {
    setMode("normal");
    setData(seed());
    setEvents([]);
    setLast(Date.now());
    setRunning(true);
    setControls(DEFAULT_CONTROLS);
  }

  function bumpIdle() {
    idleRef.current = Date.now();
  }

  useEffect(() => {
    if (!kiosk) return undefined;
    const id = setInterval(() => {
      if (Date.now() - idleRef.current >= IDLE_RESET_MS) {
        reset();
        setShowOnboarding(true);
        idleRef.current = Date.now();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [kiosk]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handler = () => {
      const active = document.fullscreenElement != null;
      setKiosk(active);
      if (active) bumpIdle();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  async function toggleKiosk() {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  function dismissOnboarding() {
    setShowOnboarding(false);
  }

  const heaterPercent = Math.round(controls.heater * 100);
  const coolingPercent = Math.round(controls.cooling * 100);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6" onClick={bumpIdle} onMouseMove={bumpIdle} onTouchStart={bumpIdle} onKeyDown={bumpIdle}>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl lg:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-sm">Кафедра технической физики</p>
            <button onClick={toggleKiosk} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 active:scale-95">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {kiosk ? (
                  <path d="M9 5v4H5M15 5v4h4M9 19v-4H5M15 19v-4h4" />
                ) : (
                  <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
                )}
              </svg>
              {kiosk ? "Выйти из полноэкранного режима" : "Полный экран"}
            </button>
          </div>
          <h1 className="text-3xl font-semibold sm:text-5xl">Цифровой двойник лабораторной установки</h1>
          <p className="mt-4 max-w-3xl text-slate-300">Потоковая телеметрия, сценарии отказов, объяснимая диагностика и журнал событий.</p>
        </header>

        {showOnboarding && (
          <div className="relative rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900 shadow-sm">
            <button onClick={dismissOnboarding} className="absolute right-4 top-4 rounded-full bg-white/70 px-2 text-indigo-700 hover:bg-white" aria-label="Закрыть подсказку">×</button>
            <p className="text-base font-semibold">Как пользоваться демо</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div><b className="block text-indigo-700">1. Управление</b>Двигайте слайдеры мощности и охлаждения — реакция установки видна сразу.</div>
              <div><b className="block text-indigo-700">2. Сценарии</b>Кнопки справа запускают типовые отказы. Двойник реагирует и объясняет причину.</div>
              <div><b className="block text-indigo-700">3. Прогноз</b>Полупрозрачные линии справа — экстраполяция модели на ~21 секунду вперёд.</div>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(r[1])}`}>
            <p className="text-xs uppercase opacity-70">Сценарий</p>
            <p className="mt-2 text-base font-semibold leading-tight">{SCENARIOS[mode][0]}</p>
            <p className="mt-2 text-xs opacity-80">{SCENARIOS[mode][1]}</p>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(r[1])}`}>
            <p className="text-xs uppercase opacity-70">Риск</p>
            <p className="mt-2 text-2xl font-semibold">{ev.score} <span className="text-sm">/ 100</span></p>
            <p className="mt-2 text-xs opacity-80">{r[0]}</p>
          </div>
          <Card title="Температура" value={latest.t} unit="°C" tone={paramTone(latest, "t").tone} hint="Порог: 74 / 82 °C" />
          <Card title="Давление" value={latest.p} unit="Па" tone={paramTone(latest, "p").tone} hint="Порог: 0.035 / 0.06 Па" />
          <Card title="Ток нагрузки" value={latest.i} unit="А" tone={paramTone(latest, "i").tone} hint="Силовая цепь нагревателя" />
          <Card title="Мощность" value={latest.w} unit="Вт" tone={paramTone(latest, "w").tone} hint="P = U × I, U = 24 В" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Потоковая телеметрия</h2>
                <p className="text-sm text-slate-500">Плавная лента: давление на графике масштабировано, в подсказке показаны реальные единицы.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRunning((x) => !x)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{running ? "Пауза" : "Запуск"}</button>
                <button onClick={reset} className="rounded-xl bg-indigo-700 px-3 py-2 text-sm text-white shadow-sm hover:bg-indigo-800">Сброс</button>
              </div>
            </div>
            <div className="h-[330px]">
              <Chart rows={chart} fc={fc} running={running} last={last} />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Расчёт параметров</h3>
                <p className="text-xs text-slate-500">k — номер тика, Δt = 300 мс, ε — измерительный шум</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FORMULAS.map(([name, formula, note]) => (
                  <div key={name} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</p>
                    <div className="mt-1 text-slate-900">
                      <Tex display wrap>{formula}</Tex>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">Управление</h2>
                <button onClick={() => setControls(DEFAULT_CONTROLS)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">сброс</button>
              </div>
              <p className="mt-1 text-xs text-slate-500">Двигайте ползунки — двойник немедленно отрабатывает воздействие.</p>
              <div className="mt-4 space-y-4">
                <Slider
                  label="Мощность нагревателя"
                  value={controls.heater}
                  percent={heaterPercent}
                  onChange={(v) => setControls((c) => ({ ...c, heater: v }))}
                  limits={CONTROL_LIMITS.heater}
                  accent="accent-indigo-600"
                  valueTint="text-indigo-700"
                  ticks={["60%", "номинал", "160%"]}
                />
                <Slider
                  label="Охлаждение"
                  value={controls.cooling}
                  percent={coolingPercent}
                  onChange={(v) => setControls((c) => ({ ...c, cooling: v }))}
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
                {ev.factors.length ? (
                  <div className="mt-3 space-y-2">
                    {ev.factors.map((f) => <p key={f.key} className="rounded-xl bg-white p-2 text-xs"><b>{f.label}:</b> {f.raw} {f.unit}; {f.text}</p>)}
                  </div>
                ) : <p className="mt-3 text-xs text-slate-500">Все параметры в рабочем диапазоне.</p>}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Сценарии отказов</h2>
              <div className="mt-3 space-y-2">
                {(Object.entries(SCENARIOS) as [ModeKey, readonly [string, string]][]).map(([key, [name, desc]]) => (
                  <button key={key} onClick={() => setMode(key)} className={`w-full rounded-2xl border p-3 text-left transition ${mode === key ? "border-indigo-700 bg-indigo-700 text-white shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50"}`}>
                    <b className="text-sm">{name}</b>
                    <p className={`text-xs ${mode === key ? "text-indigo-100" : "text-slate-500"}`}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <TheorySection />

        <section>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Журнал событий</h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {events.length ? events.map((e) => (
                <div key={`${e.ts}-${e.key}`} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between gap-3"><b>{e.title}</b><span className="text-slate-500">{e.tm}</span></div>
                  <p className="mt-1 text-slate-600">{e.text}</p>
                </div>
              )) : <p className="rounded-2xl border border-dashed p-5 text-sm text-slate-500">Отклонений пока нет.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
