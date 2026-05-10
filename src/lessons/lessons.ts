// src/lessons/lessons.ts
import type { Lesson } from "../types/lessons";

export const LESSONS: Lesson[] = [
  {
    id: "late-reaction",
    title: "Поздно vs рано: ценность прогноза",
    summary: "Тепловой отказ дважды: сначала реагируем поздно — перегрев. Затем — рано, и перегрева удаётся избежать.",
    steps: [
      { text: "Установка в норме. Обратите внимание: риск-скор около нуля, прогноз температуры идёт ровно.", advanceOn: { kind: "manual" } },
      { text: "Включаем сценарий «Перегрев». Тепловой поток превышает естественные потери. Серая baseline-линия (без вмешательства) уходит вверх — ждём, пока риск превысит 30.", action: { kind: "setMode", mode: "thermal" }, advanceOn: { kind: "riskAtLeast", threshold: 30 } },
      { text: "Реагируем поздно: включаем охлаждение на максимум.", action: { kind: "setControls", controls: { heater: 1, cooling: 1 } }, advanceOn: { kind: "delay", ms: 6000 } },
      { text: "Температура продолжает расти по инерции — это цена позднего вмешательства. Сейчас откатим установку и попробуем среагировать рано.", advanceOn: { kind: "manual" } },
      { text: "Возвращаем режим в норму. Охлаждение всё ещё на максимуме — установка быстро остынет. Дождитесь, пока температура опустится в зелёную зону, и нажмите далее.", action: { kind: "setMode", mode: "normal" }, advanceOn: { kind: "manual" } },
      { text: "Сбрасываем охлаждение к дефолту, чтобы повторить «Перегрев» с чистого листа.", action: { kind: "setControls", controls: { heater: 1, cooling: 0 } }, advanceOn: { kind: "manual" } },
      { text: "Снова включаем «Перегрев». В этот раз реагируем при первых признаках риска — ждём, пока риск превысит 15.", action: { kind: "setMode", mode: "thermal" }, advanceOn: { kind: "riskAtLeast", threshold: 15 } },
      { text: "Реагируем рано: включаем охлаждение, не дожидаясь критического риска.", action: { kind: "setControls", controls: { heater: 1, cooling: 1 } }, advanceOn: { kind: "delay", ms: 6000 } },
      { text: "Прогноз стабилизируется, температура остаётся в зелёной зоне — перегрева удалось избежать. Сравните с шагом 4: тот же сценарий, разница только в моменте реакции.", advanceOn: { kind: "manual" } },
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
