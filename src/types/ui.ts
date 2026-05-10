import type { Controls, DataPoint, ModeKey } from "../models/digitalTwin";

export interface EventItem {
  key: string;
  ts: number;
  tm: string;
  title: string;
  text: string;
}

export type ScenarioLogKind = "scenario" | "snapshot" | "reset";

export interface ScenarioLogEntry {
  ts: number;       // Date.now()
  tick: number;     // k последней точки на момент действия
  tm: string;       // строка времени
  kind: ScenarioLogKind;
  label: string;    // напр. "Перегрев", "Снимок состояния", "Сброс", "Heater 145%"
}

export interface SnapshotEntry {
  ts: number;
  label: string;
  data: DataPoint[];
  controls: Controls;
  mode: ModeKey;
  events: EventItem[];
}

export interface DecisionAction {
  ts: number;
  controls?: Controls;
  mode?: ModeKey;
}
