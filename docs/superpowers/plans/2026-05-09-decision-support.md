# Decision-Support Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать преподавателю инструменты, через которые он показывает, *как именно* оператор принимает решение по управлению установкой: what-if-предпросмотр изменений, всегда видимый «do-nothing» прогноз, snapshots/undo состояния, разбор вкладов evidence в риск-скор и replay управляющих действий.

**Architecture:** Поверх существующего `useSimulation` хука (Этап 1) — без введения внешнего state-менеджера. `forecast()` уже принимает `(rows, mode, controls)` — для what-if/baseline просто вызываем её повторно с альтернативными `controls`. Snapshots — стек в хуке. Replay — лог timestamped управляющих действий + новый «player» цикл. Evidence-bar — отдельный визуальный компонент, питается готовой структурой `evidence().factors[]`.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind 4. Без новых зависимостей. Smoke-тесты — в существующем `runTests()` в `src/models/digitalTwin.ts`.

---

## File Structure

**Create:**
- `src/components/EvidenceBar.tsx` — горизонтальная stacked-bar вклада факторов риска
- `src/components/ForecastLegend.tsx` — компактная легенда «реальный / what-if / baseline» (вызывается из родителя графика)
- `src/components/SnapshotControls.tsx` — кнопки `Откат`, `Вперёд`, `Сбросить к снимку` + индикатор позиции в стеке
- `src/components/ReplayControls.tsx` — кнопка «Воспроизвести» + индикатор активного replay (счётчик действий, прогресс)

**Modify:**
- `src/models/digitalTwin.ts` — расширить `evidence()` опциональным режимом (или новой функцией `evidenceWeights()`) для нормализации вкладов в проценты, добавить smoke-тесты для всего нового
- `src/components/TelemetryChart.tsx` — принимает опциональные `whatIfFc?: ForecastPoint[]` и `baselineFc?: ForecastPoint[]`; рисует их разными стилями
- `src/components/ControlsPanel.tsx` — переключатель «Применить / Только посмотреть»; в режиме просмотра не вызывает `setControls`, а зовёт `onWhatIfChange`
- `src/hooks/useSimulation.ts` — добавляет `forecastWith(controls): ForecastPoint[]`, snapshot-стек с `restore()/undo()/redo()`, action-лог + replay
- `src/types/ui.ts` — добавляет тип `DecisionAction` для лога replay
- `src/App.tsx` — соединяет всё новое: what-if state, baselineFc, snapshot/replay UI

**Не трогаем:** физику в `digitalTwin.ts` (`point`, `risk`, `forecast`, `appendTick` — последний без новой подписи), Этап 1 компоненты, не относящиеся к этим фичам (`MetricCards`, `Card`, `Slider`, `HotkeysOverlay`, `ScenarioTimeline`).

---

## PR 1 — What-if Preview

**Цель PR:** В режиме «Только посмотреть» движение ползунков heater/cooling рисует серую пунктирную линию **гипотетического** прогноза рядом с реальным, не меняя текущее воздействие. Преподаватель: «вот что будет, если я добавлю охлаждение, — а вот что будет если оставить как есть».

### Task 1.1: Add `forecastWith` helper to `useSimulation`

**Files:**
- Modify: `src/hooks/useSimulation.ts`

Сейчас `useSimulation` возвращает `fc = forecast(data, mode, controls)`. Чтобы посчитать гипотетический прогноз, нужно вызывать `forecast()` с альтернативными `controls`. Дадим хуку маленький helper.

- [ ] **Step 1: Расширить `UseSimulationResult` интерфейс**

В `src/hooks/useSimulation.ts` после поля `snapshot` (~строка 40) добавить:

```ts
  forecastWith: (controls: Controls, steps?: number) => ForecastPoint[];
```

В imports из `digitalTwin` — добавить тип `ForecastPoint`:

```ts
import {
  // ... existing
  type ForecastPoint,
} from "../models/digitalTwin";
```

- [ ] **Step 2: Реализовать helper**

В теле `useSimulation` после `const rec = useMemo(...)` (строка ~63) добавить:

```ts
const forecastWith = useCallback(
  (altControls: Controls, steps?: number) => forecast(data, mode, altControls, steps),
  [data, mode]
);
```

(Не зависит от `controls` — намеренно: вызывающая сторона передаёт свои `altControls`.)

- [ ] **Step 3: Экспортировать из return-объекта**

Добавить `forecastWith` в return (~строка 159):

```ts
return {
  // ... existing
  log,
  snapshot,
  forecastWith,
};
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSimulation.ts
git commit -m "feat: add forecastWith helper to useSimulation"
```

### Task 1.2: Extend `TelemetryChart` to render `whatIfFc`

**Files:**
- Modify: `src/components/TelemetryChart.tsx`

- [ ] **Step 1: Add prop `whatIfFc?: ForecastPoint[]`**

В интерфейсе `TelemetryChartProps` после `fc: ForecastPoint[];` добавить:

```ts
interface TelemetryChartProps {
  rows: ChartDataPoint[];
  fc: ForecastPoint[];
  whatIfFc?: ForecastPoint[];
  running: boolean;
  last: number;
}
```

В деструктуре `TelemetryChart({ rows, fc, running, last })` дописать `whatIfFc`:

```tsx
export function TelemetryChart({ rows, fc, whatIfFc, running, last }: TelemetryChartProps) {
```

- [ ] **Step 2: Add helper that builds path for an alternate forecast**

Под существующим `forecastPath` (~строка 76) добавить параметризованную версию:

```tsx
const altForecastPath = (alt: ForecastPoint[], key: (typeof FORECAST_KEYS)[number]): string => {
  if (!alt.length || !lastRow) return "";
  const domain = FORECAST_META[key].domain;
  const segments = [`M${x(lastIdx).toFixed(1)},${y(lastRow[key] as number, domain).toFixed(1)}`];
  for (const fp of alt) {
    segments.push(`L${xFc(fp.step).toFixed(1)},${y(fp[key], domain).toFixed(1)}`);
  }
  return segments.join(" ");
};
```

- [ ] **Step 3: Render the what-if line for `t` and `pChart`**

Внутри `<g clipPath="url(#fti-telemetry-clip)">`, после блока `{FORECAST_KEYS.map((key) => (<path key={\`fc-${key}\`} ...`)} (~строка 130) добавить:

```tsx
{whatIfFc && whatIfFc.length > 0 && FORECAST_KEYS.map((key) => (
  <path
    key={`whatif-${key}`}
    d={altForecastPath(whatIfFc, key)}
    fill="none"
    stroke="#64748b"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeDasharray="3 4"
    opacity="0.85"
  />
))}
```

(Серый `#64748b` = slate-500. Тонкий пунктир заметно отличается от основного цветного forecast.)

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors. App.tsx ещё не передаёт `whatIfFc`, но prop опциональный — TS не падает.

- [ ] **Step 5: Commit**

```bash
git add src/components/TelemetryChart.tsx
git commit -m "feat: TelemetryChart renders optional whatIfFc as gray dashed line"
```

### Task 1.3: Add «Применить / Только посмотреть» toggle to `ControlsPanel`

**Files:**
- Modify: `src/components/ControlsPanel.tsx`

Сейчас при движении ползунков `setControls` мутирует реальные controls. Введём prop `previewMode: boolean` и `onPreviewControls?: (next: Controls) => void`. Когда `previewMode=true`, ползунки больше не вызывают `setControls`, а вызывают `onPreviewControls`.

- [ ] **Step 1: Расширить `ControlsPanelProps`**

В `src/components/ControlsPanel.tsx` интерфейс:

```ts
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
```

Деструктуризировать:

```tsx
export function ControlsPanel({
  mode, controls, setControls, setMode, rec, ev,
  previewMode, onPreviewToggle, previewControls, onPreviewControls,
}: ControlsPanelProps) {
```

- [ ] **Step 2: Решить, какие controls показывают ползунки**

Сразу после деструктуризации:

```tsx
const shown = previewMode ? previewControls : controls;
const heaterPercent = Math.round(shown.heater * 100);
const coolingPercent = Math.round(shown.cooling * 100);
```

Заменить старые `controls.heater`/`controls.cooling` в ползунках на `shown.heater`/`shown.cooling`. И заменить onChange handlers:

```tsx
<Slider
  label="Мощность нагревателя"
  value={shown.heater}
  percent={heaterPercent}
  onChange={(v) => previewMode
    ? onPreviewControls({ ...shown, heater: v })
    : setControls((c) => ({ ...c, heater: v }))}
  // ... остальные props без изменений
/>
<Slider
  label="Охлаждение"
  value={shown.cooling}
  percent={coolingPercent}
  onChange={(v) => previewMode
    ? onPreviewControls({ ...shown, cooling: v })
    : setControls((c) => ({ ...c, cooling: v }))}
  // ...
/>
```

- [ ] **Step 3: Добавить переключатель режима**

Под заголовком «Управление» (между `<div className="flex items-baseline...">...</div>` и `<p className="mt-1 text-xs...">`) вставить:

```tsx
<div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
  <button
    type="button"
    onClick={() => onPreviewToggle(false)}
    className={`rounded-full px-3 py-1 transition ${!previewMode ? "bg-indigo-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
  >
    Применить
  </button>
  <button
    type="button"
    onClick={() => onPreviewToggle(true)}
    className={`rounded-full px-3 py-1 transition ${previewMode ? "bg-slate-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
  >
    Только посмотреть
  </button>
</div>
```

И заменить подсказку:

```tsx
<p className="mt-1 text-xs text-slate-500">
  {previewMode
    ? "Серая пунктирная линия на графике — что было бы, если бы воздействие применили сейчас."
    : "Двигайте ползунки — двойник немедленно отрабатывает воздействие."}
</p>
```

- [ ] **Step 4: Кнопка «сброс»**

Кнопка `сброс` в шапке должна сбрасывать ту же модель, которой сейчас управляем (`shown`). Изменить onClick:

```tsx
<button
  onClick={() => {
    if (previewMode) onPreviewControls(DEFAULT_CONTROLS);
    else setControls(DEFAULT_CONTROLS);
  }}
  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
>
  сброс
</button>
```

- [ ] **Step 5: Не коммитим сейчас — TS красный**

`npx tsc --noEmit` будет жаловаться на отсутствие props `previewMode`/`onPreviewToggle`/`previewControls`/`onPreviewControls` в `<ControlsPanel>` вызове в `App.tsx`. Task 1.4 исправит это. Коммит делаем общий вместе с Task 1.4. Переходим к Task 1.4 без `git add`.

### Task 1.4: Wire what-if state in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Добавить локальный state для what-if**

В `FTIDigitalTwinPrototype()` после `const [showHotkeys, setShowHotkeys] = useState(false);` (~строка 28) вставить:

```tsx
const [previewMode, setPreviewMode] = useState(false);
const [previewControls, setPreviewControls] = useState(controls);
```

Это инициализирует preview значениями текущих controls; при включении preview оператор сразу видит «текущее» состояние и крутит от него.

- [ ] **Step 2: Синхронизировать previewControls при выходе из preview-режима**

После `useEffect` для fullscreenchange (~строка 51) добавить:

```tsx
useEffect(() => {
  // При выключении превью — сбрасываем альт-controls к текущим реальным,
  // чтобы при следующем входе в превью оператор стартовал «с того же места».
  if (!previewMode) setPreviewControls(controls);
}, [previewMode, controls]);
```

- [ ] **Step 3: Вычислить whatIfFc**

После строк destructure из `sim` (~после 26):

```tsx
const whatIfFc = previewMode ? sim.forecastWith(previewControls) : undefined;
```

- [ ] **Step 4: Передать в `<TelemetryChart>` и `<ControlsPanel>`**

Заменить вызов TelemetryChart (~строка 121):

```tsx
<TelemetryChart rows={chart} fc={fc} whatIfFc={whatIfFc} running={running} last={last} />
```

Заменить вызов ControlsPanel (~строка 143-150):

```tsx
<ControlsPanel
  mode={mode}
  controls={controls}
  setControls={setControls}
  setMode={setMode}
  rec={rec}
  ev={ev}
  previewMode={previewMode}
  onPreviewToggle={setPreviewMode}
  previewControls={previewControls}
  onPreviewControls={setPreviewControls}
/>
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ControlsPanel.tsx src/App.tsx
git commit -m "feat: what-if preview toggle for slider changes"
```

### Task 1.5: Visual smoke check

- [ ] **Step 1: Запустить dev-сервер**

Run: `npm run dev`
Открой http://localhost:5173/.

- [ ] **Step 2: Проверить normal mode**

В режиме «Применить»:
- Ползунки двигают controls и реальный прогноз отрабатывает (та же линия).
- Серой пунктирной линии нет.

- [ ] **Step 3: Включить «Только посмотреть»**

Нажми «Только посмотреть». Ожидание:
- Текст подсказки меняется на «Серая пунктирная линия...».
- Двигай ползунок heater вправо: на графике появляется тонкая серая пунктирная линия рядом с реальным прогнозом, отклоняется от реального согласно гипотетическому воздействию.
- Реальная симуляция и реальный прогноз продолжают идти на текущих controls — не реагируют на ползунок.

- [ ] **Step 4: Вернуться в «Применить»**

Нажми «Применить». Ожидание:
- Серая линия исчезает.
- Ползунки теперь снова применяют изменения. previewControls сбросились на текущие реальные controls.

- [ ] **Step 5: Sanity-check в kiosk-режиме**

Нажми `F` (fullscreen). Что-if переключатель и серая линия должны работать так же.

PR-1 готов. Если ветка — открыть PR с 4 коммитами Task 1.1, 1.2, 1.4 (1.3 встроена в 1.4 commit).

---

## PR 2 — Baseline Forecast + Legend

**Цель PR:** Постоянно видимый «do-nothing» прогноз — что произошло бы если оператор не вмешивается. На фоне реального и what-if это даёт сразу три траектории: реальная (текущее воздействие), what-if (то, что предлагается изменить), baseline (если ничего не делать). Плюс компактная легенда расшифровывающая линии.

**Решение по семантике baseline:** baseline = `forecast(rows, mode, DEFAULT_CONTROLS)` — что было бы при номинальном управлении (heater=1, cooling=0). Это явный референс «как должно идти», и контраст текущего воздействия с ним делает риск-скор интерпретируемым.

### Task 2.1: Compute and pass `baselineFc`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Импортировать `DEFAULT_CONTROLS`**

В imports из `./models/digitalTwin` (~строка 2) добавить:

```ts
import { DEFAULT_CONTROLS, FORMULAS } from "./models/digitalTwin";
```

- [ ] **Step 2: Вычислить baseline**

После `const whatIfFc = ...` добавить:

```tsx
const baselineFc = sim.forecastWith(DEFAULT_CONTROLS);
```

Используется существующий `forecastWith`. Не зависит от текущих controls.

- [ ] **Step 3: Передать в TelemetryChart**

Не передаём пока — следующая задача добавит prop. Пропускаем рендер для этого шага.

### Task 2.2: Render `baselineFc` in `TelemetryChart`

**Files:**
- Modify: `src/components/TelemetryChart.tsx`

- [ ] **Step 1: Добавить prop `baselineFc`**

```ts
interface TelemetryChartProps {
  rows: ChartDataPoint[];
  fc: ForecastPoint[];
  whatIfFc?: ForecastPoint[];
  baselineFc?: ForecastPoint[];
  running: boolean;
  last: number;
}
```

Деструктуризация:

```tsx
export function TelemetryChart({ rows, fc, whatIfFc, baselineFc, running, last }: TelemetryChartProps) {
```

- [ ] **Step 2: Добавить рендер baseline**

Сразу под `whatIfFc && ...` блоком вставить:

```tsx
{baselineFc && baselineFc.length > 0 && FORECAST_KEYS.map((key) => (
  <path
    key={`baseline-${key}`}
    d={altForecastPath(baselineFc, key)}
    fill="none"
    stroke="#94a3b8"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeDasharray="1 4"
    opacity="0.7"
  />
))}
```

(Цвет slate-400 `#94a3b8` — светлее чем what-if, тоньше + более редкий пунктир — визуально читается как «фоновая референсная линия».)

- [ ] **Step 3: Передать в JSX из App**

В `src/App.tsx` строка вызова TelemetryChart:

```tsx
<TelemetryChart rows={chart} fc={fc} whatIfFc={whatIfFc} baselineFc={baselineFc} running={running} last={last} />
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/TelemetryChart.tsx src/App.tsx
git commit -m "feat: always-on baseline (do-nothing) forecast on chart"
```

### Task 2.3: Compact `ForecastLegend`

Чтобы три линии не путались, добавим маленькую легенду в углу графика.

**Files:**
- Create: `src/components/ForecastLegend.tsx`
- Modify: `src/components/TelemetryChart.tsx`

- [ ] **Step 1: Создать `src/components/ForecastLegend.tsx`**

```tsx
// src/components/ForecastLegend.tsx
interface ForecastLegendProps {
  showWhatIf: boolean;
}

export function ForecastLegend({ showWhatIf }: ForecastLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0 w-5 border-t-2 border-dashed border-indigo-500" />
        Реальный прогноз
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0 w-5 border-t border-dotted border-slate-400" />
        Без вмешательства (baseline)
      </span>
      {showWhatIf && (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-500" />
          What-if (превью)
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Подключить легенду в App.tsx**

Под `<div className="h-[330px]">` в правой колонке (после закрывающего `</TelemetryChart>` div'а, ~строка 122-123) вставить:

```tsx
<ForecastLegend showWhatIf={previewMode} />
```

И импортировать:

```tsx
import { ForecastLegend } from "./components/ForecastLegend";
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ForecastLegend.tsx src/App.tsx
git commit -m "feat: ForecastLegend explains real / baseline / what-if lines"
```

### Task 2.4: Visual smoke check

- [ ] **Step 1: Перезагрузить dev-сервер**

- [ ] **Step 2: Normal mode (без preview)**
- На графике видны: реальный пунктир (цветной), baseline (тонкий редкий пунктир, серый).
- Под графиком — легенда: 2 строки (Реальный прогноз, Без вмешательства).

- [ ] **Step 3: Включить тепловой сценарий (`2`)**
- Реальный прогноз температуры круто растёт (тепловое воздействие).
- Baseline — растёт почти так же (heater=1, cooling=0 — это default; в thermal mode default тоже разогревается). Линия рядом, чуть выше или ниже в зависимости от текущих controls.

- [ ] **Step 4: Поднять охлаждение в режиме «Применить»**
- Реальный прогноз гнётся вниз. Baseline остаётся высокой (cooling=0). Видна разница.

- [ ] **Step 5: Включить «Только посмотреть»**
- Появляется third линия (what-if) и третий пункт в легенде.
- Двигаем heater на превью — what-if гнётся, real и baseline не меняются.

PR-2 готов.

---

## PR 3 — Snapshots + Undo/Redo

**Цель PR:** Преподаватель может сохранить полное состояние симуляции (data + controls + mode + events), потом откатиться к нему — попробовать другой путь и сравнить. Базовая функциональность для лекционного ритма.

**Дизайн:**
- Стек снимков `SnapshotEntry[]` хранится в хуке. Текущая позиция — индекс. Откат = идём назад в стеке (или просто `restore(idx)`); вперёд — на снимок созданный после текущего.
- Снимок — это full state freeze: `{data, controls, mode, events, ts, label}`. Логи/snapshot-метки в timeline (через существующий `appendLog`) уже работают.
- При создании нового снимка — обрезаем «forward» часть стека (классическое undo-семантика).

### Task 3.1: Add snapshot stack types

**Files:**
- Modify: `src/types/ui.ts`

- [ ] **Step 1: Добавить тип `SnapshotEntry`**

`SnapshotEntry` ссылается на `DataPoint`, `Controls`, `ModeKey` из `digitalTwin.ts` и `EventItem` из этого же файла. Циклической зависимости нет — `digitalTwin.ts` от `ui.ts` ничего не импортирует.

В начало `src/types/ui.ts` добавить импорт:

```ts
import type { Controls, DataPoint, ModeKey } from "../models/digitalTwin";
```

В конец файла добавить:

```ts
export interface SnapshotEntry {
  ts: number;
  label: string;
  data: DataPoint[];
  controls: Controls;
  mode: ModeKey;
  events: EventItem[];
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/ui.ts
git commit -m "feat: add SnapshotEntry type"
```

### Task 3.2: Extend `useSimulation` with snapshot stack

**Files:**
- Modify: `src/hooks/useSimulation.ts`

Дизайн: храним массив `SnapshotEntry[]` + индекс «текущей» позиции в стеке. `snapshot()` теперь записывает реальный snapshot и обрезает `forward` часть. `undo()` — `idx--`, `redo()` — `idx++`. `restore(idx)` — телепортация на конкретный снимок.

- [ ] **Step 1: Расширить интерфейс**

В `UseSimulationResult`:

```ts
  // ... existing
  snapshot: (label?: string) => void;
  forecastWith: (controls: Controls, steps?: number) => ForecastPoint[];
  snapshots: SnapshotEntry[];
  snapshotIndex: number;
  undo: () => void;
  redo: () => void;
  restoreSnapshot: (idx: number) => void;
```

В imports добавить тип:

```ts
import type { EventItem, ScenarioLogEntry, SnapshotEntry } from "../types/ui";
```

- [ ] **Step 2: State для стека**

В теле хука после `const [log, setLog] = useState<ScenarioLogEntry[]>([]);` добавить:

```ts
const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
const [snapshotIndex, setSnapshotIndex] = useState<number>(-1);
```

`-1` означает: «сейчас никакого снимка не активного, мы в свободной симуляции».

- [ ] **Step 3: Заменить старую `snapshot()`**

Найти текущую `snapshot()` (`src/hooks/useSimulation.ts:120-122`):

```ts
const snapshot = useCallback((label: string = "Снимок состояния") => {
  appendLog("snapshot", label);
}, [appendLog]);
```

Заменить на:

```ts
const snapshot = useCallback((label: string = "Снимок состояния") => {
  const entry: SnapshotEntry = {
    ts: Date.now(),
    label,
    data: dataRef.current,
    controls: controlsRef.current,
    mode: modeRef.current,
    events: eventsRef.current,
  };
  setSnapshots((cur) => [...cur.slice(0, snapshotIndexRef.current + 1), entry]);
  setSnapshotIndex((idx) => idx + 1);
  appendLog("snapshot", label);
}, [appendLog]);
```

(Использует refs вместо state — иначе callback пересоздаётся каждый рендер. Refs нужно объявить.)

- [ ] **Step 4: Refs для актуальных значений state**

В блоке refs (где уже есть `controlsRef`, `latestRef`) добавить:

```ts
const dataRef = useRef<DataPoint[]>(data);
dataRef.current = data;
const modeRef = useRef<ModeKey>(mode);
modeRef.current = mode;
const eventsRef = useRef<EventItem[]>(events);
eventsRef.current = events;
const snapshotIndexRef = useRef<number>(snapshotIndex);
snapshotIndexRef.current = snapshotIndex;
```

- [ ] **Step 5: Реализовать `restoreSnapshot/undo/redo`**

После `snapshot`:

```ts
const restoreSnapshot = useCallback((idx: number) => {
  const entry = snapshotsRef.current[idx];
  if (!entry) return;
  setData(entry.data);
  setControls(entry.controls);
  setMode(entry.mode);
  setEvents(entry.events);
  setSnapshotIndex(idx);
  setLast(Date.now());
  appendLog("snapshot", `Откат к: ${entry.label}`);
}, [appendLog]);

const undo = useCallback(() => {
  const target = snapshotIndexRef.current - 1;
  if (target < 0) return;
  restoreSnapshot(target);
}, [restoreSnapshot]);

const redo = useCallback(() => {
  const target = snapshotIndexRef.current + 1;
  if (target >= snapshotsRef.current.length) return;
  restoreSnapshot(target);
}, [restoreSnapshot]);
```

И добавить `snapshotsRef`:

```ts
const snapshotsRef = useRef<SnapshotEntry[]>(snapshots);
snapshotsRef.current = snapshots;
```

- [ ] **Step 6: Сбросить snapshots в `reset()`**

Заменить тело `reset` на:

```ts
const reset = useCallback(() => {
  setMode("normal");
  setData(seed());
  setEvents([]);
  setLast(Date.now());
  setRunning(true);
  setControls(DEFAULT_CONTROLS);
  setSnapshots([]);
  setSnapshotIndex(-1);
  appendLog("reset", "Сброс симуляции");
}, [appendLog]);
```

- [ ] **Step 7: Экспортировать в return**

В return-блоке хука добавить:

```ts
return {
  // ...existing,
  snapshot,
  forecastWith,
  snapshots,
  snapshotIndex,
  undo,
  redo,
  restoreSnapshot,
};
```

- [ ] **Step 8: ScenarioLogKind**

В `src/types/ui.ts`: убедиться что в `ScenarioLogKind` нет нового kind — `restore` логирует через `snapshot` kind с лейблом «Откат к: …». Префикс лейбла отличает откат от обычного снимка визуально.

- [ ] **Step 9: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 10: Smoke test в `runTests()`**

В `src/models/digitalTwin.ts` `runTests()` snapshot-логика чисто React'овая, не покрывается. Пропускаем.

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useSimulation.ts src/types/ui.ts
git commit -m "feat: add snapshot/undo/redo stack to useSimulation"
```

### Task 3.3: Create `SnapshotControls` component

**Files:**
- Create: `src/components/SnapshotControls.tsx`

- [ ] **Step 1: Создать файл**

```tsx
// src/components/SnapshotControls.tsx
import type { SnapshotEntry } from "../types/ui";

interface SnapshotControlsProps {
  snapshots: SnapshotEntry[];
  snapshotIndex: number;
  onSnapshot: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRestore: (idx: number) => void;
}

export function SnapshotControls({
  snapshots, snapshotIndex, onSnapshot, onUndo, onRedo, onRestore,
}: SnapshotControlsProps) {
  const canUndo = snapshotIndex > 0;
  const canRedo = snapshotIndex >= 0 && snapshotIndex < snapshots.length - 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSnapshot}
          className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          📷 Снимок
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Откат
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Вперёд →
        </button>
        <span className="ml-auto text-[11px] text-slate-500">
          {snapshots.length === 0
            ? "Снимков нет"
            : `Снимок ${snapshotIndex + 1} из ${snapshots.length}`}
        </span>
      </div>
      {snapshots.length > 0 && (
        <ol className="mt-3 flex flex-wrap gap-1.5">
          {snapshots.map((s, i) => (
            <li key={s.ts}>
              <button
                type="button"
                onClick={() => onRestore(i)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                  i === snapshotIndex
                    ? "bg-indigo-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={`${s.label} (${new Date(s.ts).toLocaleTimeString("ru-RU")})`}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SnapshotControls.tsx
git commit -m "feat: SnapshotControls component"
```

### Task 3.4: Mount `SnapshotControls` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Добавить destructure**

Расширить existing destructure (~строка 22-26):

```tsx
const {
  mode, setMode, running, setRunning, latest, controls, setControls,
  events, last, chart, fc, riskResult: r, ev, rec, reset, bumpIdle,
  log, snapshot,
  snapshots, snapshotIndex, undo, redo, restoreSnapshot,
} = sim;
```

- [ ] **Step 2: Импортировать компонент**

```tsx
import { SnapshotControls } from "./components/SnapshotControls";
```

- [ ] **Step 3: Разместить рядом с ScenarioTimeline**

Найти existing `<section>` с `<ScenarioTimeline ... />` (~строка 156). Над ним добавить:

```tsx
<section>
  <SnapshotControls
    snapshots={snapshots}
    snapshotIndex={snapshotIndex}
    onSnapshot={() => snapshot("Снимок состояния")}
    onUndo={undo}
    onRedo={redo}
    onRestore={restoreSnapshot}
  />
</section>
```

(Опционально: убрать дублирующую кнопку «Снимок состояния» из `ScenarioTimeline`'s onSnapshot. Решим в Task 3.5.)

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount SnapshotControls above scenario timeline"
```

### Task 3.5: Visual smoke check

- [ ] **Step 1: Перезагрузить dev-сервер**

- [ ] **Step 2: Создать снимок**

Нажми «📷 Снимок». На SnapshotControls появилась пилюля «1». Подпись: «Снимок 1 из 1».

- [ ] **Step 3: Изменить состояние и сделать второй снимок**

Включи сценарий «Перегрев» (хоткей `2`). Подожди 5-10 секунд. Нажми «Снимок» — появляется «2».

- [ ] **Step 4: Откат**

Нажми «← Откат». Подпись «Снимок 1 из 2». Симуляция должна резко перепрыгнуть к состоянию первого снимка (Норма, низкая температура, controls сброшены к default). Лента событий — соответствует моменту первого снимка.

- [ ] **Step 5: Вперёд**

Нажми «Вперёд →». Состояние возвращается к моменту второго снимка (Перегрев).

- [ ] **Step 6: Перезапись (новый снимок убирает forward-часть стека)**

Откатись на «1». Сделай новый снимок («Снимок 2 из 2»). Проверь, что прошлый «второй» (Перегрев) исчез — кнопки «Вперёд» больше нельзя нажать.

- [ ] **Step 7: Кнопка пилюли**

Нажми пилюлю «1» — телепорт назад. Снова пилюля «2» — вернулись.

- [ ] **Step 8: Reset очищает стек**

Нажми Reset (или `R`). Снимков нет.

PR-3 готов.

---

## PR 4 — Evidence Stacked Bar

**Цель PR:** Под карточкой риска (или в диагностике) — горизонтальная stacked-bar, показывающая вклад каждой улики (overheat, vacuum drop, drift, instability) в текущий риск-скор. Под баром — подпись главной причины. Делает скрытую `evidence()` функцию **видимой**.

### Task 4.1: Add `evidenceWeights` helper

`evidence().factors[]` уже даёт вклады. Но для бар-чарта нам нужны нормализованные проценты (`score / total`) и понятный порядок. Сделаем helper.

**Files:**
- Modify: `src/models/digitalTwin.ts`

- [ ] **Step 1: Найти место**

В `digitalTwin.ts` после существующей `evidence()` (~строка 247) добавить:

```ts
// ─── Веса вкладов в риск (для UI) ─────────────────────────────────────────────
// Дополнительный helper поверх evidence(): нормализует scores в проценты,
// возвращая массив для stacked-bar.
export interface EvidenceWeight {
  key: string;
  label: string;
  percent: number;  // 0..100, доля в общем risk-скоре
  tone: RiskLevel;
}

export function evidenceWeights(ev: EvidenceResult): EvidenceWeight[] {
  if (ev.score <= 0 || ev.factors.length === 0) return [];
  const total = ev.factors.reduce((sum, f) => sum + f.score, 0);
  if (total <= 0) return [];
  return ev.factors.map((f) => ({
    key: f.key,
    label: f.label,
    percent: rnd((f.score / total) * 100, 1),
    tone: f.tone,
  }));
}
```

- [ ] **Step 2: Smoke-тест в `runTests()`**

В конце `runTests()` (после appendTick тестов, ~строка 396) добавить:

```ts
  // evidenceWeights
  const evDriftAlarm = evidence({ ...n, s: -42 });
  const weightsDrift = evidenceWeights(evDriftAlarm);
  console.assert(weightsDrift.length > 0, "evidenceWeights returns factors when risky");
  console.assert(weightsDrift[0]!.key === "s", "evidenceWeights preserves order from evidence()");
  const totalPercent = weightsDrift.reduce((sum, w) => sum + w.percent, 0);
  console.assert(Math.abs(totalPercent - 100) < 0.5, "evidenceWeights sum to ~100%");
  const evNorm = evidence(n);
  console.assert(evidenceWeights(evNorm).length === 0, "evidenceWeights empty for normal state");
```

- [ ] **Step 3: Verify compilation + tests**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run dev` и открыть консоль — 0 assertion failures.

- [ ] **Step 4: Commit**

```bash
git add src/models/digitalTwin.ts
git commit -m "feat: add evidenceWeights helper + tests"
```

### Task 4.2: Create `EvidenceBar` component

**Files:**
- Create: `src/components/EvidenceBar.tsx`

- [ ] **Step 1: Создать файл**

```tsx
// src/components/EvidenceBar.tsx
import { evidenceWeights, type EvidenceResult } from "../models/digitalTwin";

interface EvidenceBarProps {
  ev: EvidenceResult;
}

const TONE_FILL: Record<string, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  alarm: "bg-red-500",
};

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
            className={`${TONE_FILL[w.tone] ?? "bg-slate-400"} h-full`}
            style={{ width: `${w.percent}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {weights.map((w) => (
          <li key={w.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${TONE_FILL[w.tone] ?? "bg-slate-400"}`} />
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EvidenceBar.tsx
git commit -m "feat: EvidenceBar component"
```

### Task 4.3: Mount `EvidenceBar` in `ControlsPanel`

**Files:**
- Modify: `src/components/ControlsPanel.tsx`

EvidenceBar логично в секции «Диагностика» — рядом с advice и factors-list. Заменить голый список факторов на нашу bar.

- [ ] **Step 1: Импортировать**

```tsx
import { EvidenceBar } from "./EvidenceBar";
```

- [ ] **Step 2: Заменить список факторов**

Найти блок (`src/components/ControlsPanel.tsx:68-78`):

```tsx
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
```

Заменить на:

```tsx
<div className="mt-3">
  <EvidenceBar ev={ev} />
</div>
```

(EvidenceBar сама обрабатывает empty case и показывает «Все факторы в норме».)

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ControlsPanel.tsx
git commit -m "feat: replace evidence factors list with EvidenceBar"
```

### Task 4.4: Visual smoke check

- [ ] **Step 1: Normal mode**

Карточка «Диагностика» показывает «Все факторы в норме — риск нулевой».

- [ ] **Step 2: Сценарий «Перегрев» (`2`)**

Подожди до warn: появляется EvidenceBar c одной полоской (например, температура), главная причина «Температура (100%)».

- [ ] **Step 3: Несколько одновременных факторов**

Сценарий «Нестабильность питания» (`5`) — даёт несколько evidence-факторов. Bar разбивается на 2-3 цветных участка пропорционально вкладам. Под ней — список с процентами.

- [ ] **Step 4: Доля главной причины меняется при изменении controls**

В режиме «Перегрев» подними cooling — главная причина может смениться (например, дрейф или ток).

PR-4 готов.

---

## PR 5 — Decision Replay

**Цель PR:** Записываем поток действий преподавателя (изменения ползунков, переключения сценария) с временными метками. Кнопка «Воспроизвести» — чистая симуляция (`seed()`) перепроигрывает действия в том же темпе. Преподаватель: «смотрите, я делал так — а можно было иначе».

**Дизайн:**
- `DecisionAction = {ts, kind: "control" | "mode", payload: Controls | ModeKey}`
- Лог накапливается в хуке (separate from `log` который для UI timeline). Capped at 200 entries.
- Replay: запоминаем `action[0].ts`. Стартуем seed(). Каждый тик симуляции (DT=300ms) проверяем: пришло ли время следующего action — если да, применяем (через setControls/setMode). Идём по списку до конца.
- Во время replay основной симуляционный interval работает как обычно — мы только подкручиваем controls/mode по расписанию.

### Task 5.1: Add `DecisionAction` type and recording

**Files:**
- Modify: `src/types/ui.ts`
- Modify: `src/hooks/useSimulation.ts`

- [ ] **Step 1: Добавить тип**

В `src/types/ui.ts`:

```ts
export interface DecisionAction {
  ts: number;
  // Используем поля union'а вместо payload-discrimination — экспорт чище.
  controls?: Controls;
  mode?: ModeKey;
}
```

- [ ] **Step 2: Добавить state в `useSimulation`**

В imports добавить `DecisionAction`:

```ts
import type { DecisionAction, EventItem, ScenarioLogEntry, SnapshotEntry } from "../types/ui";
```

В теле хука после `const [snapshots, setSnapshots] = ...`:

```ts
const [actions, setActions] = useState<DecisionAction[]>([]);
const [replayActive, setReplayActive] = useState(false);
```

- [ ] **Step 3: Перехватывать `setControls` / `setMode`**

Заменить existing `setModeLogged` (~строка 105) на:

```ts
const setModeLogged = useCallback<(mode: ModeKey) => void>((next) => {
  setMode(next);
  appendLog("scenario", SCENARIOS[next][0]);
  if (!replayActiveRef.current) {
    setActions((cur) => [...cur, { ts: Date.now(), mode: next }].slice(-200));
  }
}, [appendLog]);
```

(`replayActiveRef` нужен — иначе replay сам пишется в actions и зацикливается.)

И обернуть `setControls`:

```ts
const setControlsTracked = useCallback<typeof setControls>((next) => {
  setControls(next);
  if (!replayActiveRef.current) {
    const resolved = typeof next === "function" ? next(controlsRef.current) : next;
    setActions((cur) => [...cur, { ts: Date.now(), controls: resolved }].slice(-200));
  }
}, []);
```

Добавить ref:

```ts
const replayActiveRef = useRef<boolean>(false);
replayActiveRef.current = replayActive;
```

В return-объекте заменить:

```ts
return {
  // ...
  setControls: setControlsTracked,
  // ...
};
```

- [ ] **Step 4: Очищать actions в `reset`**

Внутрь `reset()`:

```ts
setActions([]);
```

(сразу после `setSnapshots([])`).

- [ ] **Step 5: Экспортировать в результат хука**

В `UseSimulationResult`:

```ts
  actions: DecisionAction[];
  replayActive: boolean;
  startReplay: () => void;
  stopReplay: () => void;
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit`

Замечание: `setControlsTracked` теперь имеет тип `typeof setControls` который уже React.Dispatch<...>. Проверь что type-check проходит — может потребоваться явная сигнатура `(next: Controls | ((prev: Controls) => Controls)) => void`.

- [ ] **Step 7: Commit (без startReplay/stopReplay impl)**

```bash
git add src/types/ui.ts src/hooks/useSimulation.ts
git commit -m "feat: record DecisionAction stream from controls/mode changes"
```

### Task 5.2: Implement replay loop

**Files:**
- Modify: `src/hooks/useSimulation.ts`

- [ ] **Step 1: Реализовать `startReplay/stopReplay`**

После `restoreSnapshot/undo/redo`, перед return:

```ts
const replayCursorRef = useRef<number>(0);
const replayStartTsRef = useRef<number>(0);
const replayBaseTsRef = useRef<number>(0);

const stopReplay = useCallback(() => {
  setReplayActive(false);
  replayCursorRef.current = 0;
}, []);

const startReplay = useCallback(() => {
  if (actionsRef.current.length === 0) return;
  // Reset to seed, заморозить стек снимков (он не очищается, но во время replay
  // не пишется), сбросить controls/mode.
  setData(seed());
  setEvents([]);
  setLast(Date.now());
  setMode("normal");
  setControls(DEFAULT_CONTROLS);
  setReplayActive(true);
  replayCursorRef.current = 0;
  replayStartTsRef.current = Date.now();
  replayBaseTsRef.current = actionsRef.current[0]!.ts;
  appendLog("snapshot", "▶ Воспроизведение начато");
}, [appendLog]);
```

Также нужен `actionsRef`:

```ts
const actionsRef = useRef<DecisionAction[]>(actions);
actionsRef.current = actions;
```

- [ ] **Step 2: Replay-цикл — отдельный useEffect**

После основного simulation `useEffect` (~строка 81) добавить:

```ts
useEffect(() => {
  if (!replayActive) return undefined;
  const id = setInterval(() => {
    const elapsed = Date.now() - replayStartTsRef.current;
    const list = actionsRef.current;
    while (replayCursorRef.current < list.length) {
      const a = list[replayCursorRef.current]!;
      const offset = a.ts - replayBaseTsRef.current;
      if (offset > elapsed) break;
      // Применяем action в обход трекинга (replayActiveRef true → не записываем).
      if (a.mode !== undefined) setMode(a.mode);
      if (a.controls !== undefined) setControls(a.controls);
      replayCursorRef.current += 1;
    }
    if (replayCursorRef.current >= list.length) {
      stopReplay();
      appendLog("snapshot", "⏹ Воспроизведение завершено");
    }
  }, 100);
  return () => clearInterval(id);
}, [replayActive, stopReplay, appendLog]);
```

- [ ] **Step 3: Экспортировать в return**

```ts
return {
  // ...
  actions,
  replayActive,
  startReplay,
  stopReplay,
};
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSimulation.ts
git commit -m "feat: replay loop in useSimulation"
```

### Task 5.3: Create `ReplayControls` component

**Files:**
- Create: `src/components/ReplayControls.tsx`

- [ ] **Step 1: Создать**

```tsx
// src/components/ReplayControls.tsx
import type { DecisionAction } from "../types/ui";

interface ReplayControlsProps {
  actions: DecisionAction[];
  replayActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ReplayControls({ actions, replayActive, onStart, onStop }: ReplayControlsProps) {
  const total = actions.length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {replayActive ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
          >
            ⏹ Остановить
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={total === 0}
            className="rounded-xl bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ▶ Воспроизвести
          </button>
        )}
        <span className="text-[11px] text-slate-500">
          {replayActive
            ? "Идёт воспроизведение..."
            : total === 0
              ? "Нечего воспроизводить — никаких действий ещё не записано"
              : `Записано действий: ${total}`}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReplayControls.tsx
git commit -m "feat: ReplayControls component"
```

### Task 5.4: Mount `ReplayControls` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Расширить destructure**

```tsx
const {
  mode, setMode, running, setRunning, latest, controls, setControls,
  events, last, chart, fc, riskResult: r, ev, rec, reset, bumpIdle,
  log, snapshot, snapshots, snapshotIndex, undo, redo, restoreSnapshot,
  actions, replayActive, startReplay, stopReplay,
} = sim;
```

- [ ] **Step 2: Импортировать**

```tsx
import { ReplayControls } from "./components/ReplayControls";
```

- [ ] **Step 3: Разместить рядом со SnapshotControls**

Замени существующую `<section><SnapshotControls .../></section>` на flex-row:

```tsx
<section className="grid gap-3 sm:grid-cols-2">
  <SnapshotControls
    snapshots={snapshots}
    snapshotIndex={snapshotIndex}
    onSnapshot={() => snapshot("Снимок состояния")}
    onUndo={undo}
    onRedo={redo}
    onRestore={restoreSnapshot}
  />
  <ReplayControls
    actions={actions}
    replayActive={replayActive}
    onStart={startReplay}
    onStop={stopReplay}
  />
</section>
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount ReplayControls next to SnapshotControls"
```

### Task 5.5: Visual smoke check

- [ ] **Step 1: Базовое поведение**

Кнопка «▶ Воспроизвести» disabled если ничего не записано (после Reset). Подпись: «Нечего воспроизводить...».

- [ ] **Step 2: Записать сценарий**

В режиме «Применить» (default):
- Подвинь heater на 1.4 (правее).
- Через 3 секунды — пощёлкай сценарий «Перегрев» (`2`).
- Ещё через 5 секунд — поставь cooling на максимум.
- Подпись: «Записано действий: 3».

- [ ] **Step 3: Воспроизвести**

Нажми «▶ Воспроизвести». Кнопка меняется на «⏹ Остановить». 
- Состояние сначала возвращается в seed (все ползунки в default, mode=normal, история перерисовалась с нуля).
- Затем по таймингу проигрывается каждое действие: heater → +0.0с, mode=thermal → +3с, cooling=1 → +8с.
- В ленте сценариев появляются записи «▶ Воспроизведение начато», и сценарий-логи как при ручном выполнении.

- [ ] **Step 4: Завершение**

Через ~8с после старта (когда последнее action применено) replay сам останавливается. Кнопка возвращается на «▶ Воспроизвести». Лог: «⏹ Воспроизведение завершено».

- [ ] **Step 5: Прерывание**

Запусти replay и сразу нажми «⏹ Остановить». Replay прекращается мгновенно, симуляция продолжает идти с того состояния, на котором её прервали.

- [ ] **Step 6: Reset очищает actions**

Нажми Reset. ReplayControls — снова disabled.

PR-5 готов.

---

## Финальная верификация Этапа 2

Run: `npx tsc --noEmit` — 0 errors.
Run: `npm run build` — successful.
Run: `npm run dev` и открыть http://localhost:5173/, console — 0 assertion failures.

Полный лекционный прогон:

- [ ] Включить «Только посмотреть», подвинуть heater — серая пунктирная линия what-if на графике, легенда показывает «What-if (превью)».
- [ ] Включить тепловой сценарий (`2`), посмотреть как **baseline** (тонкая фоновая линия) расходится с **реальным** прогнозом по мере включения cooling.
- [ ] Сделать снимок (📷), подождать 5 сек, сделать ещё один. Откатиться. Восстановиться. Pилюля 1 vs 2.
- [ ] При тепловом сценарии — посмотреть EvidenceBar: главная причина «Температура».
- [ ] Запустить «▶ Воспроизвести» — увидеть автоматический повтор управляющих действий.

**Метрики успеха Этапа 2** (из дорожной карты):
- В любой момент есть ответ на «почему риск именно такой» — через EvidenceBar.
- Преподаватель может откатить состояние и показать альтернативный путь без перезапуска симуляции.

Если все чекбоксы зелёные — Этап 2 завершён. Можно идти к Этапу 3 (Educational Overlay) или мержить ветку через skill `finishing-a-development-branch`.
