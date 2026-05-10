interface HotkeysOverlayProps {
  open: boolean;
  onClose: () => void;
}

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ["1", "Сценарий «Норма»"],
  ["2", "Сценарий «Перегрев»"],
  ["3", "Сценарий «Утечка вакуума»"],
  ["4", "Сценарий «Дрейф сигнала»"],
  ["5", "Сценарий «Нестабильность питания»"],
  ["Space", "Пауза / Запуск"],
  ["R", "Сброс симуляции"],
  ["F", "Полноэкранный режим"],
  ["?", "Показать / скрыть подсказки"],
];

export function HotkeysOverlay({ open, onClose }: HotkeysOverlayProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl text-slate-900"
      >
        <h2 className="text-2xl font-semibold">Горячие клавиши</h2>
        <p className="mt-1 text-sm text-slate-500">Нажмите <kbd className="rounded bg-slate-200 px-2 py-0.5 font-mono">?</kbd> ещё раз, чтобы закрыть.</p>
        <ul className="mt-4 space-y-2">
          {ROWS.map(([k, desc]) => (
            <li key={k} className="flex items-center justify-between gap-4 text-base">
              <kbd className="rounded bg-slate-100 px-3 py-1 font-mono text-sm">{k}</kbd>
              <span className="text-right text-slate-700">{desc}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
