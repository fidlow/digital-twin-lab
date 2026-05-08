import React, { useEffect, useMemo, useRef, useState } from "react";

const SCENARIOS = {
  normal: ["Норма", "Параметры установки стабильны."],
  thermal: ["Перегрев", "Температура образца растёт выше профиля."],
  vacuum: ["Утечка вакуума", "Давление в камере постепенно повышается."],
  signal: ["Дрейф сигнала", "Измерительный канал уходит от базовой линии."],
  power: ["Нестабильность питания", "Ток нагрузки и вибрация дают синхронные всплески."],
};

const LIMITS = {
  t: [74, 82, "°C", "Температура"],
  p: [0.035, 0.06, "Па", "Давление"],
  i: [3.8, 4.4, "А", "Ток нагрузки"],
  w: [90, 106, "Вт", "Мощность нагревателя"],
  v: [1.8, 2.8, "мм/с", "Вибрация"],
  s: [24, 38, "мВ", "Дрейф"],
};

const SERIES = [
  ["t", "Температура", "#ef4444", [45, 96], "°C"],
  ["pChart", "Давление", "#10b981", [6, 95], "Па"],
  ["w", "Мощность", "#f97316", [38, 130], "Вт"],
  ["s", "Дрейф", "#8b5cf6", [-12, 58], "мВ"],
  ["v", "Вибрация", "#0ea5e9", [0.2, 4.2], "мм/с"],
];

const FORMULAS = [
  ["Температура", "Tₖ₊₁ = Tₖ + f(Pₖ)·Δt + ε", "рост зависит от мощности нагревателя"],
  ["Давление", "pₖ₊₁ = pₖ + Δpутечки + ε", "при утечке давление постепенно растёт"],
  ["Ток нагрузки", "Iₖ₊₁ = Iₖ + ΔIрежима + ε", "характеризует силовую цепь установки"],
  ["Мощность", "Pₖ = U·Iₖ, U = 24 В", "расчётная мощность нагревателя"],
  ["Вибрация", "Vₖ = V₀ + A·sin(k/τ) + ε", "модель механических колебаний"],
  ["Дрейф", "Sₖ₊₁ = Sₖ + ΔSдрейфа + ε", "уход измерительного канала"],
  ["Индекс риска", "R = Σ rᵢ, 0 ≤ R ≤ 100", "сумма вкладов параметров за порогами"],
];

const DT = 300;
const HEATER_U = 24;
const N = 120;
const W = 900;
const H = 330;
const PAD = { l: 44, r: 18, t: 16, b: 30 };

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (x, d = 2) => Number(x.toFixed(d));
const noise = (a) => (Math.random() - 0.5) * a;
const time = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function point(k, mode, prev) {
  const q = DT / 900;
  const n = Math.sqrt(q);
  const base = prev || { t: 58, p: 0.018, i: 2.9, w: rnd(HEATER_U * 2.9, 1), v: 0.8, s: 4 };

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

function seed() {
  const rows = [];
  let prev;
  for (let k = 0; k < N; k += 1) {
    prev = point(k, "normal", prev);
    rows.push(prev);
  }
  return rows;
}

function risk(m) {
  const bad = [];
  const warn = [];
  Object.entries(LIMITS).forEach(([key, [w, a]]) => {
    const value = key === "s" ? Math.abs(m[key]) : m[key];
    if (value >= a) bad.push(key);
    else if (value >= w) warn.push(key);
  });
  if (bad.length) return ["Авария", "alarm", bad, warn];
  if (warn.length) return ["Предупреждение", "warn", bad, warn];
  return ["Норма", "ok", bad, warn];
}

function evidence(m) {
  const factors = Object.entries(LIMITS)
    .map(([key, [w, a, unit, label]]) => {
      const raw = m[key];
      const value = key === "s" ? Math.abs(raw) : raw;
      const tone = value >= a ? "alarm" : value >= w ? "warn" : "ok";
      const score = tone === "ok" ? 0 : clamp(((value - w) / Math.max(a - w, 0.0001)) * 35 + (tone === "alarm" ? 25 : 8), 0, 60);
      const text = tone === "alarm" ? `выше аварийного порога ${a} ${unit}` : tone === "warn" ? `выше порога ${w} ${unit}` : "в норме";
      return { key, label, raw, unit, tone, score, text };
    })
    .filter((x) => x.tone !== "ok")
    .sort((a, b) => b.score - a.score);

  return { score: rnd(clamp(factors.reduce((sum, x) => sum + x.score, 0), 0, 100), 0), factors };
}

function advice(mode, r) {
  const keys = new Set([...r[2], ...r[3]]);
  if (r[1] === "ok") return ["Система работает штатно", "Продолжайте эксперимент и контролируйте тренды.", "Действие не требуется."];
  if (keys.has("t") || keys.has("w") || mode === "thermal") return ["Вероятен перегрев", "Повышенная мощность нагревателя и ток нагрузки предшествуют ускоренному росту температуры.", "Снизить мощность, перевести установку в безопасный режим, сохранить лог."];
  if (keys.has("p") || mode === "vacuum") return ["Вероятна утечка вакуума", "Давление растёт быстрее фонового дрейфа.", "Поставить эксперимент на паузу, проверить клапаны и соединения."];
  if (keys.has("s") || mode === "signal") return ["Дрейф измерительного канала", "Сигнал уходит от базовой линии.", "Проверить заземление, контакты и выполнить калибровку."];
  return ["Нестабильность питания или механики", "Ток нагрузки и вибрация показывают синхронные всплески.", "Отключить нагрузку, проверить источник питания, контакты и крепления."];
}

function build(rows) {
  return rows.map((x, idx) => ({ ...x, w: rnd(HEATER_U * x.i, 1), pChart: rnd(x.p * 1000, 2), label: idx - rows.length + 1 }));
}

function sx(idx, len, phase, plotW) {
  return plotW - ((len - 1 - idx) + phase) * (plotW / (N - 1));
}

function sy(value, domain, plotH) {
  const [min, max] = domain;
  return plotH - clamp((value - min) / Math.max(max - min, 0.0001), 0, 1) * plotH;
}

function hoverValue(row, key) {
  if (key === "pChart") return row.p;
  return row[key];
}

function hoverUnit(series) {
  return series[4] || "";
}

function Chart({ rows, running, last }) {
  const ref = useRef(null);
  const [now, setNow] = useState(Date.now());
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!running) return undefined;
    let frameId;
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
  const x = (idx) => PAD.l + sx(idx, data.length, phase, pw);
  const y = (val, domain) => PAD.t + sy(val, domain, ph);
  const path = ([key, , , domain]) => data.map((row, idx) => `${idx ? "L" : "M"}${x(idx).toFixed(1)},${y(row[key], domain).toFixed(1)}`).join(" ");

  function move(event) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xx = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * W;
    const step = pw / (N - 1);
    setHover(clamp(Math.round(data.length - 1 + phase - (PAD.l + pw - xx) / step), 0, data.length - 1));
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
        {SERIES.map((series) => (
          <path key={series[0]} d={path(series)} fill="none" stroke={series[2]} strokeWidth={series[0] === "t" ? 2.7 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>

      <line x1={PAD.l + pw - 1} x2={PAD.l + pw - 1} y1={PAD.t} y2={PAD.t + ph} stroke="#0f172a" opacity="0.28" />
      <text x={PAD.l + pw - 92} y={PAD.t + ph - 12} fontSize="14" fontWeight="600" fill="#64748b">история ← live</text>

      {[0, 30, 60, 90, 120].map((back) => {
        const xx = PAD.l + pw - back * (pw / (N - 1));
        return xx < PAD.l ? null : <text key={back} x={xx} y={H - 9} textAnchor="middle" fontSize="13" fontWeight="600" fill="#64748b">{back ? `-${back}` : "сейчас"}</text>;
      })}

      {h && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ph} stroke="#0f172a" opacity="0.25" />
          <rect x={clamp(x(hover) + 12, PAD.l, W - 275)} y={PAD.t + 10} width="260" height="154" rx="14" fill="white" stroke="#e2e8f0" />
          <text x={clamp(x(hover) + 26, PAD.l + 14, W - 260)} y={PAD.t + 34} fontSize="16" fontWeight="800" fill="#0f172a">{h.tm}</text>
          {SERIES.map((series, i) => (
            <text key={series[0]} x={clamp(x(hover) + 26, PAD.l + 14, W - 260)} y={PAD.t + 60 + i * 20} fontSize="14" fontWeight="700" fill={series[2]}>
              {series[1]}: {hoverValue(h, series[0])} {hoverUnit(series)}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

function runTests() {
  const n = { t: 60, p: 0.02, i: 3, w: 72, v: 0.8, s: 5 };
  console.assert(risk(n)[0] === "Норма", "normal risk");
  console.assert(risk({ ...n, t: 75 })[0] === "Предупреждение", "warning risk");
  console.assert(risk({ ...n, t: 83 })[0] === "Авария", "alarm risk");
  console.assert(evidence({ ...n, s: -42 }).factors[0].key === "s", "signal abs evidence");
  console.assert(build([{ ...n, k: 1, tm: "", p: 0.03 }])[0].pChart === 30, "pressure scaling");
  console.assert(sx(119, 120, 1, 119) === sx(118, 120, 0, 119), "smooth continuity");
  console.assert(seed().length === N, "seed length");
  console.assert(Object.keys(SCENARIOS).length === 5, "scenario count");
  console.assert(SERIES.length === 5, "series count");
  console.assert(FORMULAS.length === 7, "formula count");
  console.assert(hoverValue({ p: 0.03, pChart: 30 }, "pChart") === 0.03, "hover should show real pressure value");
  console.assert(hoverUnit(SERIES[0]) === "°C", "series should expose units for tooltip");

  const sample = point(1, "normal", n);
  console.assert(sample.w === rnd(sample.i * HEATER_U, 1), "heater power formula");

  const hot1 = point(1, "thermal", { ...n, i: 3.1, t: 60 });
  const hot2 = point(2, "thermal", { ...n, i: 4.3, t: 60 });
  console.assert(hot2.t >= hot1.t, "temperature should react stronger after current overload");
}

if (typeof window !== "undefined" && !window.__FTI_TESTS__) {
  window.__FTI_TESTS__ = true;
  runTests();
}

function Card({ title, value, unit, tone, hint }) {
  const cls = tone === "alarm" ? "border-red-300 bg-red-50 text-red-800" : tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-800";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${cls}`}>
      <p className="text-xs uppercase opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value} <span className="text-sm">{unit}</span></p>
      <p className="mt-2 text-xs opacity-80">{hint}</p>
    </div>
  );
}

export default function FTIDigitalTwinPrototype() {
  const [mode, setMode] = useState("normal");
  const [running, setRunning] = useState(true);
  const [data, setData] = useState(seed);
  const [events, setEvents] = useState([]);
  const [last, setLast] = useState(Date.now());

  const latest = data[data.length - 1];
  const chart = useMemo(() => build(data), [data]);
  const r = useMemo(() => risk(latest), [latest]);
  const ev = useMemo(() => evidence(latest), [latest]);
  const rec = useMemo(() => advice(mode, r), [mode, r]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const stamp = Date.now();
      setData((cur) => [...cur.slice(-(N - 1)), point(cur[cur.length - 1].k + 1, mode, cur[cur.length - 1])]);
      setLast(stamp);
    }, DT);
    return () => clearInterval(id);
  }, [running, mode]);

  useEffect(() => {
    if (r[1] === "ok") return;
    const key = [...r[2], ...r[3]][0];
    setEvents((cur) => {
      if (cur[0]?.key === key && Date.now() - cur[0].ts < 7000) return cur;
      return [{ key, ts: Date.now(), tm: time(), title: `${r[0]}: ${LIMITS[key][3]}`, text: `${latest[key]} ${LIMITS[key][2]}. ${rec[2]}` }, ...cur].slice(0, 10);
    });
  }, [latest, r, rec]);

  function reset() {
    setMode("normal");
    setData(seed());
    setEvents([]);
    setLast(Date.now());
    setRunning(true);
  }

  function tone(key) {
    const x = key === "s" ? Math.abs(latest[key]) : latest[key];
    if (x >= LIMITS[key][1]) return "alarm";
    if (x >= LIMITS[key][0]) return "warn";
    return "ok";
  }

  const statusCls = r[1] === "alarm" ? "bg-red-500" : r[1] === "warn" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
            <div>
              <p className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-sm">Кафедра технической физики</p>
              <h1 className="text-3xl font-semibold sm:text-5xl">Цифровой двойник лабораторной установки</h1>
              <p className="mt-4 max-w-3xl text-slate-300">Потоковая телеметрия, сценарии отказов, объяснимая диагностика и журнал событий.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-sm text-slate-300">Статус</p>
              <div className="mt-2 flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${statusCls}`} />
                <span className="text-3xl font-semibold">{r[0]}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3">Сценарий<br /><b>{SCENARIOS[mode][0]}</b></div>
                <div className="rounded-2xl bg-white/10 p-3">Риск<br /><b>{ev.score}/100</b></div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Температура" value={latest.t} unit="°C" tone={tone("t")} hint="Порог: 74 / 82 °C" />
          <Card title="Давление" value={latest.p} unit="Па" tone={tone("p")} hint="Порог: 0.035 / 0.06 Па" />
          <Card title="Ток нагрузки" value={latest.i} unit="А" tone={tone("i")} hint="Силовая цепь нагревателя" />
          <Card title="Мощность" value={latest.w} unit="Вт" tone={tone("w")} hint="P = U × I, U = 24 В" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Потоковая телеметрия</h2>
                <p className="text-sm text-slate-500">Плавная лента: давление на графике масштабировано, в подсказке показаны реальные единицы.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRunning((x) => !x)} className="rounded-xl border px-3 py-2 text-sm">{running ? "Пауза" : "Запуск"}</button>
                <button onClick={reset} className="rounded-xl bg-slate-950 px-3 py-2 text-sm text-white">Сброс</button>
              </div>
            </div>
            <div className="h-[330px]">
              <Chart rows={chart} running={running} last={last} />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Расчёт параметров</h3>
                <p className="text-xs text-slate-500">ε — случайный шум измерения</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FORMULAS.map(([name, formula, note]) => (
                  <div key={name} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</p>
                    <p className="mt-1 font-mono text-[15px] font-semibold text-slate-900">{formula}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Сценарии</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(SCENARIOS).map(([key, [name, desc]]) => (
                  <button key={key} onClick={() => setMode(key)} className={`w-full rounded-2xl border p-3 text-left ${mode === key ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"}`}>
                    <b className="text-sm">{name}</b>
                    <p className={`text-xs ${mode === key ? "text-slate-300" : "text-slate-500"}`}>{desc}</p>
                  </button>
                ))}
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
          </div>
        </section>

        <section>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Журнал событий</h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {events.length ? events.map((e, i) => (
                <div key={`${e.ts}-${i}`} className="rounded-2xl bg-slate-50 p-3 text-sm">
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
