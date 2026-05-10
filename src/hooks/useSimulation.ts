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
  SCENARIOS,
  type Controls,
  type DataPoint,
  type ForecastPoint,
  type ModeKey,
} from "../models/digitalTwin";
import type { DecisionAction, EventItem, ScenarioLogEntry, SnapshotEntry } from "../types/ui";

export interface UseSimulationResult {
  mode: ModeKey;
  setMode: (mode: ModeKey) => void;
  running: boolean;
  setRunning: React.Dispatch<React.SetStateAction<boolean>>;
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
  log: ScenarioLogEntry[];
  snapshot: (label?: string) => void;
  forecastWith: (controls: Controls, steps?: number) => ForecastPoint[];
  snapshots: SnapshotEntry[];
  snapshotIndex: number;
  undo: () => void;
  redo: () => void;
  restoreSnapshot: (idx: number) => void;
  actions: DecisionAction[];
  replayActive: boolean;
  startReplay: () => void;
  stopReplay: () => void;
}

export interface UseSimulationOptions {
  kiosk: boolean;
  onIdleReset?: () => void; // App.tsx uses this to re-show onboarding after idle reset
}

export function useSimulation({ kiosk, onIdleReset }: UseSimulationOptions): UseSimulationResult {
  const [mode, setMode] = useState<ModeKey>("normal");
  const [running, setRunning] = useState(true);
  const [data, setData] = useState<DataPoint[]>(seed);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [last, setLast] = useState(Date.now());
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [log, setLog] = useState<ScenarioLogEntry[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [snapshotIndex, setSnapshotIndex] = useState<number>(-1);
  const [actions, setActions] = useState<DecisionAction[]>([]);
  const [replayActive, setReplayActive] = useState(false);
  const idleRef = useRef(Date.now());

  const latest = data[data.length - 1]!;
  const chart = useMemo(() => build(data), [data]);
  const fc = useMemo(() => forecast(data, mode, controls), [data, mode, controls]);
  const riskResult = useMemo(() => risk(latest), [latest]);
  const ev = useMemo(() => evidence(latest), [latest]);
  const rec = useMemo(() => advice(mode, riskResult), [mode, riskResult]);

  const forecastWith = useCallback(
    (altControls: Controls, steps?: number) => forecast(data, mode, altControls, steps),
    [data, mode]
  );

  // Симуляционный интервал зависит только от mode/running — слайдеры читаются через ref.
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Stable ref so appendLog closures always read the latest DataPoint without re-creating.
  const latestRef = useRef<DataPoint>(latest);
  latestRef.current = latest;

  // Refs for full-state snapshot capture (avoid recreating callbacks on every render).
  const dataRef = useRef<DataPoint[]>(data);
  dataRef.current = data;
  const modeRef = useRef<ModeKey>(mode);
  modeRef.current = mode;
  const eventsRef = useRef<EventItem[]>(events);
  eventsRef.current = events;
  const snapshotsRef = useRef<SnapshotEntry[]>(snapshots);
  snapshotsRef.current = snapshots;
  const snapshotIndexRef = useRef<number>(snapshotIndex);
  snapshotIndexRef.current = snapshotIndex;
  const actionsRef = useRef<DecisionAction[]>(actions);
  actionsRef.current = actions;
  const replayActiveRef = useRef<boolean>(replayActive);
  replayActiveRef.current = replayActive;

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

  const appendLog = useCallback((kind: ScenarioLogEntry["kind"], label: string) => {
    setLog((cur) => [
      ...cur,
      { ts: Date.now(), tick: latestRef.current?.k ?? 0, tm: latestRef.current?.tm ?? "", kind, label },
    ].slice(-50));
  }, []);

  const setModeLogged = useCallback<(mode: ModeKey) => void>((next) => {
    setMode(next);
    appendLog("scenario", SCENARIOS[next][0]);
    if (!replayActiveRef.current) {
      setActions((cur) => [...cur, { ts: Date.now(), mode: next }].slice(-200));
    }
  }, [appendLog]);

  const setControlsTracked = useCallback<React.Dispatch<React.SetStateAction<Controls>>>((next) => {
    setControls(next);
    if (!replayActiveRef.current) {
      const resolved = typeof next === "function" ? (next as (prev: Controls) => Controls)(controlsRef.current) : next;
      setActions((cur) => [...cur, { ts: Date.now(), controls: resolved }].slice(-200));
    }
  }, []);

  const reset = useCallback(() => {
    setMode("normal");
    setData(seed());
    setEvents([]);
    setLast(Date.now());
    setRunning(true);
    setControls(DEFAULT_CONTROLS);
    setSnapshots([]);
    setSnapshotIndex(-1);
    setActions([]);
    appendLog("reset", "Сброс симуляции");
  }, [appendLog]);

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

  const replayCursorRef = useRef<number>(0);
  const replayStartTsRef = useRef<number>(0);
  const replayBaseTsRef = useRef<number>(0);

  const stopReplay = useCallback(() => {
    setReplayActive(false);
    replayCursorRef.current = 0;
  }, []);

  const startReplay = useCallback(() => {
    if (actionsRef.current.length === 0) return;
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

  useEffect(() => {
    if (!replayActive) return undefined;
    const id = setInterval(() => {
      const elapsed = Date.now() - replayStartTsRef.current;
      const list = actionsRef.current;
      while (replayCursorRef.current < list.length) {
        const a = list[replayCursorRef.current]!;
        const offset = a.ts - replayBaseTsRef.current;
        if (offset > elapsed) break;
        if (a.mode !== undefined) setMode(a.mode);
        if (a.controls !== undefined) setControls(a.controls);
        replayCursorRef.current += 1;
      }
      if (replayCursorRef.current >= list.length) {
        setReplayActive(false);
        replayCursorRef.current = 0;
        appendLog("snapshot", "⏹ Воспроизведение завершено");
      }
    }, 100);
    return () => clearInterval(id);
  }, [replayActive, appendLog]);

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
    setMode: setModeLogged,
    running,
    setRunning,
    latest,
    controls,
    setControls: setControlsTracked,
    events,
    last,
    chart,
    fc,
    riskResult,
    ev,
    rec,
    reset,
    bumpIdle,
    log,
    snapshot,
    forecastWith,
    snapshots,
    snapshotIndex,
    undo,
    redo,
    restoreSnapshot,
    actions,
    replayActive,
    startReplay,
    stopReplay,
  };
}
