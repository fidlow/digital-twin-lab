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
