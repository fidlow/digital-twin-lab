import { useState, type ReactNode } from "react";
import { Tex } from "./Tex";

interface TheoryBlockProps {
  title: string;
  summary: string;
  formula: string;
  children: ReactNode;
}

function TheoryBlock({ title, summary, formula, children }: TheoryBlockProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{summary}</p>
      <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <Tex display>{formula}</Tex>
      </div>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-indigo-700 hover:text-indigo-900">
          <span className="inline-block transition group-open:rotate-90">▸</span> Подробнее
        </summary>
        <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">{children}</div>
      </details>
    </div>
  );
}

export function TheorySection() {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <button
          onClick={() => setOpen((x) => !x)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <div>
            <h2 className="text-lg font-semibold">Физические основы модели</h2>
            <p className="text-sm text-slate-500">
              Законы, описывающие поведение установки: теплопередача, вакуумная система, электрические процессы, прогнозирование.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 transition ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {open && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <TheoryBlock
              title="Тепловой баланс и вакуумная система"
              summary="Температура определяется балансом джоулева тепловыделения и теплоотдачи в окружающую среду. В вакуумной камере при разгерметизации наблюдается линейный рост давления."
              formula={String.raw`T_{k+1} = T_k + \big(\alpha I^2 - (\beta + \gamma u_c)(T_k - T_a)\big)\,\Delta t + \varepsilon`}
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Тепловыделение в нагревателе описывается законом Джоуля—Ленца:{" "}
                  <Tex>{String.raw`\dot Q = I^2 R`}</Tex>. В принятых обозначениях
                  коэффициент <Tex>{String.raw`\alpha`}</Tex> соответствует
                  электрическому сопротивлению нагревателя; в модели{" "}
                  <Tex>{String.raw`\alpha = 0{,}46`}</Tex> (<code>HEAT_IN_K</code>).
                </li>
                <li>
                  Теплоотдача описывается законом Ньютона—Рихмана:{" "}
                  <Tex>{String.raw`\dot Q_{\text{потерь}} = h A (T - T_a)`}</Tex>, где{" "}
                  <Tex>{String.raw`h`}</Tex> — коэффициент теплоотдачи,{" "}
                  <Tex>{String.raw`A`}</Tex> — площадь теплоотдающей поверхности.
                  В модели <Tex>{String.raw`\beta = h A = 0{,}12`}</Tex>{" "}
                  (<code>HEAT_LOSS_NAT</code>).
                </li>
                <li>
                  Принудительная конвекция увеличивает теплоотдачу на величину{" "}
                  <Tex>{String.raw`\gamma u_c`}</Tex>, где{" "}
                  <Tex>{String.raw`u_c \in [0,\,1]`}</Tex> — относительная
                  производительность системы охлаждения,{" "}
                  <Tex>{String.raw`\gamma = 0{,}3`}</Tex>.
                </li>
                <li>
                  В режиме «Перегрев» введён дополнительный теплоприток мощностью{" "}
                  <Tex>{String.raw`5\,\text{Вт}`}</Tex>, моделирующий нарушение
                  тепловой изоляции. Снижение тока нагревателя в этом режиме лишь
                  частично компенсирует возмущение; устранение аварийного состояния
                  достигается включением охлаждения.
                </li>
                <li>
                  Условие термодинамического равновесия при <code>cooling = 0</code>:{" "}
                  <Tex>{String.raw`T_{\text{р}} = T_a + \alpha I^2 / \beta \approx 25 + \tfrac{0{,}46 \cdot 8{,}4}{0{,}12} \approx 57\,°\mathrm{C}`}</Tex>.
                  Полученное установившееся значение согласуется со штатным
                  тепловым режимом установки.
                </li>
                <li>
                  Принятые параметры:{" "}
                  <Tex>{String.raw`T_a = 25\,°\mathrm{C}`}</Tex>,{" "}
                  шаг по времени{" "}
                  <Tex>{String.raw`\Delta t = 300\,\text{мс}`}</Tex>,{" "}
                  <Tex>{String.raw`\varepsilon`}</Tex> — гауссовский шум
                  измерительного канала.
                </li>
              </ul>
              <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-800">Вакуумная система:</p>
                <Tex display>
                  {String.raw`p_{k+1} = p_k + \dot p_{\text{утечки}}\,\Delta t + \varepsilon`}
                </Tex>
                <p className="text-xs text-slate-600">
                  Уравнение материального баланса газа имеет вид{" "}
                  <Tex>
                    {String.raw`\dfrac{dp}{dt} = \dfrac{Q_{\text{утечки}} - S\,p}{V}`}
                  </Tex>.
                  При отключённой системе откачки (<Tex>{String.raw`S \approx 0`}</Tex>)
                  рост давления близок к линейному:{" "}
                  <Tex>{String.raw`\dot p \approx 0{,}0045\,\text{Па/тик}`}</Tex>.
                  На графике давление приведено в относительных единицах
                  (масштабный коэффициент 1000); абсолютные значения отображаются
                  во всплывающей подсказке.
                </p>
              </div>
            </TheoryBlock>

            <TheoryBlock
              title="Электрические процессы, вибрация, дрейф измерительного канала"
              summary="Сила тока через нагреватель определяется законом Ома и регулируется относительным управляющим воздействием. Мощность вычисляется как P = U·I. Вибрационный сигнал содержит гармоническую составляющую на фоне шума, дрейф измерительного канала описывается случайным блужданием."
              formula={String.raw`I_k = I_{\text{баз}}\,u_h + \Delta I_{\text{реж}} + \varepsilon, \qquad P_k = U \cdot I_k`}
            >
              <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <Tex display>
                  {String.raw`V_k = V_0 + A\sin(k/\tau) + \varepsilon, \qquad S_{k+1} = S_k + \Delta S_{\text{дрейф}} + \varepsilon`}
                </Tex>
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Базовое значение тока{" "}
                  <Tex>{String.raw`I_{\text{баз}} = 2{,}9\,\text{А}`}</Tex>;
                  управляющее воздействие{" "}
                  <Tex>{String.raw`u_h \in [0{,}6;\,1{,}6]`}</Tex> — безразмерный
                  коэффициент.
                </li>
                <li>
                  Напряжение питания нагревателя{" "}
                  <Tex>{String.raw`U = 24\,\text{В}`}</Tex>{" "}
                  (<code>HEATER_U</code>); мощность{" "}
                  <Tex>{String.raw`P = U I`}</Tex> вычисляется на каждом шаге
                  дискретизации.
                </li>
                <li>
                  В режиме «Питание» сила тока представлена{" "}
                  <Tex>{String.raw`|\sin|`}</Tex>-импульсами амплитудой 1,4 А поверх
                  постоянной составляющей 3,3 А; вибрация при этом имеет синхронные
                  с током всплески амплитудой 2,1 мм/с — характерная картина
                  электромеханической нестабильности.
                </li>
                <li>
                  Параметры вибрационной составляющей: период{" "}
                  <Tex>{String.raw`\tau \approx 16`}</Tex> шагов, что при{" "}
                  <Tex>{String.raw`\Delta t = 300\,\text{мс}`}</Tex> соответствует
                  частоте <Tex>{String.raw`f \approx 1{,}25\,\text{Гц}`}</Tex>.
                </li>
                <li>
                  Дрейф измерительного канала{" "}
                  <Tex>
                    {String.raw`\Delta S \approx 0{,}57\,\text{мВ/тик}`}
                  </Tex>{" "}
                  в режиме «Дрейф» представляет собой <b>случайное блуждание</b>:
                  дисперсия отклонения возрастает линейно с числом шагов, а
                  среднеквадратичное отклонение — пропорционально{" "}
                  <Tex>{String.raw`\sqrt{k}`}</Tex>:{" "}
                  <Tex>{String.raw`\sigma_S(k) = \sigma_0 \sqrt{k}`}</Tex>. Та же
                  зависимость определяет ширину доверительного интервала прогноза.
                </li>
                <li>
                  Пороги для дрейфа задаются по абсолютному значению: отклонение в
                  любую сторону рассматривается как одинаково неблагоприятное
                  (см. <code>paramTone</code> для ключа <code>s</code>).
                </li>
              </ul>
            </TheoryBlock>

            <TheoryBlock
              title="Сценарии отказов и интегральный показатель риска"
              summary="Каждый из пяти сценариев представляет собой возмущение базовой модели. Интегральный показатель риска осуществляет непрерывную агрегацию превышений установленных порогов."
              formula={String.raw`R = \mathrm{clamp}\!\left(\sum_i r_i,\,0,\,100\right), \quad r_i = \mathrm{clamp}\!\left(\frac{v_i - v_i^{\text{пред}}}{v_i^{\text{ав}} - v_i^{\text{пред}}}\cdot 35 + b_i,\,0,\,60\right)`}
            >
              <p>
                Дополнительные слагаемые:{" "}
                <Tex>{String.raw`b_i = 25`}</Tex> при достижении аварийного порога,{" "}
                <Tex>{String.raw`b_i = 8`}</Tex> при предупреждении,{" "}
                <Tex>{String.raw`b_i = 0`}</Tex> в норме.
              </p>
              <p className="font-semibold text-slate-800">Перечень сценариев:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <b>Норма</b> — установка работает в штатном режиме; физические
                  процессы стационарны.
                </li>
                <li>
                  <b>Перегрев</b> — внешний теплоприток мощностью 5 Вт, медленный
                  дрейф тока нагрузки.
                </li>
                <li>
                  <b>Утечка вакуума</b> — рост давления со скоростью{" "}
                  <Tex>{String.raw`\sim 0{,}0045\,\text{Па/тик}`}</Tex>.
                </li>
                <li>
                  <b>Дрейф сигнала</b> — линейное смещение базовой линии
                  измерительного канала.
                </li>
                <li>
                  <b>Питание</b> — синхронные{" "}
                  <Tex>{String.raw`|\sin|`}</Tex>-всплески тока и вибрации.
                </li>
              </ul>
              <p className="font-semibold text-slate-800">
                Пороги срабатывания (предупреждение / авария):
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>T: 74 / 82 °C; p: 0,035 / 0,06 Па; I: 3,8 / 4,4 А.</li>
                <li>P: 90 / 106 Вт; V: 1,8 / 2,8 мм/с; S: 24 / 38 мВ.</li>
              </ul>
              <p>
                Правило агрегации непрерывное, а не пороговое: одновременное
                нахождение нескольких параметров в зоне предупреждения формирует
                существенный показатель риска ещё до достижения аварийного уровня —
                эта величина отображается в карточке «Риск / 100».
              </p>
            </TheoryBlock>

            <TheoryBlock
              title="Прогнозирование состояния системы"
              summary="Прогнозирование выполняется методом разомкнутой симуляции на 70 шагов вперёд (≈ 21 с) при отсутствии шумовой составляющей. Доверительный интервал расширяется пропорционально √j в соответствии со свойствами случайного блуждания."
              formula={String.raw`\hat x_{k+j} = f(\hat x_{k+j-1},\,u,\,m), \qquad \sigma(j) = \sigma_0\sqrt{j}`}
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  В прогнозе используется та же модель шага, что и при моделировании
                  установки, однако расчёт проводится по детерминированной
                  составляющей — без аддитивного шума и без вспомогательных
                  гармонических колебаний, имеющих визуальное назначение.
                </li>
                <li>
                  Режим <Tex>{String.raw`m`}</Tex> и вектор управления{" "}
                  <Tex>{String.raw`u = (u_h,\,u_c)`}</Tex> принимаются постоянными
                  и равными текущим значениям. Полученная траектория отвечает на
                  вопрос: «как будет развиваться система при сохранении текущего
                  управления?». При изменении положения регуляторов прогнозная
                  кривая перестраивается в реальном времени.
                </li>
                <li>
                  Расширение доверительного интервала пропорционально{" "}
                  <Tex>{String.raw`\sqrt{j}`}</Tex> отвечает приближению
                  случайного блуждания: дисперсия суммы{" "}
                  <Tex>{String.raw`j`}</Tex> независимых одинаково распределённых
                  случайных величин возрастает линейно, а среднеквадратическое
                  отклонение — пропорционально{" "}
                  <Tex>{String.raw`\sqrt{j}`}</Tex>.
                </li>
                <li>
                  Базовые значения среднеквадратических отклонений{" "}
                  <Tex>{String.raw`\sigma_0`}</Tex>: 0,5 °C для температуры,
                  0,0006 Па для давления.
                </li>
                <li>
                  Горизонт прогнозирования: 70 шагов × 300 мс ≈{" "}
                  <b>21 с</b>. Соответствующая область выделена на графике справа
                  от вертикальной отметки «сейчас».
                </li>
                <li>
                  Полоса между прогнозной кривой и её границами образует
                  доверительный интервал{" "}
                  <Tex>{String.raw`\hat x_{k+j} \pm \sigma(j)`}</Tex>.
                </li>
              </ul>
            </TheoryBlock>
          </div>
        )}
      </div>
    </section>
  );
}
