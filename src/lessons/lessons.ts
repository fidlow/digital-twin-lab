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
