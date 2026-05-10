// src/docs/explanations.ts
// Тексты карточек справки: формулы из digitalTwin (FORMULAS), плюс физический смысл
// и список констант. Используются ExplanationDrawer'ом.

export interface Explanation {
  title: string;
  formula?: string;
  body: string;
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
  v: {
    title: "Вибрация",
    formula: String.raw`V_k = V_0 + A\sin(k/\tau) + \varepsilon`,
    body: "Фоновое колебание: постоянный уровень V₀ плюс косметический синус — это «дыхание» живой ленты, не реальный физический процесс. В сценарии «Нестабильность питания» добавляются синхронные с током всплески.",
    constants: [
      { name: "V₀", value: "≈ 0.82", unit: "мм/с" },
      { name: "Порог warning / alarm", value: "1.8 / 2.8", unit: "мм/с" },
    ],
  },
  s: {
    title: "Дрейф измерительного канала",
    formula: String.raw`S_{k+1} = S_k + \Delta S_{\text{дрейфа}} + \varepsilon`,
    body: "Накапливающаяся ошибка измерительного канала. ΔS_дрейфа активна в сценарии «Дрейф сигнала» и медленно сдвигает базовую линию. Риск считается по модулю: |S| > порога.",
    constants: [
      { name: "Порог warning / alarm", value: "24 / 38", unit: "мВ", note: "по модулю" },
    ],
  },
  forecast: {
    title: "Прогноз («тень будущего»)",
    formula: String.raw`\hat{x}_{k+j} = f(\hat{x}_{k+j-1},\,u,\,m),\quad \sigma(j) = \sigma_0\sqrt{j}`,
    body: "Физический прогноз: модель прокручивается вперёд без шума с фиксированными mode и controls — что будет, если оператор ничего не изменит. Шум подменяется доверительным коридором ±σ·√j (random-walk приближение). Коридор расширяется как корень из горизонта: на 4× горизонта неопределённость удваивается.",
    constants: [
      { name: "Шагов прогноза", value: "70", note: "≈ 21 секунда при Δt = 300 мс" },
      { name: "σ₀ (T_FORECAST_NOISE)", value: "0.5", unit: "°C" },
      { name: "σ₀ (P_FORECAST_NOISE)", value: "0.0006", unit: "Па" },
    ],
  },
};
