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
  type ModeKey,
} from "../models/digitalTwin";
import type { EventItem, ScenarioLogEntry } from "../types/ui";

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

  // Stable ref so appendLog closures always read the latest DataPoint without re-creating.
  const latestRef = useRef<DataPoint>(latest);
  latestRef.current = latest;

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
  }, [appendLog]);

  const reset = useCallback(() => {
    setMode("normal");
    setData(seed());
    setEvents([]);
    setLast(Date.now());
    setRunning(true);
    setControls(DEFAULT_CONTROLS);
    appendLog("reset", "Сброс симуляции");
  }, [appendLog]);

  const snapshot = useCallback((label: string = "Снимок состояния") => {
    appendLog("snapshot", label);
  }, [appendLog]);

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
    log,
    snapshot,
  };
}
