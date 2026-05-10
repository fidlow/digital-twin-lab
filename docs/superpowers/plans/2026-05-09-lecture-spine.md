# Lecture Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить монолитный `src/App.tsx` (519 строк) в lecture-grade UI: разбить на компоненты, вынести симуляционный цикл в кастомный хук, добавить контрастную presenter-тему с hotkeys, индикатор активного сценария поверх графика и ленту действий преподавателя со снимком состояния.

**Architecture:** Тонкий `App.tsx`-координатор + 3 секционных компонента (`TelemetryChart`, `MetricCards`, `ControlsPanel`) + 2 атомарных компонента (`Card`, `Slider`) + 2 lecture-only компонента (`PresenterIndicator`, `ScenarioTimeline`, `HotkeysOverlay`). Симуляция выводится в хук `useSimulation`, который оборачивает чистую функцию тика `appendTick` (новая, в `digitalTwin.ts`). Presenter-режим прокидывается через React-контекст `PresenterContext`. Модель `digitalTwin.ts` не меняется по физике — только добавляется `appendTick` и smoke-тест в существующий `runTests()`.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind 4 + KaTeX. Никаких новых зависимостей. Тесты — встроенный в `digitalTwin.ts` `runTests()`, вызываемый в DEV-режиме.

---

## File Structure

**Create:**
- `src/components/Card.tsx` — атомарная карточка метрики (1 ответственность: показать title/value/unit/tone/hint)
- `src/components/Slider.tsx` — атомарный ползунок с подписями (1 ответственность: один input range + лейблы)
- `src/components/TelemetryChart.tsx` — SVG-график с историей и прогнозом (вынос текущего `Chart`)
- `src/components/MetricCards.tsx` — секция из 6 карточек метрик
- `src/components/ControlsPanel.tsx` — правая колонка: ползунки + диагностика + сценарии
- `src/components/PresenterIndicator.tsx` — крупный оверлей-ярлык активного сценария
- `src/components/HotkeysOverlay.tsx` — оверлей-cheatsheet (открывается по `?`)
- `src/components/ScenarioTimeline.tsx` — лента действий преподавателя
- `src/contexts/PresenterContext.tsx` — context boolean `presenter` (true когда фуллскрин)
- `src/hooks/useSimulation.ts` — хук симуляционного цикла + событий + idle-reset
- `src/hooks/useHotkeys.ts` — хук-обработчик клавиш `1`–`5`/`Space`/`R`/`F`/`?`
- `src/types/ui.ts` — общие UI-типы (`EventItem`, `ScenarioLogEntry`)

**Modify:**
- `src/App.tsx` — слим-координатор (~100 строк вместо 519)
- `src/main.ts` — переместить вызов `runTests()` сюда (был в App.tsx:188-191)
- `src/models/digitalTwin.ts` — добавить чистую функцию `appendTick` + 4 теста в `runTests()`
- `src/index.css` — добавить пресеты `.presenter` для крупных шрифтов и контрастной темы

**Не трогаем:** физику в `digitalTwin.ts` (`point`, `risk`, `evidence`, `forecast`, `seed`, константы), `src/components/TheorySection`, `src/components/Tex`, любые конфиги (vite/tsconfig/postcss/tailwind).

---

## PR 1 — Extract Base Components

**Цель PR:** Уменьшить App.tsx за счёт выноса всех существующих JSX-компонентов в отдельные файлы. Поведение приложения не меняется ни на пиксель.

### Task 1.1: Extract Card component

**Files:**
- Create: `src/components/Card.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Создать `src/components/Card.tsx`**

Файл копирует `toneClass` (строки 193-197 текущего App.tsx) и `Card` (строки 207-215). Тип `CardProps` (строки 199-205) — туда же. Чтобы `toneClass` могли использовать другие компоненты в будущем (PR-1.4 MetricCards использует тот же класс на не-Card div), экспортируем его.

```tsx
// src/components/Card.tsx
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
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(tone)}`}>
      <p className="text-xs uppercase opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">
        {value} <span className="text-sm">{unit}</span>
      </p>
      <p className="mt-2 text-xs opacity-80">{hint}</p>
    </div>
  );
}
```

- [ ] **Step 2: Удалить `Card`, `CardProps`, `toneClass` из `src/App.tsx`**

Удалить строки 193-215 в App.tsx. Импортировать в App: `import { Card, toneClass } from "./components/Card";` (toneClass пока используется в App.tsx:391, 396 — оставляем импорт).

- [ ] **Step 3: Запустить `npm run dev` и убедиться, что приложение рендерится**

Run: `npm run dev`
Expected: dev-сервер стартует без ошибок. В браузере на http://localhost:5173 шесть карточек метрик отображаются как раньше — те же цвета и текст. Нет ошибок в консоли браузера.

- [ ] **Step 4: Commit**

```bash
git add src/components/Card.tsx src/App.tsx
git commit -m "refactor: extract Card component"
```

### Task 1.2: Extract Slider component

**Files:**
- Create: `src/components/Slider.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Создать `src/components/Slider.tsx`**

Скопировать `SliderProps` (строки 225-233) и `Slider` (строки 236-257) из App.tsx.

```tsx
// src/components/Slider.tsx
export interface SliderProps {
  label: string;
  value: number;
  percent: number;
  onChange: (value: number) => void;
  limits: { min: number; max: number; step: number };
  accent: string;
  valueTint: string;
  ticks: readonly [string, string, string];
}

export function Slider({ label, value, percent, onChange, limits, accent, valueTint, ticks }: SliderProps) {
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
        <span>{ticks[0]}</span>
        <span>{ticks[1]}</span>
        <span>{ticks[2]}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Удалить `Slider` и `SliderProps` из `src/App.tsx`** (строки 225-257)

Импортировать: `import { Slider } from "./components/Slider";`

- [ ] **Step 3: Запустить `npm run dev` и протестировать ползунки**

Run: `npm run dev`
Expected: оба ползунка (Мощность нагревателя, Охлаждение) двигаются, проценты обновляются в реальном времени, симуляция реагирует. Кнопка `сброс` ставит значения обратно.

- [ ] **Step 4: Commit**

```bash
git add src/components/Slider.tsx src/App.tsx
git commit -m "refactor: extract Slider component"
```

### Task 1.3: Extract TelemetryChart component

**Files:**
- Create: `src/components/TelemetryChart.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Создать `src/components/TelemetryChart.tsx`**

Перенести в новый файл: `ChartProps` (строки 47-52), `FORECAST_KEYS` и `FORECAST_META` (строки 54-58), `Chart` (строки 60-186). Переименовать компонент в `TelemetryChart` для консистентности с именем файла.

```tsx
// src/components/TelemetryChart.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  FORECAST_STEPS,
  H,
  HISTORY_FRACTION,
  N,
  PAD,
  SERIES,
  W,
  clamp,
  fx,
  hoverUnit,
  hoverValue,
  sx,
  sy,
  type ChartDataPoint,
  type ForecastPoint,
  type SeriesItem,
} from "../models/digitalTwin";

interface TelemetryChartProps {
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

export function TelemetryChart({ rows, fc, running, last }: TelemetryChartProps) {
  // ... содержимое функции Chart() из App.tsx 60-186 ...
  // (скопировать без изменений; импорты уже подключены сверху)
}
```

Полный текст функции — копия `Chart` из App.tsx без правок.

- [ ] **Step 2: Удалить `Chart`, `ChartProps`, `FORECAST_KEYS`, `FORECAST_META` из `src/App.tsx`** (строки 47-186)

Импортировать: `import { TelemetryChart } from "./components/TelemetryChart";`. Заменить `<Chart rows={...} ... />` на `<TelemetryChart rows={...} ... />`.

В App.tsx останутся импорты из digitalTwin, нужные только для TelemetryChart, — удалить ненужные: `clamp, fx, sx, sy, hoverUnit, hoverValue, type SeriesItem, type ChartDataPoint, type ForecastPoint, FORECAST_STEPS, H, HISTORY_FRACTION, N, PAD, SERIES, W`. После чистки в App.tsx из digitalTwin останутся: `CONTROL_LIMITS, DEFAULT_CONTROLS, DT, FORMULAS, IDLE_RESET_MS, SCENARIOS, advice, build, evidence, forecast, paramTone, point, risk, runTests, seed, type Controls, type DataPoint, type ModeKey`.

- [ ] **Step 3: Запустить `npm run dev`**

Run: `npm run dev`
Expected: график отображается полностью корректно, ленты реального времени двигаются, прогноз справа виден, hover-tooltip работает, сетка и подписи `-90/-60/-30/сейчас/+30/+60` на месте.

- [ ] **Step 4: Commit**

```bash
git add src/components/TelemetryChart.tsx src/App.tsx
git commit -m "refactor: extract TelemetryChart component"
```

### Task 1.4: Extract MetricCards section

**Files:**
- Create: `src/components/MetricCards.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Создать `src/components/MetricCards.tsx`**

Вынести секцию из App.tsx (строки 390-405) — 6 карточек: «Сценарий», «Риск», и 4 карточки параметров через `Card`. Принимает уже посчитанные значения от App.

```tsx
// src/components/MetricCards.tsx
import { paramTone, SCENARIOS, type DataPoint, type EvidenceResult, type ModeKey, type RiskResult } from "../models/digitalTwin";
import { Card, toneClass } from "./Card";

interface MetricCardsProps {
  mode: ModeKey;
  latest: DataPoint;
  riskResult: RiskResult;
  ev: EvidenceResult;
}

export function MetricCards({ mode, latest, riskResult, ev }: MetricCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        <p className="text-xs uppercase opacity-70">Сценарий</p>
        <p className="mt-2 text-base font-semibold leading-tight">{SCENARIOS[mode][0]}</p>
        <p className="mt-2 text-xs opacity-80">{SCENARIOS[mode][1]}</p>
      </div>
      <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        <p className="text-xs uppercase opacity-70">Риск</p>
        <p className="mt-2 text-2xl font-semibold">{ev.score} <span className="text-sm">/ 100</span></p>
        <p className="mt-2 text-xs opacity-80">{riskResult[0]}</p>
      </div>
      <Card title="Температура" value={latest.t} unit="°C" tone={paramTone(latest, "t").tone} hint="Порог: 74 / 82 °C" />
      <Card title="Давление" value={latest.p} unit="Па" tone={paramTone(latest, "p").tone} hint="Порог: 0.035 / 0.06 Па" />
      <Card title="Ток нагрузки" value={latest.i} unit="А" tone={paramTone(latest, "i").tone} hint="Силовая цепь нагревателя" />
      <Card title="Мощность" value={latest.w} unit="Вт" tone={paramTone(latest, "w").tone} hint="P = U × I, U = 24 В" />
    </section>
  );
}
```

`RiskResult` экспортируется из digitalTwin? Проверь — да, экспортируется (строка 106 в digitalTwin.ts: `export type RiskResult`). Аналогично `EvidenceResult` (строка 118).

- [ ] **Step 2: Заменить inline-секцию в App.tsx**

В App.tsx (строки 390-405) заменить весь `<section className="grid gap-4 ...">...</section>` на:

```tsx
<MetricCards mode={mode} latest={latest} riskResult={r} ev={ev} />
```

Импортировать: `import { MetricCards } from "./components/MetricCards";`. Удалить теперь неиспользуемый импорт `toneClass` из `./components/Card`.

- [ ] **Step 3: Запустить `npm run dev`**

Run: `npm run dev`
Expected: 6 карточек метрик отображаются с теми же цветами/значениями. Переключи сценарий — карточка «Сценарий» обновляется, цвета меняются под уровень риска.

- [ ] **Step 4: Commit**

```bash
git add src/components/MetricCards.tsx src/App.tsx
git commit -m "refactor: extract MetricCards section"
```

### Task 1.5: Extract ControlsPanel section

**Files:**
- Create: `src/components/ControlsPanel.tsx`
- Modify: `src/App.tsx`

**Решение по границам:** ControlsPanel вбирает три карточки правой колонки — «Управление», «Диагностика», «Сценарии отказов» (App.tsx:443-498). Они логически связаны (всё, что относится к воздействиям/реакциям оператора), всегда показываются вместе и используют одни и те же данные. На Этапе 2 эта же панель получит what-if-переключатель.

- [ ] **Step 1: Создать `src/components/ControlsPanel.tsx`**

```tsx
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

interface ControlsPanelProps {
  mode: ModeKey;
  controls: Controls;
  setControls: (next: Controls | ((prev: Controls) => Controls)) => void;
  setMode: (mode: ModeKey) => void;
  rec: readonly [string, string, string];
  ev: EvidenceResult;
}

export function ControlsPanel({ mode, controls, setControls, setMode, rec, ev }: ControlsPanelProps) {
  const heaterPercent = Math.round(controls.heater * 100);
  const coolingPercent = Math.round(controls.cooling * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Управление</h2>
          <button
            onClick={() => setControls(DEFAULT_CONTROLS)}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
          >
            сброс
          </button>
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
              {ev.factors.map((f) => (
                <p key={f.key} className="rounded-xl bg-white p-2 text-xs">
                  <b>{f.label}:</b> {f.raw} {f.unit}; {f.text}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Все параметры в рабочем диапазоне.</p>
          )}
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
```

- [ ] **Step 2: Заменить правую колонку в App.tsx**

В App.tsx (строки 442-498) заменить весь блок `<div className="space-y-5">...</div>` на:

```tsx
<ControlsPanel
  mode={mode}
  controls={controls}
  setControls={setControls}
  setMode={setMode}
  rec={rec}
  ev={ev}
/>
```

Импортировать: `import { ControlsPanel } from "./components/ControlsPanel";`. Удалить теперь неиспользуемые импорты из digitalTwin: `CONTROL_LIMITS, DEFAULT_CONTROLS` (если не используются нигде в App.tsx ещё, проверь — `DEFAULT_CONTROLS` используется в `reset()`, оставить; `CONTROL_LIMITS` — только в ползунках, удалить). Также удалить локальные переменные `heaterPercent`, `coolingPercent` (строки 354-355).

- [ ] **Step 3: Запустить `npm run dev` и проверить полный цикл**

Run: `npm run dev`
Expected:
- Ползунки двигаются, проценты обновляются.
- Кнопка `сброс` сбрасывает только controls.
- Кнопки сценариев переключают активный режим, активная кнопка подсвечивается фиолетовым.
- Диагностический блок показывает текст рекомендации, факторы evidence перечислены.
- Симуляция продолжается без сбоев.

- [ ] **Step 4: Проверить размер App.tsx**

Run: `wc -l src/App.tsx`
Expected: меньше 200 строк (с 519 до ~150). Если больше — что-то не вынесено.

- [ ] **Step 5: Commit**

```bash
git add src/components/ControlsPanel.tsx src/App.tsx
git commit -m "refactor: extract ControlsPanel section"
```

### Task 1.6: PR boundary

После Task 1.5 фиксируем границу PR. Если работа делается ветками — открыть PR с пятью коммитами Task 1.1–1.5. Если веткой не пользуемся — переходим к PR 2.

---

## PR 2 — useSimulation Hook + Smoke Tests

**Цель PR:** Вынести симуляционный цикл из App.tsx в кастомный хук. По дороге — извлечь чистую функцию тика `appendTick` в digitalTwin.ts и покрыть её тестами в существующем `runTests()`. Критично, потому что Этапы 2-3 будут расширять этот хук (snapshots, replay, lesson-движок).

### Task 2.1: Add `appendTick` pure function to digitalTwin.ts (TDD)

**Files:**
- Modify: `src/models/digitalTwin.ts`

`appendTick(rows, mode, controls): DataPoint[]` — чистая функция, заменяющая текущее тело `setData`-callback из App.tsx:286. Принимает ряд истории, mode, controls; возвращает новый ряд из последних N точек с прибавленным тиком.

- [ ] **Step 1: Написать тесты в `runTests()` (failing)**

Открой `src/models/digitalTwin.ts`, найди функцию `runTests()` (строка 326). Перед закрывающей `}` (строка 377) вставь блок тестов:

```ts
  // appendTick — чистая функция шага симуляции
  const seedRows = seed();
  const tickedNormal = appendTick(seedRows, "normal", DEFAULT_CONTROLS);
  console.assert(tickedNormal.length === N, "appendTick keeps buffer length at N");
  console.assert(tickedNormal[N - 1]!.k === seedRows[N - 1]!.k + 1, "appendTick increments k by 1");
  console.assert(tickedNormal[N - 2]!.k === seedRows[N - 1]!.k, "appendTick drops oldest point");
  const tickedThermalHot = appendTick(seedRows, "thermal", { heater: 1.6, cooling: 0 });
  const tickedThermalCool = appendTick(seedRows, "thermal", { heater: 0.6, cooling: 1 });
  console.assert(tickedThermalHot[N - 1]!.t > tickedThermalCool[N - 1]!.t, "appendTick respects controls in thermal mode");
```

- [ ] **Step 2: Запустить и убедиться, что тесты падают (компиляция/runtime)**

Run: `npm run dev`
Expected: TypeScript-ошибка `Cannot find name 'appendTick'` в digitalTwin.ts. Это ожидаемо — функции пока нет.

- [ ] **Step 3: Реализовать минимальную версию `appendTick`**

В `src/models/digitalTwin.ts` после функции `forecast` (после строки 297, перед `// ─── Координатные функции SVG ───`) вставить:

```ts
// ─── Шаг симуляции для UI ─────────────────────────────────────────────────────
// Чистая функция: принимает текущие N точек, mode и controls; возвращает новый
// ряд из N точек со сдвигом на один тик. Используется хуком useSimulation, тогда
// тестируется здесь же, не требуя React-окружения.
export function appendTick(rows: DataPoint[], mode: ModeKey, controls: Controls): DataPoint[] {
  const last = rows[rows.length - 1]!;
  const next = point(last.k + 1, mode, last, controls);
  return [...rows.slice(-(N - 1)), next];
}
```

- [ ] **Step 4: Запустить и убедиться, что тесты проходят**

Run: `npm run dev`, открыть DevTools console.
Expected: 0 ошибок `console.assert`. Если появилась красная запись с `Assertion failed: ...` — починить логику.

- [ ] **Step 5: Commit**

```bash
git add src/models/digitalTwin.ts
git commit -m "feat: add appendTick pure simulation step"
```

### Task 2.2: Define UI types in `src/types/ui.ts`

**Files:**
- Create: `src/types/ui.ts`
- Modify: `src/App.tsx`

Тип `EventItem` сейчас определён в App.tsx (строки 217-223). На PR-5 появится `ScenarioLogEntry`. Чтобы у хука было куда импортировать — выносим в `src/types/ui.ts`.

- [ ] **Step 1: Создать `src/types/ui.ts`**

```ts
// src/types/ui.ts
export interface EventItem {
  key: string;
  ts: number;
  tm: string;
  title: string;
  text: string;
}
```

- [ ] **Step 2: Удалить определение `EventItem` из App.tsx**, импортировать из `./types/ui`.

- [ ] **Step 3: Запустить `npm run dev`** — проверить, что компиляция проходит.

- [ ] **Step 4: Commit**

```bash
git add src/types/ui.ts src/App.tsx
git commit -m "refactor: move EventItem to src/types/ui"
```

### Task 2.3: Create `useSimulation` hook

**Files:**
- Create: `src/hooks/useSimulation.ts`

Хук инкапсулирует:
1. Симуляционный цикл (`setInterval` с `appendTick` каждые `DT` мс).
2. Контролы — храним в state, доступ к актуальному значению через ref (избегаем перезапуска интервала на каждом движении ползунка).
3. Журнал событий и его дедупликацию.
4. `reset()` — сброс симуляции в исходное состояние.
5. Idle-reset для kiosk-режима — пинговые таймеры и сброс через `IDLE_RESET_MS`.

- [ ] **Step 1: Создать `src/hooks/useSimulation.ts`**

```ts
// src/hooks/useSimulation.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advice,
  appendTick,
  build,
  DEFAULT_CONTROLS,
  DT,
  evidence,
  forecast,
  IDLE_RESET_MS,
  paramTone,
  risk,
  seed,
  type Controls,
  type DataPoint,
  type ModeKey,
} from "../models/digitalTwin";
import type { EventItem } from "../types/ui";

export interface UseSimulationResult {
  mode: ModeKey;
  setMode: (mode: ModeKey) => void;
  running: boolean;
  setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  data: DataPoint[];
  latest: DataPoint;
  controls: Controls;
  setControls: React.Dispatch<React.SetStateAction<Controls>>;
  events: EventItem[];
  last: number;
  chart: ReturnType<typeof build>;
  fc: ReturnType<typeof forecast>;
  riskResult: ReturnType<typeof risk>;
  ev: ReturnType<typeof evidence>;
  rec: ReturnType<typeof advice>;
  reset: () => void;
  bumpIdle: () => void;
}

export interface UseSimulationOptions {
  kiosk: boolean;
  onIdleReset?: () => void; // например, чтобы App.tsx показал onboarding снова
}

export function useSimulation({ kiosk, onIdleReset }: UseSimulationOptions): UseSimulationResult {
  const [mode, setMode] = useState<ModeKey>("normal");
  const [running, setRunning] = useState(true);
  const [data, setData] = useState<DataPoint[]>(seed);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [last, setLast] = useState(Date.now());
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const idleRef = useRef(Date.now());

  const latest = data[data.length - 1]!;
  const chart = useMemo(() => build(data), [data]);
  const fc = useMemo(() => forecast(data, mode, controls), [data, mode, controls]);
  const riskResult = useMemo(() => risk(latest), [latest]);
  const ev = useMemo(() => evidence(latest), [latest]);
  const rec = useMemo(() => advice(mode, riskResult), [mode, riskResult]);

  // Симуляционный интервал зависит только от mode/running — слайдеры читаются через ref.
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const stamp = Date.now();
      setData((cur) => appendTick(cur, mode, controlsRef.current));
      setLast(stamp);
    }, DT);
    return () => clearInterval(id);
  }, [running, mode]);

  // Журнал событий — дедупликация по ключу с окном 7 секунд.
  useEffect(() => {
    if (riskResult[1] === "ok") return;
    const key = [...riskResult[2], ...riskResult[3]][0]!;
    setEvents((cur) => {
      if (cur[0]?.key === key && Date.now() - cur[0].ts < 7000) return cur;
      const p = paramTone(latest, key);
      const display = key === "s" ? `±${p.value}` : `${p.raw}`;
      return [
        { key, ts: Date.now(), tm: latest.tm, title: `${riskResult[0]}: ${p.label}`, text: `${display} ${p.unit}. ${rec[2]}` },
        ...cur,
      ].slice(0, 10);
    });
  }, [latest, riskResult, rec]);

  const reset = useCallback(() => {
    setMode("normal");
    setData(seed());
    setEvents([]);
    setLast(Date.now());
    setRunning(true);
    setControls(DEFAULT_CONTROLS);
  }, []);

  const bumpIdle = useCallback(() => {
    idleRef.current = Date.now();
  }, []);

  // Kiosk idle-reset.
  useEffect(() => {
    if (!kiosk) return undefined;
    const id = setInterval(() => {
      if (Date.now() - idleRef.current >= IDLE_RESET_MS) {
        reset();
        onIdleReset?.();
        idleRef.current = Date.now();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [kiosk, reset, onIdleReset]);

  return {
    mode,
    setMode,
    running,
    setRunning,
    data,
    latest,
    controls,
    setControls,
    events,
    last,
    chart,
    fc,
    riskResult,
    ev,
    rec,
    reset,
    bumpIdle,
  };
}
```

- [ ] **Step 2: Запустить `npm run dev`**, проверить, что нет TS-ошибок.

App.tsx ещё не использует хук, но сам хук должен компилироваться.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSimulation.ts
git commit -m "feat: add useSimulation hook"
```

### Task 2.4: Refactor `App.tsx` to use `useSimulation`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Заменить весь simulation-стейт в App.tsx на вызов хука**

В компоненте `FTIDigitalTwinPrototype()`:
1. Удалить локальные `useState`/`useRef`/`useEffect`-блоки симуляции (всё, что между `const [mode, ...]` и `useEffect(() => { if (!kiosk) ...`, плюс idle-эффект). Это строки ~260-329 (после уже сделанных PR-1 правок индексы могли сдвинуться — ориентируйся по содержанию, не по номерам).
2. Оставить только связанные с UI флаги: `kiosk`, `showOnboarding`, `idleRef` уже не нужен — он внутри хука. Также удалить функцию `bumpIdle` — она тоже из хука.
3. Подключить хук:

```tsx
const sim = useSimulation({
  kiosk,
  onIdleReset: () => setShowOnboarding(true),
});
const {
  mode, setMode, running, setRunning, data, latest, controls, setControls,
  events, last, chart, fc, riskResult: r, ev, rec, reset, bumpIdle,
} = sim;
```

- [ ] **Step 2: Удалить ненужные импорты**

Из `./models/digitalTwin` теперь в App.tsx нужны только: `runTests, SCENARIOS, type ModeKey` (для `reset()` они уже не нужны, поскольку всё внутри хука). После этой правки в App.tsx из digitalTwin останется только `runTests` (и тот в Task 4.3 удалим).

- [ ] **Step 3: Запустить `npm run dev` и пройти лекционный прогон**

Run: `npm run dev`
Expected:
- Симуляция тикает плавно, риск-скор обновляется каждую секунду.
- Ползунки изменяют ток/температуру/давление с заметной задержкой меньше 1 секунды.
- Переключение сценария меняет поведение (тепловой растит температуру, вакуум растит давление и т.д.).
- Кнопка `Сброс` возвращает всё в норму.
- Кнопка `Пауза/Запуск` останавливает и продолжает тик.
- В fullscreen после 60 секунд бездействия (опускаем `IDLE_RESET_MS` локально для проверки до `5000` и потом возвращаем) симуляция автоматически сбрасывается, onboarding появляется снова.
- Журнал событий пополняется при сценариях отказов.

- [ ] **Step 4: Проверить размер App.tsx**

Run: `wc -l src/App.tsx`
Expected: меньше 130 строк.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: use useSimulation hook in App"
```

### Task 2.5: PR boundary

PR 2 готов. Если на ветке — открыть PR. После Task 2.5 проект уже годен для лекционного прогона: рефакторинг закончен, поведение не изменилось.

---

## PR 3 — Hotkeys + Presenter Theme

**Цель PR:** Добавить hotkeys (`1`–`5`/`Space`/`R`/`F`/`?`), оверлей-cheatsheet и контрастную presenter-тему с крупными шрифтами в kiosk-режиме. Без новой логики симуляции, без новых компонентов кроме оверлея. Есть PresenterContext, чтобы дочерние компоненты знали про режим.

### Task 3.1: Create `PresenterContext`

**Files:**
- Create: `src/contexts/PresenterContext.tsx`

- [ ] **Step 1: Создать `src/contexts/PresenterContext.tsx`**

```tsx
// src/contexts/PresenterContext.tsx
import { createContext, useContext, type ReactNode } from "react";

const PresenterContext = createContext<boolean>(false);

export function PresenterProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <PresenterContext.Provider value={value}>{children}</PresenterContext.Provider>;
}

export function usePresenter(): boolean {
  return useContext(PresenterContext);
}
```

- [ ] **Step 2: Обернуть `App.tsx` в провайдер**

В функции `FTIDigitalTwinPrototype()` обернуть всё содержимое верхнего `<div>` в `<PresenterProvider value={kiosk}>...</PresenterProvider>`.

- [ ] **Step 3: Запустить `npm run dev`** — проверить, что приложение работает (изменений UI нет).

- [ ] **Step 4: Commit**

```bash
git add src/contexts/PresenterContext.tsx src/App.tsx
git commit -m "feat: add PresenterContext"
```

### Task 3.2: Add presenter theme styles

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.tsx` (применить класс `presenter` на корне когда `kiosk`)
- Modify: `src/components/MetricCards.tsx` (использовать `usePresenter()` для крупных цифр)

Tailwind v4 не имеет глобальной dark-темы из коробки в этом проекте — используем плоский CSS-класс `.presenter` плюс Tailwind utility-классы выбираемые условно через `usePresenter()`.

- [ ] **Step 1: Добавить пресет в `src/index.css`**

После существующих правил, перед закрывающим файлом, добавить:

```css
/* Presenter mode: тёмная контрастная тема для лекций. */
.presenter {
  background: #0f172a;
  color: #e2e8f0;
}
.presenter header {
  /* шапка уже тёмная — оставляем */
}
.presenter .lecture-card {
  background: #1e293b;
  color: #f1f5f9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.presenter .lecture-card .opacity-70,
.presenter .lecture-card .opacity-80 {
  opacity: 0.85;
}
.presenter .lecture-card.tone-ok { background: #064e3b; color: #d1fae5; border-color: #10b981; }
.presenter .lecture-card.tone-warn { background: #78350f; color: #fef3c7; border-color: #f59e0b; }
.presenter .lecture-card.tone-alarm { background: #7f1d1d; color: #fee2e2; border-color: #ef4444; }
```

- [ ] **Step 2: Применить класс `presenter` на корне**

В `src/App.tsx` корневой `<div className="min-h-screen bg-slate-50 ...">` дополнить:

```tsx
<div
  className={`min-h-screen p-4 sm:p-6 ${kiosk ? "presenter" : "bg-slate-50 text-slate-900"}`}
  onClick={bumpIdle}
  onMouseMove={bumpIdle}
  onTouchStart={bumpIdle}
  onKeyDown={bumpIdle}
>
```

- [ ] **Step 3: Добавить `lecture-card` и `tone-*` классы в `Card.tsx` и `MetricCards.tsx`**

В `src/components/Card.tsx` функция `Card`:

```tsx
import { usePresenter } from "../contexts/PresenterContext";

export function Card({ title, value, unit, tone, hint }: CardProps) {
  const presenter = usePresenter();
  const sizeValue = presenter ? "text-4xl" : "text-2xl";
  const sizeUnit = presenter ? "text-base" : "text-sm";
  const sizeTitle = presenter ? "text-sm" : "text-xs";
  const sizeHint = presenter ? "text-sm" : "text-xs";
  return (
    <div className={`lecture-card tone-${tone} rounded-2xl border p-4 shadow-sm ${toneClass(tone)}`}>
      <p className={`${sizeTitle} uppercase opacity-70`}>{title}</p>
      <p className={`mt-2 ${sizeValue} font-semibold`}>
        {value} <span className={sizeUnit}>{unit}</span>
      </p>
      <p className={`mt-2 ${sizeHint} opacity-80`}>{hint}</p>
    </div>
  );
}
```

В `src/components/MetricCards.tsx` две inline-карточки («Сценарий», «Риск») — обернуть аналогично; добавить `lecture-card tone-${riskResult[1]}` и условные размеры через `usePresenter()`.

```tsx
import { usePresenter } from "../contexts/PresenterContext";

export function MetricCards(...) {
  const presenter = usePresenter();
  const sizeRisk = presenter ? "text-5xl" : "text-2xl";
  const sizeName = presenter ? "text-xl" : "text-base";
  // ...
  return (
    <section className="...">
      <div className={`lecture-card tone-${riskResult[1]} rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        <p className={`${presenter ? "text-sm" : "text-xs"} uppercase opacity-70`}>Сценарий</p>
        <p className={`mt-2 ${sizeName} font-semibold leading-tight`}>{SCENARIOS[mode][0]}</p>
        <p className={`mt-2 ${presenter ? "text-sm" : "text-xs"} opacity-80`}>{SCENARIOS[mode][1]}</p>
      </div>
      <div className={`lecture-card tone-${riskResult[1]} rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        <p className={`${presenter ? "text-sm" : "text-xs"} uppercase opacity-70`}>Риск</p>
        <p className={`mt-2 ${sizeRisk} font-semibold`}>{ev.score} <span className={presenter ? "text-base" : "text-sm"}>/ 100</span></p>
        <p className={`mt-2 ${presenter ? "text-sm" : "text-xs"} opacity-80`}>{riskResult[0]}</p>
      </div>
      <Card title="Температура" value={latest.t} unit="°C" tone={paramTone(latest, "t").tone} hint="Порог: 74 / 82 °C" />
      <Card title="Давление" value={latest.p} unit="Па" tone={paramTone(latest, "p").tone} hint="Порог: 0.035 / 0.06 Па" />
      <Card title="Ток нагрузки" value={latest.i} unit="А" tone={paramTone(latest, "i").tone} hint="Силовая цепь нагревателя" />
      <Card title="Мощность" value={latest.w} unit="Вт" tone={paramTone(latest, "w").tone} hint="P = U × I, U = 24 В" />
    </section>
  );
}
```

- [ ] **Step 4: Запустить `npm run dev` и проверить тему**

Run: `npm run dev`
Expected:
- В обычном режиме интерфейс выглядит идентично прошлому состоянию.
- Нажми кнопку «Полный экран» — фон становится тёмным `#0f172a`, карточки метрик становятся тёмно-синими/изумрудными, цифры риска заметно крупнее.
- Выйди из фуллскрина — всё возвращается.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.tsx src/components/Card.tsx src/components/MetricCards.tsx
git commit -m "feat: add presenter theme with larger fonts"
```

### Task 3.3: Create `useHotkeys` hook

**Files:**
- Create: `src/hooks/useHotkeys.ts`

- [ ] **Step 1: Создать `src/hooks/useHotkeys.ts`**

```ts
// src/hooks/useHotkeys.ts
import { useEffect } from "react";

export type HotkeyHandlers = Partial<Record<string, () => void>>;

// Привязывает обработчики к key события keydown. Игнорирует нажатия в полях ввода,
// чтобы пользователь мог напечатать «1» в input и оно не переключило сценарий.
export function useHotkeys(handlers: HotkeyHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const key = e.key === " " ? "Space" : e.key.toLowerCase();
      const handler = handlers[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
```

- [ ] **Step 2: Подключить хук в App.tsx**

В `src/App.tsx` после `const sim = useSimulation(...)`:

```tsx
const [showHotkeys, setShowHotkeys] = useState(false);

useHotkeys({
  "1": () => sim.setMode("normal"),
  "2": () => sim.setMode("thermal"),
  "3": () => sim.setMode("vacuum"),
  "4": () => sim.setMode("signal"),
  "5": () => sim.setMode("power"),
  Space: () => sim.setRunning((x) => !x),
  r: () => sim.reset(),
  f: () => toggleKiosk(),
  "?": () => setShowHotkeys((x) => !x),
});
```

Импортировать: `import { useHotkeys } from "./hooks/useHotkeys";`

- [ ] **Step 3: Запустить `npm run dev` и проверить hotkeys**

Run: `npm run dev`
Expected:
- `1` — сценарий «Норма»; `2` — Перегрев; `3` — Утечка вакуума; `4` — Дрейф; `5` — Нестабильность питания. Соответствующая кнопка сценариев подсвечивается.
- `Space` — переключает Пауза/Запуск, кнопка обновляет надпись.
- `r` — сбрасывает симуляцию (мгновенно вернётся к норме, плавная лента перестроится).
- `f` — переключает фуллскрин.
- `?` — `showHotkeys` переключается между `true/false`. (UI-оверлея пока нет — добавим в Task 3.4.)
- В поле ползунка нажатие `1` не должно переключать сценарий — но ползунок не текстовый input, так что может сработать; в любом случае не должно ломаться.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useHotkeys.ts src/App.tsx
git commit -m "feat: add hotkeys for scenarios, pause, reset, fullscreen"
```

### Task 3.4: Create `HotkeysOverlay` component

**Files:**
- Create: `src/components/HotkeysOverlay.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Создать `src/components/HotkeysOverlay.tsx`**

```tsx
// src/components/HotkeysOverlay.tsx
interface HotkeysOverlayProps {
  open: boolean;
  onClose: () => void;
}

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ["1", "Сценарий «Норма»"],
  ["2", "Сценарий «Перегрев»"],
  ["3", "Сценарий «Утечка вакуума»"],
  ["4", "Сценарий «Дрейф сигнала»"],
  ["5", "Сценарий «Нестабильность питания»"],
  ["Space", "Пауза / Запуск"],
  ["R", "Сброс симуляции"],
  ["F", "Полноэкранный режим"],
  ["?", "Показать / скрыть подсказки"],
];

export function HotkeysOverlay({ open, onClose }: HotkeysOverlayProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl text-slate-900"
      >
        <h2 className="text-2xl font-semibold">Горячие клавиши</h2>
        <p className="mt-1 text-sm text-slate-500">Нажмите <kbd className="rounded bg-slate-200 px-2 py-0.5 font-mono">?</kbd> ещё раз, чтобы закрыть.</p>
        <ul className="mt-4 space-y-2">
          {ROWS.map(([k, desc]) => (
            <li key={k} className="flex items-center justify-between gap-4 text-base">
              <kbd className="rounded bg-slate-100 px-3 py-1 font-mono text-sm">{k}</kbd>
              <span className="text-right text-slate-700">{desc}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Подключить оверлей в App.tsx**

В JSX App.tsx, после корневого `<div>` или внутри (рядом с `<TheorySection />`):

```tsx
<HotkeysOverlay open={showHotkeys} onClose={() => setShowHotkeys(false)} />
```

Импортировать: `import { HotkeysOverlay } from "./components/HotkeysOverlay";`

- [ ] **Step 3: Запустить `npm run dev` и проверить оверлей**

Run: `npm run dev`
Expected:
- Нажми `?` — появляется модал со списком горячих клавиш.
- Клик по фону или по кнопке «Закрыть» — модал закрывается.
- Нажатие `Esc` (через клик по фону) — модал закрывается.
- Список содержит 9 строк, как в коде.

- [ ] **Step 4: Commit**

```bash
git add src/components/HotkeysOverlay.tsx src/App.tsx
git commit -m "feat: add hotkeys cheatsheet overlay"
```

### Task 3.5: PR boundary

PR 3 готов. После него лекция уже возможна на проекторе.

---

## PR 4 — Active Scenario Indicator + Cleanup

**Цель PR:** Крупный ярлык активного сценария поверх графика — чтобы в presenter-режиме слушатель мог одним взглядом понять, что сейчас демонстрируется. Плюс косметический cleanup: вынести `runTests()` из App.tsx.

### Task 4.1: Create `PresenterIndicator` component

**Files:**
- Create: `src/components/PresenterIndicator.tsx`

- [ ] **Step 1: Создать `src/components/PresenterIndicator.tsx`**

```tsx
// src/components/PresenterIndicator.tsx
import { SCENARIOS, type ModeKey, type RiskLevel } from "../models/digitalTwin";

interface PresenterIndicatorProps {
  mode: ModeKey;
  riskLevel: RiskLevel;
}

const TONE_RING: Record<RiskLevel, string> = {
  ok: "ring-emerald-400",
  warn: "ring-amber-400",
  alarm: "ring-red-500",
};

export function PresenterIndicator({ mode, riskLevel }: PresenterIndicatorProps) {
  const [name, desc] = SCENARIOS[mode];
  return (
    <div
      className={`pointer-events-none absolute right-4 top-4 z-10 max-w-md rounded-2xl bg-slate-900/85 p-4 ring-2 backdrop-blur-sm ${TONE_RING[riskLevel]}`}
    >
      <p className="text-xs uppercase tracking-widest text-slate-400">Активный сценарий</p>
      <p className="mt-1 text-2xl font-semibold text-white">{name}</p>
      <p className="mt-1 text-sm text-slate-300">{desc}</p>
    </div>
  );
}
```

- [ ] **Step 2: Экспортировать `RiskLevel` из digitalTwin.ts**

Уже экспортирован (строка 12). Шаг проверки — открой файл и убедись.

- [ ] **Step 3: Commit**

```bash
git add src/components/PresenterIndicator.tsx
git commit -m "feat: add PresenterIndicator component"
```

### Task 4.2: Mount `PresenterIndicator` over telemetry chart

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Обернуть TelemetryChart в `relative`-блок и поместить индикатор**

В `src/App.tsx` найти блок `<div className="h-[330px]"><TelemetryChart .../></div>`. Заменить на:

```tsx
<div className="relative h-[330px]">
  <TelemetryChart rows={chart} fc={fc} running={running} last={last} />
  {kiosk && <PresenterIndicator mode={mode} riskLevel={r[1]} />}
</div>
```

`{kiosk && ...}` гарантирует, что индикатор появляется только в presenter-режиме (на ноутбуке преподавателя при подготовке его не видно, чтобы не загораживать график).

Импортировать: `import { PresenterIndicator } from "./components/PresenterIndicator";`

- [ ] **Step 2: Запустить `npm run dev` и проверить**

Run: `npm run dev`
Expected:
- В обычном режиме индикатора нет, график как раньше.
- Нажми `f` (фуллскрин) — в правом верхнем углу графика появляется крупный ярлык «Активный сценарий: Норма».
- Нажми `2` — ярлык меняется на «Перегрев», кольцо вокруг становится amber/red по мере роста риска.
- Нажми `f` ещё раз — ярлык исчезает.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: show PresenterIndicator over chart in kiosk mode"
```

### Task 4.3: Move `runTests()` invocation out of App.tsx

**Files:**
- Modify: `src/main.ts`
- Modify: `src/App.tsx`

`App.tsx` сейчас содержит на верхнем уровне (строки 41-45 и 188-191) объявление `Window.__FTI_TESTS__` и вызов `runTests()`. Это «отладочный блок на сцене» из roadmap. Перенесём в `main.ts`.

- [ ] **Step 1: Прочитать `src/main.ts`**

Run: `cat src/main.ts` — узнать, что внутри. Ожидаемая структура (12 строк, точка монтирования React):

- [ ] **Step 2: Обновить `src/main.ts`**

В начало файла добавить (или после импортов):

```ts
import { runTests } from "./models/digitalTwin";

declare global {
  interface Window {
    __FTI_TESTS__?: boolean;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined" && !window.__FTI_TESTS__) {
  window.__FTI_TESTS__ = true;
  runTests();
}
```

- [ ] **Step 3: Удалить блок из `src/App.tsx`**

Удалить:
- Строки 41-45 — `declare global { ... __FTI_TESTS__ ... }`.
- Строки 188-191 — вызов `runTests()`.
- Импорт `runTests` из `./models/digitalTwin` (теперь не нужен в App.tsx).

- [ ] **Step 4: Запустить `npm run dev` и проверить тесты в консоли**

Run: `npm run dev`, открыть DevTools → Console.
Expected:
- 0 ошибок `console.assert`.
- Вкладка Network/Sources показывает, что `digitalTwin.ts` загружается.
- Если по ошибке `runTests()` не вызвался, в консоли должны были бы остаться assert-предупреждения от прошлых сессий — их нет, значит DEV-проверка работает.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/App.tsx
git commit -m "chore: move runTests invocation to main.ts"
```

### Task 4.4: PR boundary

PR 4 готов.

---

## PR 5 — Snapshot Button + Scenario Timeline

**Цель PR:** Дать преподавателю инструмент отметки моментов («снимок») и видеть последовательность собственных управляющих действий на ленте сценариев. Это закладывает интерфейс, который Этап 2 расширит до полного snapshot-стека и replay.

### Task 5.1: Add scenario log to `useSimulation`

**Files:**
- Modify: `src/types/ui.ts`
- Modify: `src/hooks/useSimulation.ts`

- [ ] **Step 1: Добавить тип `ScenarioLogEntry` в `src/types/ui.ts`**

```ts
// добавить в src/types/ui.ts
export type ScenarioLogKind = "scenario" | "snapshot" | "reset" | "control";

export interface ScenarioLogEntry {
  ts: number;       // Date.now()
  tick: number;     // k последней точки на момент действия
  tm: string;       // строка времени
  kind: ScenarioLogKind;
  label: string;    // напр. "Перегрев", "Снимок состояния", "Сброс", "Heater 145%"
}
```

- [ ] **Step 2: Расширить `useSimulation`**

В `src/hooks/useSimulation.ts`:

1. Добавить state `const [log, setLog] = useState<ScenarioLogEntry[]>([]);`
2. Импортировать `ScenarioLogEntry` из `../types/ui`.
3. Добавить функцию `appendLog(kind, label)`:

```ts
const appendLog = useCallback((kind: ScenarioLogEntry["kind"], label: string) => {
  setLog((cur) => [
    ...cur,
    { ts: Date.now(), tick: latestRef.current?.k ?? 0, tm: latestRef.current?.tm ?? "", kind, label },
  ].slice(-50));
}, []);
```

4. Поскольку `appendLog` использует latest, но не должен зависеть от него (иначе пересоздаётся на каждый тик), завести `latestRef` и обновлять его по latest:

```ts
const latestRef = useRef<DataPoint>(latest);
latestRef.current = latest;
```

5. Обернуть оригинальный `setMode` в логгирующую обёртку:

```ts
const setModeLogged = useCallback<(mode: ModeKey) => void>((next) => {
  setMode(next);
  // SCENARIOS импортируем для подписи
  appendLog("scenario", SCENARIOS[next][0]);
}, [appendLog]);
```

Импортировать `SCENARIOS` из digitalTwin.

6. Расширить `reset()`:

```ts
const reset = useCallback(() => {
  setMode("normal");
  setData(seed());
  setEvents([]);
  setLast(Date.now());
  setRunning(true);
  setControls(DEFAULT_CONTROLS);
  appendLog("reset", "Сброс симуляции");
}, [appendLog]);
```

7. Добавить публичный `snapshot(label)`:

```ts
const snapshot = useCallback((label: string = "Снимок состояния") => {
  appendLog("snapshot", label);
}, [appendLog]);
```

8. Расширить тип результата хука: вернуть `log`, `snapshot`, и заменить `setMode` на `setModeLogged` в возвращаемом объекте.

- [ ] **Step 3: Запустить `npm run dev`** — проверить, что компилируется и поведение прежнее.

- [ ] **Step 4: Commit**

```bash
git add src/types/ui.ts src/hooks/useSimulation.ts
git commit -m "feat: add scenario log to useSimulation"
```

### Task 5.2: Create `ScenarioTimeline` component

**Files:**
- Create: `src/components/ScenarioTimeline.tsx`

- [ ] **Step 1: Создать `src/components/ScenarioTimeline.tsx`**

```tsx
// src/components/ScenarioTimeline.tsx
import type { ScenarioLogEntry } from "../types/ui";

const KIND_CHIP: Record<ScenarioLogEntry["kind"], { className: string; label: string }> = {
  scenario: { className: "bg-indigo-100 text-indigo-800", label: "Сценарий" },
  snapshot: { className: "bg-amber-100 text-amber-800", label: "Снимок" },
  reset: { className: "bg-slate-200 text-slate-700", label: "Сброс" },
  control: { className: "bg-sky-100 text-sky-800", label: "Воздействие" },
};

interface ScenarioTimelineProps {
  log: ScenarioLogEntry[];
  onSnapshot: () => void;
}

export function ScenarioTimeline({ log, onSnapshot }: ScenarioTimelineProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Лента сценариев</h2>
        <button
          onClick={onSnapshot}
          className="rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          📷 Снимок состояния
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        История твоих действий на лекции. Снимок — закладка, к которой можно вернуться обсудить.
      </p>
      {log.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-5 text-sm text-slate-500">
          Лента пуста. Переключи сценарий или нажми «Снимок состояния».
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {log
            .slice()
            .reverse()
            .map((entry, idx) => {
              const chip = KIND_CHIP[entry.kind];
              return (
                <li key={`${entry.ts}-${idx}`} className="flex items-baseline justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${chip.className}`}>
                      {chip.label}
                    </span>
                    <span className="font-medium text-slate-900">{entry.label}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{entry.tm}</span>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScenarioTimeline.tsx
git commit -m "feat: add ScenarioTimeline component"
```

### Task 5.3: Mount `ScenarioTimeline` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Подключить timeline в App.tsx**

Деструктурировать `log`, `snapshot` из хука:

```tsx
const {
  mode, setMode, running, setRunning, data, latest, controls, setControls,
  events, last, chart, fc, riskResult: r, ev, rec, reset, bumpIdle,
  log, snapshot,
} = sim;
```

Найти блок с `<TheorySection />` (последняя секция перед журналом событий). Над журналом событий вставить:

```tsx
<section>
  <ScenarioTimeline log={log} onSnapshot={() => snapshot("Снимок состояния")} />
</section>
```

Импортировать: `import { ScenarioTimeline } from "./components/ScenarioTimeline";`

- [ ] **Step 2: Запустить `npm run dev` и проверить**

Run: `npm run dev`
Expected:
- Под секцией теории появляется новый блок «Лента сценариев» с кнопкой «📷 Снимок состояния».
- Нажми кнопку 2/3/4/5 (или клавиши) — в ленте появляются записи сценариев со временем.
- Нажми «Снимок состояния» — добавляется запись «Снимок» с amber-чипом.
- Нажми `R` — добавляется запись «Сброс симуляции», лента очищается? — нет, лента сохраняется, в неё добавляется reset-запись (это специально, чтобы преподаватель видел, что сбрасывал).
  - Ожидание: после сброса видны только записи которые были до. Если хочется именно очищать, можно ещё в reset делать `setLog([])` — но в этом плане — оставляем (лента — лог преподавателя, не часть симуляционного состояния). Зафиксировать это в комментарии reset.
- Переключи в фуллскрин и обратно — индикатор сценария по-прежнему показывается, лента видна снизу.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount ScenarioTimeline below theory section"
```

### Task 5.4: PR boundary

PR 5 готов. Этап 1 закрыт.

---

## Финальная верификация Этапа 1

После последнего коммита PR-5 — лекционный прогон по чек-листу:

- [ ] **Запустить dev-сервер**

Run: `npm run dev`. Открой http://localhost:5173 на максимальном экране (предпочтительно подключиться к проектору, если есть).

- [ ] **Hotkeys-прогон**

С клавиатуры (без мышки):
- `1`–`5` — переключают сценарии за < 0.5 секунды каждый.
- `Space` — пауза/запуск.
- `R` — сброс.
- `F` — fullscreen on/off.
- `?` — открывает оверлей подсказок; ещё раз — закрывает.

- [ ] **Presenter-режим**

В fullscreen:
- Фон тёмный, цифры и метки крупные.
- В правом верхнем углу графика виден ярлык активного сценария с кольцом цвета риска.
- Карточка «Риск» — крупная цифра, читаема с дальнего угла комнаты.
- Если 60 секунд не двигать мышь и не нажимать клавиш — симуляция автоматически сбрасывается, появляется onboarding.

- [ ] **Лента сценариев**

- Нажми `1`, `2`, `3`, `4`, `5` подряд — в ленте 5 записей-сценариев.
- Нажми «📷 Снимок состояния» — добавляется запись «Снимок» с amber-чипом.
- Время в каждой записи совпадает со строкой `tm` в момент нажатия.

- [ ] **Регрессии**

- График телеметрии плавный, без артефактов.
- Прогноз справа отображается, hover-tooltip показывает значения параметров.
- Кнопка «Пауза/Запуск» в правом верхнем углу графика работает (даже без хоткея).
- Журнал событий ниже ленты сценариев получает записи при сценариях отказов.
- Тесты в DevTools: 0 ошибок `console.assert` (включая 4 новых теста для `appendTick` из Task 2.1).

- [ ] **Размер App.tsx**

Run: `wc -l src/App.tsx`
Expected: меньше 150 строк (был 519).

- [ ] **10-минутный прогон стабильности**

Запусти `npm run dev`, переключи в fullscreen. Прогони 5 сценариев в случайном порядке, сделай 3 снимка, нажми Reset, прогони ещё 5. Удерживай 10 минут — 0 крашей.

Если все чек-боксы зелёные — Этап 1 завершён. Можно идти к Этапу 2 (Decision-Support Toolkit).
