import React, { useState } from 'react';
import { RegionAnalysisPayload } from '../../types';
import {
  Thermometer,
  Layers,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ModisLstAndLandCoverPanelProps {
  analysis: RegionAnalysisPayload;
  qaFilterMode?: 'strict_good' | 'good_and_marginal';
  onChangeQaFilter?: (mode: 'strict_good' | 'good_and_marginal') => void;
  language: 'en' | 'ar';
}

export const ModisLstAndLandCoverPanel: React.FC<ModisLstAndLandCoverPanelProps> = ({
  analysis,
  qaFilterMode = analysis.qaFilterMode,
  onChangeQaFilter,
  language,
}) => {
  const { temperature, landCover } = analysis;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const allObs = temperature.observations;
  const validObs = allObs.filter(
    (o) =>
      (o.qaPassedDay !== false && o.lstDayCelsius !== null) ||
      (o.qaPassedNight !== false && o.lstNightCelsius !== null)
  );
  const latestValid = validObs.length > 0 ? validObs[validObs.length - 1] : null;
  const activeObs =
    hoveredIdx !== null && allObs[hoveredIdx] ? allObs[hoveredIdx] : latestValid;

  // Chart geometry for SVG dual-series LST on REAL timestamp X-axis
  const width = 820;
  const height = 275;
  const padL = 52;
  const padR = 20;
  const padT = 22;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const parseMs = (dateStr: string) => Date.parse(`${dateStr}T00:00:00Z`);
  const timestamps = allObs.map((o) => parseMs(o.date)).filter((t) => Number.isFinite(t));
  const minTimeMs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const maxTimeMs = timestamps.length > 0 ? Math.max(...timestamps) : 1;
  const timeSpanMs = Math.max(86400000, maxTimeMs - minTimeMs);

  const xForDate = (dateStr: string) => {
    if (allObs.length <= 1) return padL + plotW / 2;
    const t = parseMs(dateStr);
    if (!Number.isFinite(t)) return padL;
    return padL + ((t - minTimeMs) / timeSpanMs) * plotW;
  };

  const allTemps: number[] = [];
  allObs.forEach((o) => {
    if (o.qaPassedDay !== false && o.lstDayCelsius !== null) allTemps.push(o.lstDayCelsius);
    if (o.qaPassedNight !== false && o.lstNightCelsius !== null) allTemps.push(o.lstNightCelsius);
  });
  const minTemp = allTemps.length > 0 ? Math.floor(Math.min(...allTemps) / 5) * 5 : 0;
  const maxTemp = allTemps.length > 0 ? Math.ceil(Math.max(...allTemps) / 5) * 5 + 2 : 55;
  const tempSpan = Math.max(10, maxTemp - minTemp);
  const yFor = (val: number) => padT + ((maxTemp - val) / tempSpan) * plotH;

  // Break SVG paths whenever an observation is null, QA-excluded, or separated by >12 days (1.5x 8-day cadence)
  const MAX_CONTIGUOUS_GAP_MS = 12 * 86400 * 1000;
  const buildPath = (
    accessor: (o: (typeof allObs)[number]) => number | null,
    qaCheck: (o: (typeof allObs)[number]) => boolean
  ) => {
    let d = '';
    let prevTimeMs: number | null = null;
    allObs.forEach((o) => {
      const v = qaCheck(o) ? accessor(o) : null;
      const t = parseMs(o.date);
      if (v === null || !Number.isFinite(t)) {
        prevTimeMs = null;
        return;
      }
      const isBreak = prevTimeMs === null || t - prevTimeMs > MAX_CONTIGUOUS_GAP_MS;
      d += `${isBreak ? (d ? ' M' : 'M') : ' L'} ${xForDate(o.date).toFixed(1)} ${yFor(v).toFixed(1)}`;
      prevTimeMs = t;
    });
    return d;
  };

  const dayPath = buildPath(
    (o) => o.lstDayCelsius,
    (o) => o.qaPassedDay !== false
  );
  const nightPath = buildPath(
    (o) => o.lstNightCelsius,
    (o) => o.qaPassedNight !== false
  );

  // Shaded missing / QA-excluded Day LST gap bands
  const gapBands: Array<{ x1: number; x2: number }> = [];
  let gapStartIdx: number | null = null;
  allObs.forEach((o, i) => {
    const isDayMissing = o.qaPassedDay === false || o.lstDayCelsius === null;
    if (isDayMissing && gapStartIdx === null) {
      gapStartIdx = i;
    } else if (!isDayMissing && gapStartIdx !== null) {
      const x1 =
        gapStartIdx === 0
          ? padL
          : (xForDate(allObs[gapStartIdx - 1].date) + xForDate(allObs[gapStartIdx].date)) / 2;
      const x2 = (xForDate(allObs[i - 1].date) + xForDate(o.date)) / 2;
      gapBands.push({ x1, x2: Math.max(x1 + 3, x2) });
      gapStartIdx = null;
    }
  });
  if (gapStartIdx !== null && allObs.length > 0) {
    const x1 =
      gapStartIdx === 0
        ? padL
        : (xForDate(allObs[gapStartIdx - 1].date) + xForDate(allObs[gapStartIdx].date)) / 2;
    gapBands.push({ x1, x2: Math.max(x1 + 3, padL + plotW) });
  }

  // Real calendar time ticks
  const timeTicks: Array<{ label: string; x: number }> = [];
  if (timestamps.length > 1) {
    const tickCount = 7;
    for (let k = 0; k <= tickCount; k++) {
      const t = minTimeMs + (k / tickCount) * timeSpanMs;
      const iso = new Date(t).toISOString().slice(0, 7);
      const x = padL + (k / tickCount) * plotW;
      if (timeTicks.length === 0 || timeTicks[timeTicks.length - 1].label !== iso) {
        timeTicks.push({ label: iso, x });
      }
    }
  } else if (allObs.length === 1) {
    timeTicks.push({ label: allObs[0].date.slice(0, 7), x: padL + plotW / 2 });
  }

  const yTicks: number[] = [];
  const step = tempSpan > 35 ? 10 : 5;
  for (let t = minTemp; t <= maxTemp; t += step) {
    yTicks.push(t);
  }

  const renderTrendIcon = (dir: string, supported?: boolean) => {
    if (dir === 'increasing' && supported) return <TrendingUp className="w-4 h-4 text-amber-600" />;
    if (dir === 'decreasing' && supported) return <TrendingDown className="w-4 h-4 text-sky-600" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: MOD11A2 LAND SURFACE TEMPERATURE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-semibold text-slate-900">
                {language === 'ar'
                  ? 'درجة حرارة سطح الأرض كل 8 أيام (NASA MODIS MOD11A2 V061)'
                  : 'MODIS MOD11A2 V061 — 8-Day Land Surface Temperature (1 km)'}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-300 bg-slate-100 text-slate-700">
                DN × 0.02 − 273.15 → °C
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'ar'
                ? `متوسط الشبكة (${temperature.gridRows}×${temperature.gridCols} بكسل بدقة ~1 كم) بعد تصفية بتات QC_Day/QC_Night وأخطاء السطح و Clear_sky_days على محور زمني حقيقي.`
                : `Grid aggregate (${temperature.gridRows}×${temperature.gridCols} pixels @ ${temperature.cellSizeMeters}m) decoding QC_Day/QC_Night error bits & Clear_sky masks on a true-time axis with visible gaps.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            {onChangeQaFilter && (
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => onChangeQaFilter('good_and_marginal')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    qaFilterMode === 'good_and_marginal'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QA 0+1
                </button>
                <button
                  type="button"
                  onClick={() => onChangeQaFilter('strict_good')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    qaFilterMode === 'strict_good'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QA 0 Strict
                </button>
              </div>
            )}
            <span className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700">
              {language === 'ar' ? 'نهار صالحة:' : 'Valid Day:'} {temperature.validDayObservations}/
              {temperature.totalObservations}
            </span>
            <span className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700">
              {language === 'ar' ? 'ليل صالحة:' : 'Valid Night:'} {temperature.validNightObservations}/
              {temperature.totalObservations}
            </span>
          </div>
        </div>

        {/* Critical Scientific Distinction Banner */}
        <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-950 leading-relaxed">
            {language === 'ar' ? temperature.surfaceVsAirNoteAr : temperature.surfaceVsAirNoteEn}
          </p>
        </div>

        {temperature.status !== 'verified' || validObs.length === 0 ? (
          <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50 space-y-2">
            <p className="text-sm font-medium text-slate-800">
              {language === 'ar'
                ? 'لا توجد أرصاد MOD11A2 صالحة كافية لهذا الموقع حالياً.'
                : 'No QA-valid MOD11A2 observations available for the selected QA mode.'}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Status: {temperature.status.toUpperCase()} · Try QA 0+1 mode if strict QC=0 excluded all OtherQuality scenes.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Readout Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  {language === 'ar' ? 'أحدث حرارة سطح نهارية' : 'Latest Daytime Skin LST'}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                    {latestValid?.lstDayCelsius !== null && latestValid?.lstDayCelsius !== undefined
                      ? `${latestValid.lstDayCelsius.toFixed(2)}`
                      : '—'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">°C</span>
                  {latestValid?.lstDayKelvin && (
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      ({latestValid.lstDayKelvin.toFixed(1)} K)
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] font-mono text-slate-500">
                  {latestValid?.date} · QA: {latestValid?.dayQualityLabel}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  {language === 'ar' ? 'أحدث حرارة سطح ليلية' : 'Latest Nighttime Skin LST'}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums text-blue-700">
                    {latestValid?.lstNightCelsius !== null && latestValid?.lstNightCelsius !== undefined
                      ? `${latestValid.lstNightCelsius.toFixed(2)}`
                      : '—'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">°C</span>
                  {latestValid?.diurnalRangeCelsius !== null &&
                    latestValid?.diurnalRangeCelsius !== undefined && (
                      <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                        Δ {latestValid.diurnalRangeCelsius.toFixed(1)}°C
                      </span>
                    )}
                </div>
                <div className="mt-1 text-[11px] font-mono text-slate-500">
                  {latestValid?.date} · QA: {latestValid?.nightQualityLabel}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  {language === 'ar' ? 'انحراف حرارة النهار عن الأساس' : 'Day LST Baseline Anomaly'}
                </div>
                {temperature.dayLstAnomaly.status === 'computed' &&
                temperature.dayLstAnomaly.absoluteDelta !== null ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span
                        className={`text-2xl font-bold font-mono tabular-nums ${
                          temperature.dayLstAnomaly.absoluteDelta >= 0
                            ? 'text-rose-700'
                            : 'text-sky-700'
                        }`}
                      >
                        {temperature.dayLstAnomaly.absoluteDelta >= 0 ? '+' : ''}
                        {temperature.dayLstAnomaly.absoluteDelta.toFixed(2)}
                      </span>
                      <span className="text-xs font-mono text-slate-500">°C</span>
                      {temperature.dayLstAnomaly.zScore !== null && (
                        <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                          z={temperature.dayLstAnomaly.zScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-500">
                      Base {temperature.dayLstAnomaly.baselineMean?.toFixed(1)}°C → Recent{' '}
                      {temperature.dayLstAnomaly.comparisonMean?.toFixed(1)}°C
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    {language === 'ar' ? 'بيانات غير كافية' : 'INSUFFICIENT_DATA'}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide flex items-center justify-between">
                  <span>
                    {language === 'ar' ? 'اتجاه حرارة النهار (بين السنوات)' : 'Day LST Slope (Inter-Annual)'}
                  </span>
                  {renderTrendIcon(temperature.dayLstTrend.direction, temperature.dayLstTrend.significanceSupported)}
                </div>
                {temperature.dayLstTrend.status === 'computed' ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                        {temperature.dayLstTrend.sensSlopePerYear !== null
                          ? `${temperature.dayLstTrend.sensSlopePerYear >= 0 ? '+' : ''}${temperature.dayLstTrend.sensSlopePerYear.toFixed(2)}`
                          : '—'}
                      </span>
                      <span className="text-xs font-mono text-slate-500">°C/yr</span>
                      {!temperature.dayLstTrend.significanceSupported && (
                        <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          &lt;5 yr
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-600 tabular-nums space-y-0.5">
                      <div>
                        CI:{' '}
                        {temperature.dayLstTrend.sensSlopeCiLow !== null &&
                        temperature.dayLstTrend.sensSlopeCiLow !== undefined &&
                        temperature.dayLstTrend.sensSlopeCiHigh !== null &&
                        temperature.dayLstTrend.sensSlopeCiHigh !== undefined
                          ? `[${temperature.dayLstTrend.sensSlopeCiLow.toFixed(2)}, ${temperature.dayLstTrend.sensSlopeCiHigh.toFixed(2)}]`
                          : 'unbounded'}
                      </div>
                      <div>
                        n={temperature.dayLstTrend.rawSampleCount ?? temperature.dayLstTrend.sampleCount} ·{' '}
                        {temperature.dayLstTrend.spanYears?.toFixed(2)} yr ·{' '}
                        {temperature.dayLstTrend.significanceSupported
                          ? `p=${temperature.dayLstTrend.pValue?.toFixed(4)}`
                          : 'underpowered'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    INSUFFICIENT_DATA (n={temperature.validDayObservations})
                  </div>
                )}
              </div>
            </div>

            {temperature.dayLstTrend.shortRecordLimitationEn && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-[11px] font-mono text-amber-950 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  {language === 'ar'
                    ? temperature.dayLstTrend.shortRecordLimitationAr
                    : temperature.dayLstTrend.shortRecordLimitationEn}
                </span>
              </div>
            )}

            {/* Active Hover Readout Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono tabular-nums">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-slate-800">
                  {activeObs ? `${activeObs.date} (DOY ${activeObs.dayOfYear})` : '—'}
                </span>
                <span className="text-amber-700">
                  Day:{' '}
                  {activeObs?.qaPassedDay !== false &&
                  activeObs?.lstDayCelsius !== null &&
                  activeObs?.lstDayCelsius !== undefined
                    ? `${activeObs.lstDayCelsius.toFixed(2)} °C (${activeObs.dayQualityLabel})`
                    : `Excluded/Gap (${activeObs?.dayQualityLabel ?? 'N/A'})`}
                </span>
                <span className="text-blue-700">
                  Night:{' '}
                  {activeObs?.qaPassedNight !== false &&
                  activeObs?.lstNightCelsius !== null &&
                  activeObs?.lstNightCelsius !== undefined
                    ? `${activeObs.lstNightCelsius.toFixed(2)} °C (${activeObs.nightQualityLabel})`
                    : `Excluded/Gap (${activeObs?.nightQualityLabel ?? 'N/A'})`}
                </span>
                {activeObs?.clearSkyDayCountMean !== null && activeObs?.clearSkyDayCountMean !== undefined && (
                  <span className="text-slate-600">
                    Clear days: {activeObs.clearSkyDayCountMean}/8
                  </span>
                )}
              </div>
              <span className="text-slate-500">
                {temperature.validDayObservations}/{temperature.totalObservations} day ·{' '}
                {temperature.validNightObservations}/{temperature.totalObservations} night
              </span>
            </div>

            {/* Dual-Curve SVG Plot on Real Timestamp Axis with Visible Gaps */}
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto min-w-[600px] select-none"
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {gapBands.map((gb, idx) => (
                  <g key={`lst_gap_${idx}`}>
                    <rect
                      x={gb.x1}
                      y={padT}
                      width={Math.max(2, gb.x2 - gb.x1)}
                      height={plotH}
                      fill="#F1F5F9"
                      opacity={0.9}
                    />
                    <line
                      x1={gb.x1}
                      y1={padT}
                      x2={gb.x1}
                      y2={padT + plotH}
                      stroke="#CBD5E1"
                      strokeDasharray="2 2"
                    />
                  </g>
                ))}

                {yTicks.map((tick) => {
                  const y = yFor(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={width - padR}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        className="fill-slate-500 font-mono"
                      >
                        {tick}°C
                      </text>
                    </g>
                  );
                })}

                {dayPath && (
                  <path
                    d={dayPath}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                )}
                {nightPath && (
                  <path
                    d={nightPath}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                )}

                {allObs.map((obs, i) => {
                  const x = xForDate(obs.date);
                  const isHov = hoveredIdx === i;
                  const showDay = obs.qaPassedDay !== false && obs.lstDayCelsius !== null;
                  const showNight = obs.qaPassedNight !== false && obs.lstNightCelsius !== null;
                  return (
                    <g key={obs.modisDate}>
                      {isHov && (
                        <line
                          x1={x}
                          y1={padT}
                          x2={x}
                          y2={height - padB}
                          stroke="#94A3B8"
                          strokeWidth="1"
                        />
                      )}
                      {showDay && obs.lstDayCelsius !== null && (
                        <circle
                          cx={x}
                          cy={yFor(obs.lstDayCelsius)}
                          r={isHov ? 4.5 : 2.3}
                          fill="#D97706"
                          stroke="#FFFFFF"
                          strokeWidth="1"
                        />
                      )}
                      {showNight && obs.lstNightCelsius !== null && (
                        <circle
                          cx={x}
                          cy={yFor(obs.lstNightCelsius)}
                          r={isHov ? 4.5 : 2.3}
                          fill="#2563EB"
                          stroke="#FFFFFF"
                          strokeWidth="1"
                        />
                      )}
                      <rect
                        x={x - Math.max(3, plotW / Math.max(1, allObs.length) / 2)}
                        y={padT}
                        width={Math.max(6, plotW / Math.max(1, allObs.length))}
                        height={plotH}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredIdx(i)}
                      />
                    </g>
                  );
                })}

                {timeTicks.map((tk) => (
                  <text
                    key={`xlbl_${tk.label}_${tk.x.toFixed(0)}`}
                    x={tk.x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-slate-500 font-mono"
                  >
                    {tk.label}
                  </text>
                ))}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-1">
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-600 inline-block" />
                  LST_Day_1km (~10:30 AM)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                  LST_Night_1km (~10:30 PM)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="10" viewBox="0 0 12 10">
                    <rect width="12" height="10" fill="#F1F5F9" stroke="#CBD5E1" />
                  </svg>
                  Day Missing / QA-Excluded Gap
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {language === 'ar' ? temperature.dayLstTrend.interpretationAr : temperature.dayLstTrend.interpretationEn}
              </span>
            </div>
          </>
        )}
      </div>

      {/* SECTION B: MCD12Q1 ANNUAL LAND COVER & TRANSITION MATRIX */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-700" />
              <h3 className="text-base font-semibold text-slate-900">
                {language === 'ar'
                  ? 'تصنيف الغطاء الأرضي السنوي ومصفوفة التحول (MCD12Q1 V061)'
                  : 'MODIS MCD12Q1 V061 — Annual IGBP Land Cover & Transition Matrix (500 m)'}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-300 bg-slate-100 text-slate-700">
                LC_Type1 (17 Classes)
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'ar' ? landCover.caveatAr : landCover.caveatEn}
            </p>
          </div>

          {landCover.baselineYear && landCover.latestYear && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
              <span className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700">
                {landCover.baselineYear} → {landCover.latestYear}
              </span>
              {landCover.changedPercent !== null && (
                <span className="px-2.5 py-1 rounded border border-cyan-200 bg-cyan-50 text-cyan-900 font-semibold">
                  {language === 'ar' ? 'نسبة التغير:' : 'Changed:'} {landCover.changedPercent.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>

        {landCover.status !== 'verified' || landCover.years.length === 0 ? (
          <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-600">
              {language === 'ar'
                ? 'لا تتوفر بيانات MCD12Q1 لهذا الموقع.'
                : 'No annual MCD12Q1 records retrieved for this location.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Annual Stacked Bars */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {language === 'ar'
                  ? 'توزيع فئات IGBP السنوي (نسبة من 81 خلية)'
                  : `Annual IGBP Class Composition (${landCover.gridRows}×${landCover.gridCols} Grid)`}
              </h4>
              <div className="space-y-2.5">
                {landCover.years.map((yr) => (
                  <div key={yr.year} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="font-semibold text-slate-800">{yr.year}</span>
                      <span className="text-slate-600 truncate max-w-[72%]">
                        {language === 'ar' ? yr.dominantClassNameAr : yr.dominantClassNameEn}{' '}
                        {yr.meanAssessmentPercent !== null
                          ? `· QA ${yr.meanAssessmentPercent.toFixed(0)}%`
                          : ''}
                      </span>
                    </div>
                    <div className="w-full h-5 rounded border border-slate-200 overflow-hidden bg-slate-100 flex">
                      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-full">
                        {(() => {
                          let cursor = 0;
                          return yr.classes.map((cls) => {
                            const x = cursor;
                            cursor += cls.percent;
                            return (
                              <rect
                                key={cls.classId}
                                x={x}
                                y={0}
                                width={cls.percent}
                                height={10}
                                fill={cls.color}
                              >
                                <title>{`${cls.nameEn}: ${cls.percent.toFixed(1)}% (${cls.pixelCount} px)`}</title>
                              </rect>
                            );
                          });
                        })()}
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Class Legend */}
              {landCover.years.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {Array.from(
                    new Map<number, (typeof landCover.years)[number]['classes'][number]>(
                      landCover.years
                        .flatMap((y) => y.classes)
                        .map((c) => [c.classId, c])
                    ).values()
                  ).map((c) => (
                    <span
                      key={c.classId}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px] text-slate-700"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
                        <rect width="10" height="10" rx="2" fill={c.color} />
                      </svg>
                      <span className="font-mono text-slate-500">{c.classId}</span>
                      <span>{language === 'ar' ? c.nameAr : c.nameEn}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Transition Matrix Table */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {language === 'ar'
                    ? `مصفوفة التحول البكسلي (${landCover.baselineYear} → ${landCover.latestYear})`
                    : `Pixel-to-Pixel Transition Matrix (${landCover.baselineYear} → ${landCover.latestYear})`}
                </h4>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {landCover.unchangedPercent !== null
                    ? `${landCover.unchangedPercent.toFixed(1)}% Persistent`
                    : ''}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                    <tr>
                      <th className="py-2 px-3 font-semibold">
                        {language === 'ar' ? 'من فئة الأساس' : `From (${landCover.baselineYear})`}
                      </th>
                      <th className="py-2 px-3 font-semibold">
                        {language === 'ar' ? 'إلى أحدث فئة' : `To (${landCover.latestYear})`}
                      </th>
                      <th className="py-2 px-3 font-semibold text-right">
                        {language === 'ar' ? 'البكسلات' : 'Pixels'}
                      </th>
                      <th className="py-2 px-3 font-semibold text-right">% Grid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {landCover.transitions.slice(0, 10).map((tr, i) => (
                      <tr key={i} className={tr.isChanged ? 'bg-cyan-50/40' : 'bg-white'}>
                        <td className="py-2 px-3 text-slate-800">
                          <span className="font-mono text-slate-400 mr-1">[{tr.fromClassId}]</span>
                          {language === 'ar' ? tr.fromNameAr : tr.fromNameEn}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          <span className="inline-flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-slate-400">[{tr.toClassId}]</span>
                            {language === 'ar' ? tr.toNameAr : tr.toNameEn}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                          {tr.pixelCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              tr.isChanged
                                ? 'bg-cyan-100 text-cyan-900'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tr.percentOfAnalyzedGrid.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start gap-2 text-[11px] text-slate-600">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  {language === 'ar'
                    ? 'التحولات المرصودة تعبر عن تغيرات تصنيف IGBP بدقة 500م، ولا يُفترض تلقائياً أن كل تغير هو تمدد عمراني.'
                    : 'Transitions report literal MCD12Q1 IGBP class changes at 500m scale; class shifts (e.g., Barren ↔ Cropland) are never auto-labeled as urbanization.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
