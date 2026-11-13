import React, { useState } from 'react';
import { RegionAnalysisPayload } from '../types';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Filter,
  Info,
} from 'lucide-react';

interface ModisVegetationChartProps {
  vegetation: RegionAnalysisPayload['vegetation'];
  qaFilterMode: 'strict_good' | 'good_and_marginal';
  onChangeQaFilter: (mode: 'strict_good' | 'good_and_marginal') => void;
  regionName: string;
  language: 'en' | 'ar';
}

export const ModisVegetationChart: React.FC<ModisVegetationChartProps> = ({
  vegetation,
  qaFilterMode,
  onChangeQaFilter,
  regionName,
  language,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showEvi, setShowEvi] = useState(true);

  const allObs = vegetation.observations;
  const validObs = allObs.filter((o) => o.qaPassed !== false && o.ndvi !== null);
  const latest = validObs.length > 0 ? validObs[validObs.length - 1] : null;
  const active = hoveredIdx !== null && allObs[hoveredIdx] ? allObs[hoveredIdx] : latest;

  // SVG Chart Geometry with REAL timestamp X-axis
  const width = 820;
  const height = 295;
  const padL = 54;
  const padR = 22;
  const padT = 22;
  const padB = 42;
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

  const allVals: number[] = [];
  validObs.forEach((o) => {
    if (o.ndvi !== null) allVals.push(o.ndvi);
    if (showEvi && o.evi !== null) allVals.push(o.evi);
  });

  const rawMin = allVals.length > 0 ? Math.min(...allVals) : 0;
  const rawMax = allVals.length > 0 ? Math.max(...allVals) : 0.8;
  const yMin = Math.max(-0.2, Math.floor((rawMin - 0.05) * 10) / 10);
  const yMax = Math.min(1.0, Math.ceil((rawMax + 0.05) * 10) / 10);
  const ySpan = Math.max(0.2, yMax - yMin);
  const yFor = (val: number) => padT + ((yMax - val) / ySpan) * plotH;

  // Break SVG paths whenever an observation is null, QA-excluded, or separated by >24 days (1.5x 16-day cadence)
  const MAX_CONTIGUOUS_GAP_MS = 24 * 86400 * 1000;
  const buildSegmentedPath = (accessor: (o: (typeof allObs)[number]) => number | null) => {
    let d = '';
    let prevTimeMs: number | null = null;
    allObs.forEach((o) => {
      const val = o.qaPassed !== false ? accessor(o) : null;
      const t = parseMs(o.date);
      if (val === null || !Number.isFinite(t)) {
        prevTimeMs = null;
        return;
      }
      const isBreak = prevTimeMs === null || t - prevTimeMs > MAX_CONTIGUOUS_GAP_MS;
      d += `${isBreak ? (d ? ' M' : 'M') : ' L'} ${xForDate(o.date).toFixed(1)} ${yFor(val).toFixed(1)}`;
      prevTimeMs = t;
    });
    return d;
  };

  const ndviPath = buildSegmentedPath((o) => o.ndvi);
  const eviPath = buildSegmentedPath((o) => o.evi);

  // Identify contiguous excluded/missing intervals to shade as visible gaps
  const gapBands: Array<{ x1: number; x2: number; startDate: string; endDate: string }> = [];
  let gapStartIdx: number | null = null;
  allObs.forEach((o, i) => {
    const isMissing = o.qaPassed === false || o.ndvi === null;
    if (isMissing && gapStartIdx === null) {
      gapStartIdx = i;
    } else if (!isMissing && gapStartIdx !== null) {
      const leftDate = allObs[Math.max(0, gapStartIdx - 1)].date;
      const rightDate = o.date;
      const x1 = gapStartIdx === 0 ? padL : (xForDate(leftDate) + xForDate(allObs[gapStartIdx].date)) / 2;
      const x2 = (xForDate(allObs[i - 1].date) + xForDate(rightDate)) / 2;
      gapBands.push({
        x1,
        x2: Math.max(x1 + 3, x2),
        startDate: allObs[gapStartIdx].date,
        endDate: allObs[i - 1].date,
      });
      gapStartIdx = null;
    }
  });
  if (gapStartIdx !== null && allObs.length > 0) {
    const x1 =
      gapStartIdx === 0
        ? padL
        : (xForDate(allObs[gapStartIdx - 1].date) + xForDate(allObs[gapStartIdx].date)) / 2;
    gapBands.push({
      x1,
      x2: Math.max(x1 + 3, padL + plotW),
      startDate: allObs[gapStartIdx].date,
      endDate: allObs[allObs.length - 1].date,
    });
  }

  // Generate true calendar ticks along the linear time axis
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
  const step = ySpan > 0.6 ? 0.2 : 0.1;
  for (let v = yMin; v <= yMax + 0.001; v += step) {
    yTicks.push(Math.round(v * 100) / 100);
  }

  const trendBadge = (trend: RegionAnalysisPayload['vegetation']['ndviTrend']) => {
    if (trend.direction === 'increasing' && trend.significanceSupported) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
          <TrendingUp className="w-3 h-3" /> Increasing (p≤0.05)
        </span>
      );
    }
    if (trend.direction === 'decreasing' && trend.significanceSupported) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border border-rose-200 bg-rose-50 text-rose-800">
          <TrendingDown className="w-3 h-3" /> Decreasing (p≤0.05)
        </span>
      );
    }
    if (trend.direction === 'inconclusive_short_record') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border border-amber-200 bg-amber-50 text-amber-900">
          <Minus className="w-3 h-3" /> Short Record (&lt;5 yr)
        </span>
      );
    }
    if (trend.direction === 'insufficient_data') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border border-slate-200 bg-slate-100 text-slate-600">
          <Minus className="w-3 h-3" /> Insufficient Data
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border border-slate-200 bg-slate-100 text-slate-700">
        <Minus className="w-3 h-3" /> No Significant Trend
      </span>
    );
  };

  const renderTrendCardBody = (
    trend: RegionAnalysisPayload['vegetation']['ndviTrend'],
    unitLabel: string
  ) => {
    if (trend.status !== 'computed') {
      return (
        <div className="text-xs font-mono text-slate-500">
          INSUFFICIENT_DATA ({trend.rawSampleCount ?? trend.sampleCount} valid obs)
        </div>
      );
    }
    return (
      <>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {trend.sensSlopePerYear !== null
              ? `${trend.sensSlopePerYear >= 0 ? '+' : ''}${trend.sensSlopePerYear.toFixed(4)}`
              : '—'}
          </span>
          <span className="text-xs font-mono text-slate-500">{unitLabel}</span>
          {!trend.significanceSupported && (
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              exploratory
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-600 tabular-nums space-y-0.5">
          <div>
            95% CI:{' '}
            {trend.sensSlopeCiLow !== null &&
            trend.sensSlopeCiLow !== undefined &&
            trend.sensSlopeCiHigh !== null &&
            trend.sensSlopeCiHigh !== undefined
              ? `[${trend.sensSlopeCiLow >= 0 ? '+' : ''}${trend.sensSlopeCiLow.toFixed(4)}, ${
                  trend.sensSlopeCiHigh >= 0 ? '+' : ''
                }${trend.sensSlopeCiHigh.toFixed(4)}]`
              : 'unbounded (small n)'}
          </div>
          <div>
            {trend.dateSpanStart} → {trend.dateSpanEnd} ({trend.spanYears?.toFixed(2)} yr)
          </div>
          <div>
            n={trend.rawSampleCount ?? trend.sampleCount} valid obs ({trend.seasonalCellCount ?? '—'} mo-cells) · S=
            {trend.sStatistic} · {trend.significanceSupported ? `Z=${trend.zScore?.toFixed(2)} · p=${trend.pValue?.toFixed(4)}` : `exploratory p=${trend.pValue?.toFixed(4)}`}
          </div>
        </div>
      </>
    );
  };

  const activeIsValid = active && active.qaPassed !== false && active.ndvi !== null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      {/* Header & QA Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-700" />
            <h3 className="text-base font-semibold text-slate-900">
              {language === 'ar'
                ? `السلسلة الزمنية لمؤشرات الغطاء النباتي MOD13Q1 V061 — ${regionName}`
                : `MODIS MOD13Q1 V061 (250 m, 16-Day) NDVI & EVI — ${regionName}`}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-300 bg-slate-100 text-slate-700">
              DN × 0.0001 [-0.20..+1.00]
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {language === 'ar'
              ? `يتم رسم ${vegetation.validObservations} من ${vegetation.totalObservations} رصداً من شبكة ${vegetation.gridRows}×${vegetation.gridCols} بكسل على محور زمني حقيقي مع فجوات مرئية للبيانات المفقودة أو المستبعدة.`
              : `Plots ${vegetation.validObservations} QA-passed composites of ${vegetation.totalObservations} (${vegetation.excludedObservations} excluded) from a ${vegetation.gridRows}×${vegetation.gridCols} grid on a true-time axis with visible gaps.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => onChangeQaFilter('good_and_marginal')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                qaFilterMode === 'good_and_marginal'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              QA 0+1 (Good+Marginal)
            </button>
            <button
              type="button"
              onClick={() => onChangeQaFilter('strict_good')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                qaFilterMode === 'strict_good'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              QA 0 Only (Strict)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowEvi((v) => !v)}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border ${
              showEvi
                ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {showEvi ? 'EVI: ON' : 'EVI: OFF'}
          </button>
        </div>
      </div>

      {vegetation.status !== 'verified' || validObs.length === 0 ? (
        <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50 space-y-2">
          <p className="text-sm font-medium text-slate-800">
            {language === 'ar'
              ? 'لا توجد أرصاد MOD13Q1 صالحة ضمن وضع تصفية الجودة المختار.'
              : 'No MOD13Q1 observations passed the selected QA filter for this coordinate/span.'}
          </p>
          <p className="text-xs font-mono text-slate-500">
            Status: {vegetation.status.toUpperCase()} · Excluded: {vegetation.excludedObservations}/{vegetation.totalObservations} · Try QA 0+1 mode if strict filtering excluded marginal scenes.
          </p>
        </div>
      ) : (
        <>
          {/* Statistical Summary Strip (Monthly-Aggregated Hirsch-Slack Seasonal MK + Inter-Annual Sen Slope) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* NDVI Trend Card */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold uppercase text-slate-500">
                  {language === 'ar' ? 'اتجاه NDVI (بين السنوات)' : 'NDVI Trend (Inter-Annual MK + Sen)'}
                </span>
                {trendBadge(vegetation.ndviTrend)}
              </div>
              {renderTrendCardBody(vegetation.ndviTrend, 'NDVI / yr')}
            </div>

            {/* EVI Trend Card */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold uppercase text-slate-500">
                  {language === 'ar' ? 'اتجاه EVI (بين السنوات)' : 'EVI Trend (Inter-Annual MK + Sen)'}
                </span>
                {trendBadge(vegetation.eviTrend)}
              </div>
              {renderTrendCardBody(vegetation.eviTrend, 'EVI / yr')}
            </div>

            {/* Baseline Anomaly & QA Coverage */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-slate-500">
                  {language === 'ar' ? 'الانحراف عن خط الأساس ونسبة QA' : 'Baseline Anomaly & QA Coverage'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  {vegetation.qaCoveragePercent.toFixed(1)}%
                </span>
              </div>
              {vegetation.ndviAnomaly.status === 'computed' &&
              vegetation.ndviAnomaly.absoluteDelta !== null ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-xl font-bold font-mono tabular-nums ${
                        vegetation.ndviAnomaly.absoluteDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {vegetation.ndviAnomaly.absoluteDelta >= 0 ? '+' : ''}
                      {vegetation.ndviAnomaly.absoluteDelta.toFixed(4)}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({vegetation.ndviAnomaly.percentChange?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                    Base {vegetation.ndviAnomaly.baselineMean?.toFixed(3)} → Recent{' '}
                    {vegetation.ndviAnomaly.comparisonMean?.toFixed(3)} · z=
                    {vegetation.ndviAnomaly.zScore?.toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-xs font-mono text-slate-500">
                  QA Coverage: {vegetation.validObservations}/{vegetation.totalObservations} valid
                </div>
              )}
            </div>
          </div>

          {/* Short-record limitation notice */}
          {vegetation.ndviTrend.shortRecordLimitationEn && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-[11px] font-mono text-amber-950 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
              <span>
                {language === 'ar'
                  ? vegetation.ndviTrend.shortRecordLimitationAr
                  : vegetation.ndviTrend.shortRecordLimitationEn}
              </span>
            </div>
          )}

          {/* Interactive Point Readout Bar (handles both valid points and QA-excluded gaps) */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono tabular-nums">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-900">
                {active ? `${active.date} (DOY ${active.dayOfYear})` : '—'}
              </span>
              {activeIsValid ? (
                <>
                  <span className="text-emerald-700 font-semibold">
                    NDVI: {active?.ndvi !== null && active?.ndvi !== undefined ? active.ndvi.toFixed(4) : '—'}
                    {active?.ndviStdDev !== null && active?.ndviStdDev !== undefined
                      ? ` ±${active.ndviStdDev.toFixed(3)}`
                      : ''}
                  </span>
                  <span className="text-cyan-700 font-semibold">
                    EVI: {active?.evi !== null && active?.evi !== undefined ? active.evi.toFixed(4) : '—'}
                  </span>
                  <span className="text-slate-600">
                    Pixels: {active?.validPixels ?? 0}/{active?.totalPixels ?? 0}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 italic">
                  {active
                    ? `Gap / Excluded by ${qaFilterMode === 'strict_good' ? 'Strict QA=0' : 'QA'} filter (${active.qualityLabel})`
                    : '—'}
                </span>
              )}
            </div>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] ${
                active?.qualityLabel === 'Good'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : active?.qualityLabel === 'Marginal'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-300 bg-slate-200 text-slate-700'
              }`}
            >
              QA: {active?.qualityLabel ?? '—'} (rank {active?.pixelReliabilityMode ?? '—'})
            </span>
          </div>

          {/* Interactive SVG Chart on Real Timestamp Axis with Visible Gaps */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto min-w-[620px] select-none"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Shaded missing / QA-excluded gap regions */}
              {gapBands.map((gb, idx) => (
                <g key={`gap_${idx}`}>
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
                      stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
                      strokeDasharray={tick === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      className="fill-slate-500 font-mono"
                    >
                      {tick.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {showEvi && eviPath && (
                <path
                  d={eviPath}
                  fill="none"
                  stroke="#0891B2"
                  strokeWidth="1.75"
                  strokeDasharray="4 2"
                  strokeLinejoin="round"
                />
              )}

              {ndviPath && (
                <path
                  d={ndviPath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              )}

              {allObs.map((obs, i) => {
                const x = xForDate(obs.date);
                const isHov = hoveredIdx === i;
                const passesQa = obs.qaPassed !== false && obs.ndvi !== null;
                const dotColor =
                  obs.qualityLabel === 'Good'
                    ? '#059669'
                    : obs.qualityLabel === 'Marginal'
                    ? '#D97706'
                    : '#64748B';
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
                    {passesQa && showEvi && obs.evi !== null && (
                      <circle
                        cx={x}
                        cy={yFor(obs.evi)}
                        r={isHov ? 4 : 2}
                        fill="#0891B2"
                        stroke="#FFFFFF"
                        strokeWidth="1"
                      />
                    )}
                    {passesQa && obs.ndvi !== null && (
                      <circle
                        cx={x}
                        cy={yFor(obs.ndvi)}
                        r={isHov ? 4.5 : 2.6}
                        fill={dotColor}
                        stroke="#FFFFFF"
                        strokeWidth="1"
                      />
                    )}
                    {!passesQa && (
                      <line
                        x1={x}
                        y1={height - padB - 4}
                        x2={x}
                        y2={height - padB}
                        stroke="#94A3B8"
                        strokeWidth="1.2"
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
                  key={`x_${tk.label}_${tk.x.toFixed(0)}`}
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
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <circle cx="5" cy="5" r="4" fill="#059669" />
                </svg>
                NDVI (QA=0 Good)
              </span>
              {qaFilterMode === 'good_and_marginal' && (
                <span className="inline-flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" fill="#D97706" />
                  </svg>
                  NDVI (QA=1 Marginal)
                </span>
              )}
              {showEvi && (
                <span className="inline-flex items-center gap-1.5">
                  <svg width="14" height="6" viewBox="0 0 14 6">
                    <line x1="0" y1="3" x2="14" y2="3" stroke="#0891B2" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>
                  EVI (MOD13Q1)
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <svg width="12" height="10" viewBox="0 0 12 10">
                  <rect width="12" height="10" fill="#F1F5F9" stroke="#CBD5E1" />
                </svg>
                Missing / QA-Excluded Gap
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Filter className="w-3 h-3" />
                {qaFilterMode === 'strict_good'
                  ? `Excluded Marginal/Cloudy/Snow/NoData: ${vegetation.excludedObservations}`
                  : `Excluded Cloudy/Snow/NoData: ${vegetation.excludedObservations}`}
              </span>
            </div>

            <div className="flex items-start gap-1.5 text-[11px] font-mono text-slate-600">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span>
                {language === 'ar'
                  ? vegetation.ndviTrend.interpretationAr
                  : vegetation.ndviTrend.interpretationEn}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
