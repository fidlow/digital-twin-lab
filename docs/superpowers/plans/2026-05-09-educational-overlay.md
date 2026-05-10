# Educational Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить инженерный демо-стенд в самостоятельный учебный инструмент: уроки-сценарии с пошаговым ведением, объяснения формул и метрик через `?`-иконки, легенду доверительной полосы прогноза, переключатель уровня сложности (базовый / продвинутый) и quiz-режим для интерактивного вызова аудитории.

**Architecture:** Pure data (JSON-уроки и quiz'ы) + React hooks-движки (`useLessonRunner`, `useQuiz`) поверх существующего `useSimulation`. Никаких новых state-менеджеров. Компоненты рендера (`LessonRunner`, `ExplanationDrawer`, `QuizOverlay`, `DifficultyToggle`) подключаются в `App.tsx`. Уровень сложности — boolean через новый `DifficultyContext` (`'basic' | 'advanced'`), который потребляют `MetricCards`, `ControlsPanel`, `App` для скрытия/показа продвинутых элементов.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind 4 + KaTeX (для формул). Без новых зависимостей. Smoke-тесты — в `runTests()` в `src/models/digitalTwin.ts`.

---

## File Structure

**Create:**
- `src/lessons/lessons.ts` — массив `Lesson` объектов (3 стартовых урока) с типобезопасной декларацией
- `src/lessons/quizzes.ts` — массив `Quiz` объектов
- `src/types/lessons.ts` — типы `Lesson`, `LessonStep`, `LessonAction`, `Quiz`, `QuizOption`
- `src/hooks/useLessonRunner.ts` — управляет прогрессом урока, программно дёргает `useSimulation`
- `src/hooks/useQuiz.ts` — управляет состоянием активного quiz'а, паузой симуляции и применением выбранного ответа
- `src/components/LessonRunner.tsx` — нижняя плашка с прогрессом и кнопкой «Следующий шаг»
- `src/components/LessonPicker.tsx` — селектор урока (выпадающий список или плашка с кнопками)
- `src/components/ExplanationDrawer.tsx` — боковая панель с формулой/смыслом/константами
- `src/components/QuizOverlay.tsx` — модал с вопросом и вариантами
- `src/components/DifficultyToggle.tsx` — переключатель Базовый/Продвинутый в шапке
- `src/contexts/DifficultyContext.tsx` — `'basic' | 'advanced'` через React context
- `src/docs/explanations.ts` — карта `key → { title, formula?, body, constants? }` для метрик и риск-скора

**Modify:**
- `src/components/Card.tsx` — добавить `infoKey?: string` prop и `?`-иконку, открывающую drawer
- `src/components/MetricCards.tsx` — пробросить `infoKey` для каждой карточки + Сценарий/Риск получают свои `?`
- `src/components/ControlsPanel.tsx` — в Diagnostics использовать `useDifficulty()` для скрытия числовых констант в Basic
- `src/components/EvidenceBar.tsx` — в Basic режиме скрыть детальный список факторов, оставить только bar и главную причину
- `src/components/ForecastLegend.tsx` — расширить пояснением «область ±1σ ≈ 68%»
- `src/components/TelemetryChart.tsx` — small text label «±1σ» в углу band'а
- `src/App.tsx` — wire DifficultyProvider, LessonRunner, QuizOverlay, ExplanationDrawer state
- `src/models/digitalTwin.ts` — добавить тесты для нового pure helper (если будет)

**Не трогаем:** физику в digitalTwin.ts (`point`, `risk`, `evidence`, `forecast`, `appendTick`), модели Этапов 1-2 (`useSimulation` остаётся как есть — мы только её consumer'ы).

---

## PR 1 — Lesson Mode

**Цель PR:** JSON-уроки и движок, который ведёт преподавателя по связной истории — переключает сценарий, ждёт условие, переводит на следующий шаг.

### Task 1.1: Add lesson types

**Files:**
- Create: `src/types/lessons.ts`

- [ ] **Step 1: Создать файл с типами**

```ts
// src/types/lessons.ts
import type { Controls, ModeKey } from "../models/digitalTwin";

// Действие, которое движок применяет при входе в шаг.
export type LessonAction =
  | { kind: "setMode"; mode: ModeKey }
  | { kind: "setControls"; controls: Controls }
  | { kind: "setPreview"; on: boolean }
  | { kind: "noop" };

// Условие перехода со шага на следующий.
export type LessonCondition =
  | { kind: "manual" }                       // ждём клика "Следующий шаг"
  | { kind: "delay"; ms: number }            // ждём N миллисекунд
  | { kind: "riskAtLeast"; threshold: number }  // ждём пока ev.score ≥ threshold
  | { kind: "tempAtLeast"; threshold: number }; // ждём пока latest.t ≥ threshold

export interface LessonStep {
  text: string;                  // текст для нижней плашки (Russian)
  action?: LessonAction;         // что сделать при входе в шаг
  advanceOn: LessonCondition;    // как перейти к следующему
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;               // короткое описание для селектора
  steps: LessonStep[];
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/lessons.ts
git commit -m "feat: add lesson types"
```

### Task 1.2: Author 3 starter lessons

**Files:**
- Create: `src/lessons/lessons.ts`

- [ ] **Step 1: Создать файл**

```ts
// src/lessons/lessons.ts
import type { Lesson } from "../types/lessons";

export const LESSONS: Lesson[] = [
  {
    id: "late-reaction",
    title: "Когда поздно реагировать",
    summary: "Тепловой отказ + позднее охлаждение → перегрев. Цель — увидеть ценность раннего прогноза.",
    steps: [
      { text: "Установка в норме. Обратите внимание: риск-скор около нуля, прогноз температуры идёт ровно.", advanceOn: { kind: "manual" } },
      { text: "Включаем сценарий «Перегрев». Тепловой поток превышает естественные потери.", action: { kind: "setMode", mode: "thermal" }, advanceOn: { kind: "delay", ms: 4000 } },
      { text: "Смотрим на прогноз: серая baseline-линия (без вмешательства) уходит вверх. Ждём, пока риск превысит 30.", advanceOn: { kind: "riskAtLeast", threshold: 30 } },
      { text: "Реагируем поздно: включаем охлаждение на максимум.", action: { kind: "setControls", controls: { heater: 1, cooling: 1 } }, advanceOn: { kind: "delay", ms: 6000 } },
      { text: "Температура продолжает расти по инерции. Если бы мы среагировали на ранний прогноз, перегрева можно было бы избежать.", advanceOn: { kind: "manual" } },
    ],
  },
  {
    id: "evidence-reading",
    title: "Чтение evidence",
    summary: "Дрейф измерительного канала. Учимся читать вклад каждой улики в риск-скор.",
    steps: [
      { text: "Норма: смотрим на блок «Вклад в риск» — он показывает «Все факторы в норме».", action: { kind: "setMode", mode: "normal" }, advanceOn: { kind: "manual" } },
      { text: "Включаем сценарий «Дрейф сигнала». Базовая линия измерительного канала медленно уходит.", action: { kind: "setMode", mode: "signal" }, advanceOn: { kind: "delay", ms: 5000 } },
      { text: "Stacked-bar показывает доминирующий фактор «Дрейф». Главная причина подписана прямо под полосой.", advanceOn: { kind: "manual" } },
      { text: "Заметили: цифра в карточке «Риск» — это сумма по всем факторам. Открыть `?` рядом с риском, чтобы увидеть формулу.", advanceOn: { kind: "manual" } },
    ],
  },
  {
    id: "what-if-vs-react",
    title: "What-if против реакции по факту",
    summary: "Два прохождения утечки вакуума: с предпросмотром и без. Видна разница в скорости стабилизации.",
    steps: [
      { text: "Запускаем «Утечку вакуума» — давление растёт. Мы пока не вмешиваемся.", action: { kind: "setMode", mode: "vacuum" }, advanceOn: { kind: "delay", ms: 5000 } },
      { text: "Включаем «Только посмотреть» и крутим ползунки — серая пунктирная линия показывает, как изменится прогноз.", action: { kind: "setPreview", on: true }, advanceOn: { kind: "manual" } },
      { text: "Применяем то воздействие, которое выбрали в превью.", action: { kind: "setPreview", on: false }, advanceOn: { kind: "manual" } },
      { text: "Сравните с реакцией «по факту»: преподаватель может откатить снимок и попробовать без what-if. Сравнение видно на ленте сценариев.", advanceOn: { kind: "manual" } },
    ],
  },
];

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lessons/lessons.ts
git commit -m "feat: add 3 starter lessons"
```

### Task 1.3: Add `useLessonRunner` hook

**Files:**
- Create: `src/hooks/useLessonRunner.ts`

Хук внутренне держит `lessonId | null` + `stepIndex`. На входе в каждый шаг применяет `action` к симуляционному API. На основе условия `advanceOn` либо ждёт ручного клика, либо запускает таймер, либо подписывается на изменения симуляционного state.

- [ ] **Step 1: Создать файл**

```ts
// src/hooks/useLessonRunner.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lesson, LessonAction, LessonCondition } from "../types/lessons";
import type { Controls, ModeKey } from "../models/digitalTwin";

export interface LessonHostApi {
  setMode: (mode: ModeKey) => void;
  setControls: (next: Controls) => void;
  setPreview: (on: boolean) => void;
  // Live state read for conditions:
  getRisk: () => number;
  getTemperature: () => number;
}

export interface UseLessonRunnerResult {
  activeLesson: Lesson | null;
  stepIndex: number;
  totalSteps: number;
  start: (lesson: Lesson) => void;
  next: () => void;
  stop: () => void;
}

export function useLessonRunner(host: LessonHostApi): UseLessonRunnerResult {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const hostRef = useRef<LessonHostApi>(host);
  hostRef.current = host;

  const totalSteps = activeLesson?.steps.length ?? 0;

  const applyAction = useCallback((action?: LessonAction) => {
    if (!action) return;
    const h = hostRef.current;
    if (action.kind === "setMode") h.setMode(action.mode);
    else if (action.kind === "setControls") h.setControls(action.controls);
    else if (action.kind === "setPreview") h.setPreview(action.on);
  }, []);

  // На входе в каждый шаг — применяем action.
  useEffect(() => {
    if (!activeLesson) return;
    const step = activeLesson.steps[stepIndex];
    if (!step) return;
    applyAction(step.action);
  }, [activeLesson, stepIndex, applyAction]);

  // Условие advanceOn — поллинг каждые 250 мс для delay/riskAtLeast/tempAtLeast.
  useEffect(() => {
    if (!activeLesson) return undefined;
    const step = activeLesson.steps[stepIndex];
    if (!step) return undefined;
    const cond: LessonCondition = step.advanceOn;
    if (cond.kind === "manual") return undefined;
    const enteredAt = Date.now();
    const id = setInterval(() => {
      let advance = false;
      if (cond.kind === "delay") advance = Date.now() - enteredAt >= cond.ms;
      else if (cond.kind === "riskAtLeast") advance = hostRef.current.getRisk() >= cond.threshold;
      else if (cond.kind === "tempAtLeast") advance = hostRef.current.getTemperature() >= cond.threshold;
      if (advance) setStepIndex((i) => Math.min(i + 1, activeLesson.steps.length));
    }, 250);
    return () => clearInterval(id);
  }, [activeLesson, stepIndex]);

  const start = useCallback((lesson: Lesson) => {
    setActiveLesson(lesson);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    if (!activeLesson) return;
    setStepIndex((i) => Math.min(i + 1, activeLesson.steps.length));
  }, [activeLesson]);

  const stop = useCallback(() => {
    setActiveLesson(null);
    setStepIndex(0);
  }, []);

  return { activeLesson, stepIndex, totalSteps, start, next, stop };
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLessonRunner.ts
git commit -m "feat: add useLessonRunner hook"
```

### Task 1.4: Create `LessonRunner` and `LessonPicker` components

**Files:**
- Create: `src/components/LessonRunner.tsx`
- Create: `src/components/LessonPicker.tsx`

`LessonPicker` — выбор урока. `LessonRunner` — нижняя плашка во время активного урока с прогрессом и «Следующий шаг» (показывается только если `advanceOn === manual` для текущего шага; иначе — статус ожидания).

- [ ] **Step 1: Создать `src/components/LessonPicker.tsx`**

```tsx
// src/components/LessonPicker.tsx
import { LESSONS } from "../lessons/lessons";
import type { Lesson } from "../types/lessons";

interface LessonPickerProps {
  activeLessonId: string | null;
  onStart: (lesson: Lesson) => void;
  onStop: () => void;
}

export function LessonPicker({ activeLessonId, onStart, onStop }: LessonPickerProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Учебные истории</h2>
        {activeLessonId && (
          <button
            type="button"
            onClick={onStop}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900"
          >
            ⏹ остановить урок
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">Каждый урок ведёт через сценарий и поясняет, на что смотреть.</p>
      <ul className="space-y-2">
        {LESSONS.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onStart(l)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                activeLessonId === l.id
                  ? "border-indigo-700 bg-indigo-700 text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              <b className="text-sm">{l.title}</b>
              <p className={`text-xs ${activeLessonId === l.id ? "text-indigo-100" : "text-slate-500"}`}>{l.summary}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Создать `src/components/LessonRunner.tsx`**

```tsx
// src/components/LessonRunner.tsx
import type { Lesson } from "../types/lessons";

interface LessonRunnerProps {
  lesson: Lesson;
  stepIndex: number;
  onNext: () => void;
  onStop: () => void;
}

export function LessonRunner({ lesson, stepIndex, onNext, onStop }: LessonRunnerProps) {
  const total = lesson.steps.length;
  const finished = stepIndex >= total;
  const step = lesson.steps[stepIndex];
  const percent = Math.round(((finished ? total : stepIndex) / total) * 100);
  const isManual = step?.advanceOn.kind === "manual";

  return (
    <div className="fixed bottom-4 left-1/2 z-30 w-[min(92vw,720px)] -translate-x-1/2 rounded-3xl border border-indigo-200 bg-white p-4 shadow-2xl">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{lesson.title}</p>
        <p className="text-xs text-slate-500">
          {finished ? `Готово (${total} из ${total})` : `Шаг ${stepIndex + 1} из ${total}`}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-800">
        {finished ? "Урок завершён. Нажмите «Закончить», чтобы вернуться к свободному режиму." : step?.text}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        {finished ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            Закончить
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onStop}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Прервать
            </button>
            {isManual ? (
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Следующий шаг
              </button>
            ) : (
              <span className="self-center text-[11px] text-slate-500">ждём наступления условия…</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/LessonRunner.tsx src/components/LessonPicker.tsx
git commit -m "feat: LessonPicker and LessonRunner components"
```

### Task 1.5: Wire lesson runner into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Импорты**

В `src/App.tsx` после строки `import { ForecastLegend } from "./components/ForecastLegend";` добавить:

```tsx
import { LessonPicker } from "./components/LessonPicker";
import { LessonRunner } from "./components/LessonRunner";
import { useLessonRunner } from "./hooks/useLessonRunner";
```

- [ ] **Step 2: Подключить хук**

После `const baselineFc = sim.forecastWith(DEFAULT_CONTROLS);` добавить:

```tsx
const lesson = useLessonRunner({
  setMode: sim.setMode,
  setControls: (next) => sim.setControls(next),
  setPreview: setPreviewMode,
  getRisk: () => sim.ev.score,
  getTemperature: () => sim.latest.t,
});
```

- [ ] **Step 3: Mount LessonPicker как новую секцию**

Перед существующим `<TheorySection />` (примерно после `</section>` который закрывает chart+controls grid):

```tsx
<section>
  <LessonPicker
    activeLessonId={lesson.activeLesson?.id ?? null}
    onStart={lesson.start}
    onStop={lesson.stop}
  />
</section>
```

- [ ] **Step 4: Mount LessonRunner overlay**

Внутри `<PresenterProvider>...</PresenterProvider>`, рядом с `<HotkeysOverlay .../>` добавить:

```tsx
{lesson.activeLesson && (
  <LessonRunner
    lesson={lesson.activeLesson}
    stepIndex={lesson.stepIndex}
    onNext={lesson.next}
    onStop={lesson.stop}
  />
)}
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire lesson runner into App"
```

### Task 1.6: Visual smoke check lessons

- [ ] **Step 1: Запустить dev** и открыть http://localhost:5173/.
- [ ] **Step 2:** В новой секции «Учебные истории» — список 3 уроков. Кликни «Когда поздно реагировать». Появляется нижняя плашка с прогресс-баром и текстом первого шага. Кнопка «Следующий шаг» доступна.
- [ ] **Step 3:** Жми «Следующий шаг» — текст обновляется. На втором шаге сценарий автоматически переключается на «Перегрев». Кнопка превращается в «ждём наступления условия…», пока не пройдут 4 секунды.
- [ ] **Step 4:** На третьем шаге ожидание идёт до риска ≥ 30. Когда условие выполняется, plашка автоматически перешла на следующий шаг.
- [ ] **Step 5:** Дойди до конца — появляется кнопка «Закончить». Нажми — плашка пропадает.
- [ ] **Step 6:** «Прервать» в середине — плашка пропадает, симуляция продолжает.

PR-1 готов.

---

## PR 2 — Explanations (`?`-icon drawer)

**Цель PR:** Иконка `?` на каждой метрике + риск-скоре открывает боковую панель с формулой (KaTeX), физическим смыслом и константами.

### Task 2.1: Authoring `src/docs/explanations.ts`

**Files:**
- Create: `src/docs/explanations.ts`

- [ ] **Step 1: Создать файл**

```ts
// src/docs/explanations.ts
// Тексты карточек справки: формулы из digitalTwin (FORMULAS), плюс физический смысл
// и список констант. Используются ExplanationDrawer'ом.

export interface Explanation {
  title: string;
  formula?: string;     // KaTeX-исходник (raw); используется компонентом <Tex>
  body: string;         // 1-2 абзаца простым текстом
  constants?: { name: string; value: string; unit?: string; note?: string }[];
}

export const EXPLANATIONS: Record<string, Explanation> = {
  scenario: {
    title: "Активный сценарий",
    body: "Текущий режим работы установки. От него зависит, какие физические возмущения вмешиваются в модель: перегрев, утечка вакуума, дрейф измерительного канала или нестабильность питания.",
  },
  risk: {
    title: "Индекс риска",
    formula: String.raw`R = \sum_i r_i,\quad 0 \le R \le 100`,
    body: "Сумма вкладов rᵢ от каждого параметра, превысившего порог. Полоса «Вклад в риск» в Диагностике показывает, как именно собирается это число. Главная причина — самый крупный вклад.",
    constants: [
      { name: "Порог warning", value: "паспортный нижний предел", note: "из таблицы LIMITS в digitalTwin" },
      { name: "Порог alarm", value: "паспортный верхний предел" },
    ],
  },
  t: {
    title: "Температура",
    formula: String.raw`T_{k+1} = T_k + (\alpha I^2 - \beta\,(T_k - T_a))\,\Delta t + \varepsilon`,
    body: "Накапливающаяся тепловая модель: джоулев нагрев растёт квадратично от тока, потери линейно от перепада с окружением. Сценарий «Перегрев» добавляет внешний теплопоток (повреждённая изоляция).",
    constants: [
      { name: "α (HEAT_IN_K)", value: "0.46" },
      { name: "β (HEAT_LOSS_NAT)", value: "0.12" },
      { name: "γ (HEAT_LOSS_COOL)", value: "0.30", note: "добавка к β при cooling = 1" },
      { name: "Tₐ (T_AMBIENT)", value: "25", unit: "°C" },
      { name: "Порог warning / alarm", value: "74 / 82", unit: "°C" },
    ],
  },
  p: {
    title: "Давление",
    formula: String.raw`p_{k+1} = p_k + \Delta p_{\text{утечки}} + \varepsilon`,
    body: "Накапливающаяся модель давления в камере. Δp_утечки активно только в сценарии «Утечка вакуума» и сдвигает базу вверх со временем.",
    constants: [
      { name: "Порог warning / alarm", value: "0.035 / 0.06", unit: "Па" },
    ],
  },
  i: {
    title: "Ток нагрузки",
    formula: String.raw`I_k = I_{\text{баз}}\,u_h + \Delta I_{\text{реж}} + \varepsilon`,
    body: "Базовый ток умножается на ползунок нагревателя u_h (0,6–1,6). Сценарий добавляет режимную надбавку.",
    constants: [
      { name: "I_баз", value: "≈ 2.9", unit: "А" },
      { name: "u_h диапазон", value: "0.6 … 1.6" },
      { name: "Порог warning / alarm", value: "3.8 / 4.4", unit: "А" },
    ],
  },
  w: {
    title: "Мощность нагревателя",
    formula: String.raw`P_k = U \cdot I_k`,
    body: "Простой закон Ома: напряжение постоянное, мощность линейна по току.",
    constants: [
      { name: "U (HEATER_U)", value: "24", unit: "В" },
      { name: "Порог warning / alarm", value: "90 / 106", unit: "Вт" },
    ],
  },
};
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/docs/explanations.ts
git commit -m "feat: add explanations data for metric drawer"
```

### Task 2.2: Create `ExplanationDrawer` component

**Files:**
- Create: `src/components/ExplanationDrawer.tsx`

- [ ] **Step 1: Создать файл**

```tsx
// src/components/ExplanationDrawer.tsx
import { Tex } from "./Tex";
import { EXPLANATIONS } from "../docs/explanations";

interface ExplanationDrawerProps {
  openKey: string | null;
  onClose: () => void;
}

export function ExplanationDrawer({ openKey, onClose }: ExplanationDrawerProps) {
  if (!openKey) return null;
  const exp = EXPLANATIONS[openKey];
  if (!exp) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-auto bg-white p-6 shadow-2xl"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">{exp.title}</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200" aria-label="Закрыть">×</button>
        </div>
        {exp.formula && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <Tex display wrap>{exp.formula}</Tex>
          </div>
        )}
        <p className="mt-4 text-sm leading-6 text-slate-700">{exp.body}</p>
        {exp.constants && exp.constants.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {exp.constants.map((c) => (
              <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="font-mono text-slate-700">
                  {c.value}{c.unit ? ` ${c.unit}` : ""}
                </span>
                {c.note && <span className="basis-full text-xs text-slate-500">{c.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ExplanationDrawer.tsx
git commit -m "feat: ExplanationDrawer component"
```

### Task 2.3: Add `?`-icon to `Card` component

**Files:**
- Modify: `src/components/Card.tsx`

- [ ] **Step 1: Расширить интерфейс**

```tsx
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
  infoKey?: string;
  onInfo?: (key: string) => void;
}

export function Card({ title, value, unit, tone, hint, infoKey, onInfo }: CardProps) {
  const presenter = usePresenter();
  const sizeValue = presenter ? "text-4xl" : "text-2xl";
  const sizeUnit = presenter ? "text-base" : "text-sm";
  const sizeTitle = presenter ? "text-sm" : "text-xs";
  const sizeHint = presenter ? "text-sm" : "text-xs";
  return (
    <div className={`relative rounded-2xl border p-4 shadow-sm ${toneClass(tone)}`}>
      {infoKey && onInfo && (
        <button
          type="button"
          onClick={() => onInfo(infoKey)}
          className="absolute right-2 top-2 rounded-full bg-white/70 px-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white"
          aria-label="Объяснение"
          title="Открыть объяснение"
        >
          ?
        </button>
      )}
      <p className={`${sizeTitle} uppercase opacity-70`}>{title}</p>
      <p className={`mt-2 ${sizeValue} font-semibold`}>
        {value} <span className={sizeUnit}>{unit}</span>
      </p>
      <p className={`mt-2 ${sizeHint} opacity-80`}>{hint}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Card.tsx
git commit -m "feat: optional ?-icon and onInfo on Card"
```

### Task 2.4: Wire `?` icons in MetricCards

**Files:**
- Modify: `src/components/MetricCards.tsx`

- [ ] **Step 1: Обновить пропсы**

```tsx
import { paramTone, SCENARIOS, type DataPoint, type EvidenceResult, type ModeKey, type RiskResult } from "../models/digitalTwin";
import { Card, toneClass } from "./Card";
import { usePresenter } from "../contexts/PresenterContext";

interface MetricCardsProps {
  mode: ModeKey;
  latest: DataPoint;
  riskResult: RiskResult;
  ev: EvidenceResult;
  onInfo?: (key: string) => void;
}

export function MetricCards({ mode, latest, riskResult, ev, onInfo }: MetricCardsProps) {
  const presenter = usePresenter();
  const sizeRisk = presenter ? "text-5xl" : "text-2xl";
  const sizeName = presenter ? "text-xl" : "text-base";
  const sizeMeta = presenter ? "text-sm" : "text-xs";
  const helpButton = (key: string) => (
    <button
      type="button"
      onClick={() => onInfo?.(key)}
      className="absolute right-2 top-2 rounded-full bg-white/70 px-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white"
      aria-label="Объяснение"
      title="Открыть объяснение"
    >
      ?
    </button>
  );

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div className={`relative rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        {onInfo && helpButton("scenario")}
        <p className={`${sizeMeta} uppercase opacity-70`}>Сценарий</p>
        <p className={`mt-2 ${sizeName} font-semibold leading-tight`}>{SCENARIOS[mode][0]}</p>
        <p className={`mt-2 ${sizeMeta} opacity-80`}>{SCENARIOS[mode][1]}</p>
      </div>
      <div className={`relative rounded-2xl border p-4 shadow-sm ${toneClass(riskResult[1])}`}>
        {onInfo && helpButton("risk")}
        <p className={`${sizeMeta} uppercase opacity-70`}>Риск</p>
        <p className={`mt-2 ${sizeRisk} font-semibold`}>{ev.score} <span className={presenter ? "text-base" : "text-sm"}>/ 100</span></p>
        <p className={`mt-2 ${sizeMeta} opacity-80`}>{riskResult[0]}</p>
      </div>
      <Card title="Температура" value={latest.t} unit="°C" tone={paramTone(latest, "t").tone} hint="Порог: 74 / 82 °C" infoKey="t" onInfo={onInfo} />
      <Card title="Давление" value={latest.p} unit="Па" tone={paramTone(latest, "p").tone} hint="Порог: 0.035 / 0.06 Па" infoKey="p" onInfo={onInfo} />
      <Card title="Ток нагрузки" value={latest.i} unit="А" tone={paramTone(latest, "i").tone} hint="Силовая цепь нагревателя" infoKey="i" onInfo={onInfo} />
      <Card title="Мощность" value={latest.w} unit="Вт" tone={paramTone(latest, "w").tone} hint="P = U × I, U = 24 В" infoKey="w" onInfo={onInfo} />
    </section>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MetricCards.tsx
git commit -m "feat: pass onInfo to MetricCards for ?-icons"
```

### Task 2.5: Wire drawer in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Импорт**

```tsx
import { ExplanationDrawer } from "./components/ExplanationDrawer";
```

- [ ] **Step 2: Добавить state**

После `const [previewControls, setPreviewControls] = useState(controls);` добавить:

```tsx
const [explanationKey, setExplanationKey] = useState<string | null>(null);
```

- [ ] **Step 3: Передать в `<MetricCards>` и поместить drawer**

```tsx
<MetricCards mode={mode} latest={latest} riskResult={r} ev={ev} onInfo={setExplanationKey} />
```

И ниже `<HotkeysOverlay ... />` добавить:

```tsx
<ExplanationDrawer openKey={explanationKey} onClose={() => setExplanationKey(null)} />
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire ExplanationDrawer into App"
```

### Task 2.6: Visual smoke check explanations

- [ ] **Step 1:** В каждой из 6 карточек метрик есть `?`-иконка в правом верхнем углу.
- [ ] **Step 2:** Кликни `?` на «Температура» — открывается боковая панель: формула KaTeX, текст про джоулев нагрев, список констант α/β/γ/Tₐ/пороги.
- [ ] **Step 3:** Закрой кликом по фону или крестику.
- [ ] **Step 4:** Кликни `?` на «Риск» — формула суммы и пояснение.

PR-2 готов.

---

## PR 3 — Forecast Legend ±1σ

**Цель PR:** Маленькая, но важная UX-правка из эксплоратора Этапа 1: серая полоса ±1σ вокруг прогноза не подписана. Расширим `ForecastLegend` пояснением и добавим подпись прямо на графике.

### Task 3.1: Extend `ForecastLegend`

**Files:**
- Modify: `src/components/ForecastLegend.tsx`

- [ ] **Step 1: Заменить файл**

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
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <span className="inline-block h-2.5 w-5 rounded bg-indigo-200" />
        Полоса ±1σ ≈ 68% — диапазон возможных значений
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ForecastLegend.tsx
git commit -m "feat: explain ±1σ band in ForecastLegend"
```

### Task 3.2: Small `±1σ` text label on chart

**Files:**
- Modify: `src/components/TelemetryChart.tsx`

- [ ] **Step 1: Добавить text внутри SVG**

В `src/components/TelemetryChart.tsx` найти блок текста (`<text x={nowX + 8} y={PAD.t + 22} fontSize="13" fontWeight="800" ...>ПРОГНОЗ</text>` ~строка 175). Сразу после `<text x={nowX + 8} y={PAD.t + 40} fontSize="11" fontWeight="600" fill="#6366f1">экстраполяция модели</text>` добавить:

```tsx
<text x={nowX + 8} y={PAD.t + 56} fontSize="10" fontWeight="500" fill="#94a3b8">±1σ ≈ 68% коридор</text>
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TelemetryChart.tsx
git commit -m "feat: ±1σ label inside chart"
```

### Task 3.3: Visual smoke

- [ ] Под графиком в `ForecastLegend` появилась четвёртая строка про `Полоса ±1σ ≈ 68%`.
- [ ] На самом графике в зоне прогноза, в правой его части, мелким серым шрифтом — `±1σ ≈ 68% коридор`.

PR-3 готов.

---

## PR 4 — Difficulty Levels

**Цель PR:** Переключатель `Базовый / Продвинутый`. В Basic — скрываются: расширенный список факторов в `EvidenceBar`, числовые константы из формул, debug-блок. В Advanced — всё открыто. Состояние хранится в новом `DifficultyContext`.

### Task 4.1: Create `DifficultyContext`

**Files:**
- Create: `src/contexts/DifficultyContext.tsx`

- [ ] **Step 1: Создать файл**

```tsx
// src/contexts/DifficultyContext.tsx
import { createContext, useContext, type ReactNode } from "react";

export type Difficulty = "basic" | "advanced";

const DifficultyContext = createContext<Difficulty>("basic");

export function DifficultyProvider({ value, children }: { value: Difficulty; children: ReactNode }) {
  return <DifficultyContext.Provider value={value}>{children}</DifficultyContext.Provider>;
}

export function useDifficulty(): Difficulty {
  return useContext(DifficultyContext);
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/DifficultyContext.tsx
git commit -m "feat: add DifficultyContext"
```

### Task 4.2: Create `DifficultyToggle`

**Files:**
- Create: `src/components/DifficultyToggle.tsx`

- [ ] **Step 1: Создать файл**

```tsx
// src/components/DifficultyToggle.tsx
import type { Difficulty } from "../contexts/DifficultyContext";

interface DifficultyToggleProps {
  value: Difficulty;
  onChange: (next: Difficulty) => void;
}

export function DifficultyToggle({ value, onChange }: DifficultyToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-white/20 bg-white/10 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("basic")}
        className={`rounded-full px-3 py-1 transition ${value === "basic" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}
      >
        Базовый
      </button>
      <button
        type="button"
        onClick={() => onChange("advanced")}
        className={`rounded-full px-3 py-1 transition ${value === "advanced" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"}`}
      >
        Продвинутый
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DifficultyToggle.tsx
git commit -m "feat: DifficultyToggle component"
```

### Task 4.3: Hide details in Basic mode

В Basic режиме:
- `EvidenceBar` — скрывает список факторов (показывает только bar + главную причину).
- Блок «Расчёт параметров» в App.tsx — скрывается полностью.

**Files:**
- Modify: `src/components/EvidenceBar.tsx`

- [ ] **Step 1: EvidenceBar consumes context**

```tsx
// src/components/EvidenceBar.tsx
import { evidenceWeights, type EvidenceResult } from "../models/digitalTwin";
import { useDifficulty } from "../contexts/DifficultyContext";

interface EvidenceBarProps {
  ev: EvidenceResult;
}

const TONE_FILL: Record<string, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  alarm: "bg-red-500",
};

export function EvidenceBar({ ev }: EvidenceBarProps) {
  const difficulty = useDifficulty();
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
      {difficulty === "advanced" && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
          {weights.map((w) => (
            <li key={w.key} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${TONE_FILL[w.tone] ?? "bg-slate-400"}`} />
              {w.label} <span className="text-slate-400">— {w.percent}%</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-700">
        <b>Главная причина:</b> {top.label} ({top.percent}%).
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/EvidenceBar.tsx
git commit -m "feat: hide factor list in Basic mode"
```

### Task 4.4: Wire toggle and provider in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Импорты**

```tsx
import { DifficultyProvider, type Difficulty } from "./contexts/DifficultyContext";
import { DifficultyToggle } from "./components/DifficultyToggle";
```

- [ ] **Step 2: State**

После `const [showOnboarding, setShowOnboarding] = useState(true);` добавить:

```tsx
const [difficulty, setDifficulty] = useState<Difficulty>("basic");
```

- [ ] **Step 3: Wrap в provider**

Поверх существующего `<PresenterProvider>` обернуть в `<DifficultyProvider value={difficulty}>...</DifficultyProvider>`. Окончательная вложенность: `DifficultyProvider > PresenterProvider > <div ...>`.

- [ ] **Step 4: Кнопка в шапке**

В `<header>` рядом с кнопкой fullscreen:

```tsx
<DifficultyToggle value={difficulty} onChange={setDifficulty} />
```

- [ ] **Step 5: Conditional FORMULAS block**

Блок «Расчёт параметров» (содержит `{FORMULAS.map(...)}`) — обернуть условием:

```tsx
{difficulty === "advanced" && (
  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    {/* ...существующее содержимое... */}
  </div>
)}
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire difficulty level toggle"
```

### Task 4.5: Visual smoke

- [ ] **Step 1:** В шапке справа — переключатель Базовый/Продвинутый.
- [ ] **Step 2:** Базовый режим (default): блок «Расчёт параметров» с формулами KaTeX скрыт. EvidenceBar — список факторов скрыт, остался bar + «Главная причина». `?`-иконки на карточках работают.
- [ ] **Step 3:** Переключаем в Продвинутый: появляется блок формул, в EvidenceBar появляется детальный список факторов.

PR-4 готов.

---

## PR 5 — Quiz Mode

**Цель PR:** Кнопка «🎓 Вопрос аудитории». При нажатии симуляция замораживается (через `setRunning(false)`), поверх — модал с вопросом и 2-4 вариантами. Преподаватель кликает выбранный вариант, симуляция возобновляется и применяет соответствующее `LessonAction`-подобное действие.

### Task 5.1: Add quiz types and data

**Files:**
- Modify: `src/types/lessons.ts` (добавить типы)
- Create: `src/lessons/quizzes.ts`

- [ ] **Step 1: Расширить `src/types/lessons.ts`**

В конец файла добавить:

```ts
export interface QuizOption {
  label: string;
  action?: LessonAction;       // что применить если этот вариант выбран
  outcome?: string;            // короткое пояснение для итогового сообщения
}

export interface Quiz {
  id: string;
  prompt: string;              // вопрос
  options: QuizOption[];       // 2-4 варианта
}
```

- [ ] **Step 2: Создать `src/lessons/quizzes.ts`**

```ts
// src/lessons/quizzes.ts
import type { Quiz } from "../types/lessons";

export const QUIZZES: Quiz[] = [
  {
    id: "thermal-action",
    prompt: "Сценарий «Перегрев», риск растёт. Что сделать в первую очередь?",
    options: [
      { label: "Снизить мощность нагревателя", action: { kind: "setControls", controls: { heater: 0.6, cooling: 0 } }, outcome: "Помогает частично — внешний теплопоток остаётся." },
      { label: "Включить охлаждение на максимум", action: { kind: "setControls", controls: { heater: 1, cooling: 1 } }, outcome: "Это правильный ход: охлаждение увеличивает β и компенсирует внешний поток." },
      { label: "Подождать", action: { kind: "noop" }, outcome: "Плохая идея — температура продолжит расти." },
    ],
  },
  {
    id: "drift-action",
    prompt: "Дрейф измерительного канала, риск 60. Что делает оператор?",
    options: [
      { label: "Калибровать датчик", action: { kind: "noop" }, outcome: "В реальной установке — да. В двойнике мы можем только наблюдать дрейф." },
      { label: "Поднять охлаждение", action: { kind: "setControls", controls: { heater: 1, cooling: 0.7 } }, outcome: "Не помогает: дрейф не связан с температурой." },
      { label: "Сменить сценарий на «Норма»", action: { kind: "setMode", mode: "normal" }, outcome: "Учебно: показываем, что устранение причины убирает дрейф." },
    ],
  },
];
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/lessons.ts src/lessons/quizzes.ts
git commit -m "feat: add quiz types and starter quizzes"
```

### Task 5.2: Add `useQuiz` hook

**Files:**
- Create: `src/hooks/useQuiz.ts`

- [ ] **Step 1: Создать**

```ts
// src/hooks/useQuiz.ts
import { useCallback, useState } from "react";
import type { LessonHostApi } from "./useLessonRunner";
import type { Quiz, QuizOption } from "../types/lessons";

export interface UseQuizResult {
  active: Quiz | null;
  outcome: string | null;
  start: (quiz: Quiz) => void;
  choose: (option: QuizOption) => void;
  dismiss: () => void;
}

export interface UseQuizOptions {
  host: LessonHostApi;
  pause: () => void;
  resume: () => void;
}

export function useQuiz({ host, pause, resume }: UseQuizOptions): UseQuizResult {
  const [active, setActive] = useState<Quiz | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const start = useCallback((quiz: Quiz) => {
    pause();
    setOutcome(null);
    setActive(quiz);
  }, [pause]);

  const choose = useCallback((option: QuizOption) => {
    const a = option.action;
    if (a) {
      if (a.kind === "setMode") host.setMode(a.mode);
      else if (a.kind === "setControls") host.setControls(a.controls);
      else if (a.kind === "setPreview") host.setPreview(a.on);
    }
    setOutcome(option.outcome ?? null);
    resume();
  }, [host, resume]);

  const dismiss = useCallback(() => {
    setActive(null);
    setOutcome(null);
  }, []);

  return { active, outcome, start, choose, dismiss };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useQuiz.ts
git commit -m "feat: useQuiz hook"
```

### Task 5.3: Create `QuizOverlay` component

**Files:**
- Create: `src/components/QuizOverlay.tsx`

- [ ] **Step 1: Создать**

```tsx
// src/components/QuizOverlay.tsx
import type { Quiz, QuizOption } from "../types/lessons";

interface QuizOverlayProps {
  quiz: Quiz | null;
  outcome: string | null;
  onChoose: (option: QuizOption) => void;
  onDismiss: () => void;
}

export function QuizOverlay({ quiz, outcome, onChoose, onDismiss }: QuizOverlayProps) {
  if (!quiz) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">🎓 Вопрос аудитории</p>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">{quiz.prompt}</h2>
        {outcome ? (
          <>
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {outcome}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <ul className="mt-4 space-y-2">
            {quiz.options.map((opt, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onChoose(opt)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <span className="font-semibold text-slate-700">{String.fromCharCode(65 + i)}.</span> {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuizOverlay.tsx
git commit -m "feat: QuizOverlay component"
```

### Task 5.4: Wire quiz in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Импорты**

```tsx
import { useQuiz } from "./hooks/useQuiz";
import { QuizOverlay } from "./components/QuizOverlay";
import { QUIZZES } from "./lessons/quizzes";
```

- [ ] **Step 2: Подключить хук**

После `const lesson = useLessonRunner({ ... });` добавить:

```tsx
const quiz = useQuiz({
  host: {
    setMode: sim.setMode,
    setControls: (next) => sim.setControls(next),
    setPreview: setPreviewMode,
    getRisk: () => sim.ev.score,
    getTemperature: () => sim.latest.t,
  },
  pause: () => sim.setRunning(false),
  resume: () => sim.setRunning(true),
});
```

- [ ] **Step 3: Кнопка «🎓 Вопрос аудитории»**

В правую колонку (рядом с `<ControlsPanel>`-блоком, или внутри секции с timeline'ами и snapshot'ами) добавить новый блок. Самое простое — добавить кнопку в секцию с SnapshotControls и ReplayControls (расширить grid до 3 колонок):

Найти `<section className="grid gap-3 sm:grid-cols-2">` (строка ~176). Заменить на `<section className="grid gap-3 sm:grid-cols-3">` и в конец секции добавить:

```tsx
<div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
  <p className="mb-2 text-xs font-semibold text-amber-900">🎓 Quiz-режим</p>
  <div className="flex flex-wrap gap-2">
    {QUIZZES.map((q) => (
      <button
        key={q.id}
        type="button"
        onClick={() => quiz.start(q)}
        className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
      >
        {q.id}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Mount overlay**

Рядом с `<ExplanationDrawer .../>` добавить:

```tsx
<QuizOverlay
  quiz={quiz.active}
  outcome={quiz.outcome}
  onChoose={quiz.choose}
  onDismiss={quiz.dismiss}
/>
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire quiz mode"
```

### Task 5.5: Visual smoke

- [ ] **Step 1:** В секции с SnapshotControls/ReplayControls появилась амбер-карточка «🎓 Quiz-режим» с двумя кнопками `thermal-action` и `drift-action`.
- [ ] **Step 2:** Кликни «thermal-action». Симуляция замораживается (Pause). Над всем — модал с вопросом и 3 вариантами A/B/C.
- [ ] **Step 3:** Выбери вариант — модал показывает outcome (короткое пояснение). Симуляция возобновляется. Если вариант имел `setControls/setMode`, состояние применилось.
- [ ] **Step 4:** Закрой модал — возвращаемся к свободному режиму.

PR-5 готов.

---

## Финальная верификация Этапа 3

Run: `npx tsc --noEmit` → 0 errors.
Run: `npm run build` → success.
Run: dev-сервер; в DevTools console — 0 assertion failures.

Полный лекционный прогон:

- [ ] Запустить урок «Когда поздно реагировать», пройти до конца.
- [ ] Открыть `?` на каждой из 6 карточек метрик — drawer показывает формулу + смысл + константы.
- [ ] Под графиком в легенде есть строка про ±1σ band; на самом графике в зоне прогноза — мелкий текст «±1σ ≈ 68%».
- [ ] Переключить в Базовый режим — список факторов в EvidenceBar и блок «Расчёт параметров» скрыты. Переключить обратно — появились.
- [ ] Запустить quiz «thermal-action», выбрать вариант B — увидеть outcome и применённое управление.

Если все чекбоксы зелёные — Этап 3 завершён. Дорожная карта закрыта.
