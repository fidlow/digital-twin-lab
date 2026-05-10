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
