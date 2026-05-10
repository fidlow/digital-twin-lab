// src/components/TelemetryChart.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  DT,
  FORECAST_STEPS,
  H,
  HISTORY_FRACTION,
  N,
  PAD,
  SERIES,
  W,
  clamp,
  fx,
  hoverUnit,
  hoverValue,
  sx,
  sy,
  type ChartDataPoint,
  type ForecastPoint,
  type SeriesItem,
} from "../models/digitalTwin";

interface TelemetryChartProps {
  rows: ChartDataPoint[];
  fc: ForecastPoint[];
  whatIfFc?: ForecastPoint[];
  baselineFc?: ForecastPoint[];
  running: boolean;
  last: number;
}

const FORECAST_KEYS = ["t", "pChart"] as const;
const FORECAST_META: Record<(typeof FORECAST_KEYS)[number], { color: string; domain: number[]; width: number }> = {
  t: { color: SERIES.find((s) => s[0] === "t")![2], domain: SERIES.find((s) => s[0] === "t")![3], width: 2.4 },
  pChart: { color: SERIES.find((s) => s[0] === "pChart")![2], domain: SERIES.find((s) => s[0] === "pChart")![3], width: 2 },
};

export function TelemetryChart({ rows, fc, whatIfFc, baselineFc, running, last }: TelemetryChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [now, setNow] = useState(Date.now());
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return undefined;
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [running]);

  const data = rows.slice(-N);
  const phase = clamp((now - last) / DT, 0, 1);
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;
  const pwH = pw * HISTORY_FRACTION;
  const pwF = pw - pwH;
  const nowX = PAD.l + pwH;
  const x = (idx: number) => PAD.l + sx(idx, data.length, phase, pwH);
  const xFc = (step: number) => PAD.l + fx(step, phase, pwH, pwF);
  const y = (val: number, domain: number[]) => PAD.t + sy(val, domain, ph);
  const path = (series: SeriesItem): string =>
    data.map((row, idx) => `${idx ? "L" : "M"}${x(idx).toFixed(1)},${y(row[series[0] as keyof ChartDataPoint] as number, series[3]).toFixed(1)}`).join(" ");

  const lastIdx = data.length - 1;
  const lastRow = data[lastIdx];
  const bandKey = { t: "tBand", pChart: "pChartBand" } as const;
  const forecastPath = (key: (typeof FORECAST_KEYS)[number]): string => {
    if (!fc.length || !lastRow) return "";
    const domain = FORECAST_META[key].domain;
    const segments = [`M${x(lastIdx).toFixed(1)},${y(lastRow[key] as number, domain).toFixed(1)}`];
    for (const fp of fc) {
      segments.push(`L${xFc(fp.step).toFixed(1)},${y(fp[key], domain).toFixed(1)}`);
    }
    return segments.join(" ");
  };
  const altForecastPath = (alt: ForecastPoint[], key: (typeof FORECAST_KEYS)[number]): string => {
    if (!alt.length || !lastRow) return "";
    const domain = FORECAST_META[key].domain;
    const segments = [`M${x(lastIdx).toFixed(1)},${y(lastRow[key] as number, domain).toFixed(1)}`];
    for (const fp of alt) {
      segments.push(`L${xFc(fp.step).toFixed(1)},${y(fp[key], domain).toFixed(1)}`);
    }
    return segments.join(" ");
  };
  const bandPath = (key: (typeof FORECAST_KEYS)[number]): string => {
    if (!fc.length || !lastRow) return "";
    const domain = FORECAST_META[key].domain;
    const bk = bandKey[key];
    const startX = x(lastIdx).toFixed(1);
    const startY = y(lastRow[key] as number, domain).toFixed(1);
    const upper = fc.map((fp) => `L${xFc(fp.step).toFixed(1)},${y(fp[key] + fp[bk], domain).toFixed(1)}`);
    const lower = fc
      .slice()
      .reverse()
      .map((fp) => `L${xFc(fp.step).toFixed(1)},${y(fp[key] - fp[bk], domain).toFixed(1)}`);
    return [`M${startX},${startY}`, ...upper, ...lower, "Z"].join(" ");
  };

  function move(event: React.MouseEvent<SVGSVGElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xx = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * W;
    if (xx > nowX || xx < PAD.l) {
      setHover(null);
      return;
    }
    const step = pwH / (N - 1);
    setHover(clamp(Math.round(data.length - 1 + phase - (nowX - xx) / step), 0, data.length - 1));
  }

  const h = hover == null ? null : data[hover];

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-full w-full select-none" onMouseMove={move} onMouseLeave={() => setHover(null)}>
      <rect width={W} height={H} fill="white" />
      <rect x={PAD.l} y={PAD.t} width={pw} height={ph} rx="12" fill="#f8fafc" />

      {[0, 0.25, 0.5, 0.75, 1].map((row, i) => (
        <line key={`h-${i}`} x1={PAD.l} x2={PAD.l + pw} y1={PAD.t + row * ph} y2={PAD.t + row * ph} stroke="#e2e8f0" strokeDasharray="4 5" />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((col, i) => (
        <line key={`v-${i}`} x1={PAD.l + col * pw} x2={PAD.l + col * pw} y1={PAD.t} y2={PAD.t + ph} stroke="#e2e8f0" strokeDasharray="4 5" />
      ))}

      <clipPath id="fti-telemetry-clip">
        <rect x={PAD.l} y={PAD.t} width={pw} height={ph} rx="12" />
      </clipPath>

      <g clipPath="url(#fti-telemetry-clip)">
        <rect x={nowX} y={PAD.t} width={pwF} height={ph} fill="#6366f1" opacity="0.07" />
        {SERIES.map((series) => (
          <path key={series[0]} d={path(series)} fill="none" stroke={series[2]} strokeWidth={series[0] === "t" ? 2.7 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {FORECAST_KEYS.map((key) => (
          <path key={`band-${key}`} d={bandPath(key)} fill={FORECAST_META[key].color} opacity="0.13" stroke="none" />
        ))}
        {FORECAST_KEYS.map((key) => (
          <path key={`fc-${key}`} d={forecastPath(key)} fill="none" stroke={FORECAST_META[key].color} strokeWidth={FORECAST_META[key].width} strokeLinecap="round" strokeDasharray="6 5" opacity="0.6" />
        ))}
        {whatIfFc && whatIfFc.length > 0 && FORECAST_KEYS.map((key) => (
          <path
            key={`whatif-${key}`}
            d={altForecastPath(whatIfFc, key)}
            fill="none"
            stroke="#64748b"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="3 4"
            opacity="0.85"
          />
        ))}
        {baselineFc && baselineFc.length > 0 && FORECAST_KEYS.map((key) => (
          <path
            key={`baseline-${key}`}
            d={altForecastPath(baselineFc, key)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeDasharray="1 4"
            opacity="0.7"
          />
        ))}
      </g>

      <line x1={nowX} x2={nowX} y1={PAD.t} y2={PAD.t + ph} stroke="#0f172a" opacity="0.35" />
      <text x={PAD.l + 12} y={PAD.t + ph - 12} fontSize="14" fontWeight="700" fill="#475569">история</text>
      <text x={nowX + 8} y={PAD.t + 22} fontSize="13" fontWeight="800" fill="#4f46e5" letterSpacing="0.06em">ПРОГНОЗ</text>
      <text x={nowX + 8} y={PAD.t + 40} fontSize="11" fontWeight="600" fill="#6366f1">экстраполяция модели</text>

      {[0, 30, 60, 90].map((back) => {
        const xx = nowX - back * (pwH / (N - 1));
        return xx < PAD.l ? null : <text key={back} x={xx} y={H - 9} textAnchor="middle" fontSize="13" fontWeight="600" fill="#64748b">{back ? `-${back}` : "сейчас"}</text>;
      })}
      {[30, 60].map((ahead) => {
        const xx = nowX + ahead * (pwF / FORECAST_STEPS);
        return xx > PAD.l + pw ? null : <text key={`f-${ahead}`} x={xx} y={H - 9} textAnchor="middle" fontSize="13" fontWeight="700" fill="#4f46e5">+{ahead}</text>;
      })}

      {h && (
        <g pointerEvents="none">
          <line x1={x(hover!)} x2={x(hover!)} y1={PAD.t} y2={PAD.t + ph} stroke="#0f172a" opacity="0.25" />
          <rect x={clamp(x(hover!) + 12, PAD.l, W - 275)} y={PAD.t + 10} width="260" height="154" rx="14" fill="white" stroke="#e2e8f0" />
          <text x={clamp(x(hover!) + 26, PAD.l + 14, W - 260)} y={PAD.t + 34} fontSize="16" fontWeight="800" fill="#0f172a">{h.tm}</text>
          {SERIES.map((series, i) => (
            <text key={series[0]} x={clamp(x(hover!) + 26, PAD.l + 14, W - 260)} y={PAD.t + 60 + i * 20} fontSize="14" fontWeight="700" fill={series[2]}>
              {series[1]}: {hoverValue(h!, series[0])} {hoverUnit(series)}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
