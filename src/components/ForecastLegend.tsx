interface ForecastLegendProps {
  showWhatIf: boolean;
  onInfo?: (key: string) => void;
}

export function ForecastLegend({ showWhatIf, onInfo }: ForecastLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0 w-5 border-t-2 border-dashed border-indigo-500" />
        Реальный прогноз
        {onInfo && (
          <button
            type="button"
            onClick={() => onInfo("forecast")}
            className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
            aria-label="Объяснение прогноза"
            title="Открыть объяснение"
          >
            ?
          </button>
        )}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0 w-5 border-t border-dotted border-slate-400" />
        Без вмешательства (baseline)
      </span>
      {showWhatIf && (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-500" />
          What-if (превью)
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <span className="inline-block h-2.5 w-5 rounded bg-indigo-200" />
        Полоса ±1σ ≈ 68% — диапазон возможных значений
      </span>
    </div>
  );
}
