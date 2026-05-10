import { useEffect, useState } from "react";
import { DEFAULT_CONTROLS, FORMULAS } from "./models/digitalTwin";
import { useSimulation } from "./hooks/useSimulation";
import { useHotkeys } from "./hooks/useHotkeys";
import { TheorySection } from "./components/TheorySection";
import { ScenarioTimeline } from "./components/ScenarioTimeline";
import { SnapshotControls } from "./components/SnapshotControls";
import { ReplayControls } from "./components/ReplayControls";
import { Tex } from "./components/Tex";
import { TelemetryChart } from "./components/TelemetryChart";
import { MetricCards } from "./components/MetricCards";
import { ControlsPanel } from "./components/ControlsPanel";
import { HotkeysOverlay } from "./components/HotkeysOverlay";
import { ForecastLegend } from "./components/ForecastLegend";
import { LessonPicker } from "./components/LessonPicker";
import { LessonRunner } from "./components/LessonRunner";
import { ExplanationDrawer } from "./components/ExplanationDrawer";
import { useQuiz } from "./hooks/useQuiz";
import { QuizOverlay } from "./components/QuizOverlay";
import { QUIZZES } from "./lessons/quizzes";
import { useLessonRunner } from "./hooks/useLessonRunner";
import { PresenterProvider } from "./contexts/PresenterContext";

export default function FTIDigitalTwinPrototype() {
  const [kiosk, setKiosk] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const sim = useSimulation({
    kiosk,
    onIdleReset: () => setShowOnboarding(true),
  });
  const {
    mode, setMode, running, setRunning, latest, controls, setControls,
    events, last, chart, fc, riskResult: r, ev, rec, reset, bumpIdle,
    log, snapshot,
    snapshots, snapshotIndex, undo, redo, restoreSnapshot,
    actions, replayActive, startReplay, stopReplay,
  } = sim;

  const [showHotkeys, setShowHotkeys] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewControls, setPreviewControls] = useState(controls);
  const [explanationKey, setExplanationKey] = useState<string | null>(null);

  useEffect(() => {
    if (!previewMode) setPreviewControls(controls);
  }, [previewMode, controls]);

  const whatIfFc = previewMode ? sim.forecastWith(previewControls) : undefined;
  const baselineFc = sim.forecastWith(DEFAULT_CONTROLS);

  const lesson = useLessonRunner({
    setMode: sim.setMode,
    setControls: (next) => sim.setControls(next),
    setPreview: setPreviewMode,
    pause: () => sim.setRunning(false),
    resume: () => sim.setRunning(true),
    getRisk: () => sim.ev.score,
    getTemperature: () => sim.latest.t,
  });

  const quiz = useQuiz({
    host: {
      setMode: sim.setMode,
      setControls: (next) => sim.setControls(next),
      setPreview: setPreviewMode,
      pause: () => sim.setRunning(false),
      resume: () => sim.setRunning(true),
      getRisk: () => sim.ev.score,
      getTemperature: () => sim.latest.t,
    },
    pause: () => sim.setRunning(false),
    resume: () => sim.setRunning(true),
  });

  useHotkeys({
    "1": () => setMode("normal"),
    "2": () => setMode("thermal"),
    "3": () => setMode("vacuum"),
    "4": () => setMode("signal"),
    "5": () => setMode("power"),
    Space: () => setRunning((x) => !x),
    r: () => reset(),
    f: () => toggleKiosk(),
    "?": () => setShowHotkeys((x) => !x),
  });

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

  return (
    <PresenterProvider value={kiosk}>
      <div
          className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6"
          onClick={bumpIdle}
          onMouseMove={bumpIdle}
          onTouchStart={bumpIdle}
          onKeyDown={bumpIdle}
        >
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
          <p className="mt-4 max-w-3xl text-slate-200">
            Вакуумная электротермическая камера для термических испытаний образцов:
            низковольтный нагреватель (24 В) под контролем тока, поддержание вакуума,
            наблюдение за температурой образца, вибрацией и измерительным каналом.
          </p>
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

        <MetricCards mode={mode} latest={latest} riskResult={r} ev={ev} onInfo={setExplanationKey} />

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
              <TelemetryChart rows={chart} fc={fc} whatIfFc={whatIfFc} baselineFc={baselineFc} running={running} last={last} />
            </div>
            <div className="mt-2">
              <ForecastLegend showWhatIf={previewMode} />
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
        </section>

        <section>
          <LessonPicker
            activeLessonId={lesson.activeLesson?.id ?? null}
            onStart={lesson.start}
            onStop={lesson.stop}
          />
        </section>

        <TheorySection />

        <section className="grid gap-3 sm:grid-cols-3">
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
        </section>

        <section>
          <ScenarioTimeline log={log} onSnapshot={() => snapshot("Снимок состояния")} />
        </section>

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

        <HotkeysOverlay open={showHotkeys} onClose={() => setShowHotkeys(false)} />
        <ExplanationDrawer openKey={explanationKey} onClose={() => setExplanationKey(null)} />
        <QuizOverlay
          quiz={quiz.active}
          outcome={quiz.outcome}
          onChoose={quiz.choose}
          onDismiss={quiz.dismiss}
        />
        {lesson.activeLesson && (
          <LessonRunner
            lesson={lesson.activeLesson}
            stepIndex={lesson.stepIndex}
            awaitingNext={lesson.awaitingNext}
            onNext={lesson.next}
            onStop={lesson.stop}
          />
        )}
        </div>
      </div>
    </PresenterProvider>
  );
}
