// src/lessons/quizzes.ts
import type { Quiz } from "../types/lessons";

export const QUIZZES: Quiz[] = [
  {
    id: "thermal-action",
    prompt: "Сценарий «Перегрев», риск растёт. Что сделать в первую очередь?",
    options: [
      { label: "Снизить мощность", action: { kind: "setControls", controls: { heater: 0.6, cooling: 0 } }, outcome: "Правильно — уменьшаем источник тепла, риск падает." },
      { label: "Повысить мощность", action: { kind: "setControls", controls: { heater: 1.4, cooling: 0 } }, outcome: "Антипаттерн: больше тока — больше нагрев, риск растёт быстрее." },
      { label: "Повысить нагрузку", action: { kind: "noop" }, outcome: "Не помогает: дополнительная нагрузка только усиливает перегрев." },
    ],
  },
  {
    id: "drift-action",
    prompt: "Дрейф измерительного канала, риск 60. Что делает оператор?",
    options: [
      { label: "Калибровать датчик", action: { kind: "noop" }, outcome: "В реальной установке — да. В двойнике мы можем только наблюдать дрейф." },
      { label: "Поднять охлаждение", action: { kind: "setControls", controls: { heater: 1, cooling: 0.7 } }, outcome: "Не помогает: дрейф не связан с температурой." },
      { label: "Внести программную поправку", action: { kind: "noop" }, outcome: "Маскирует симптом, но не устраняет причину — датчик всё равно нужно калибровать или менять." },
    ],
  },
];
