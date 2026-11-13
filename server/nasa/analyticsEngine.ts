import {
  StudyRegionDefinition,
  ModisVegetationObservation,
  ModisLstObservation,
  MannKendallTrendResult,
  BaselineAnomalyResult,
  LandCoverTransitionEntry,
  EarthChangeStory,
  RegionAnalysisPayload,
  ActionInsightMatch,
  PlasticReport,
  PlasticType,
} from '../../src/types';
import { IGBP_LAND_COVER_CLASSES } from './nasaCatalog';
import { OrnlVegResult, OrnlLandCoverResult, OrnlLstResult } from './ornlModisClient';

/**
 * Standard Normal CDF approximation (Abramowitz & Stegun) for two-tailed p-value
 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - prob : prob;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tieKey(val: number): number {
  return Math.round(val * 1e6);
}

function signTol(diff: number): number {
  if (diff > 1e-9) return 1;
  if (diff < -1e-9) return -1;
  return 0;
}

/**
 * Computes Monthly-Aggregated Seasonal Mann-Kendall Trend Test with Hirsch & Slack (1984)
 * cross-month covariance + Inter-Annual Same-Month Sen's Slope Estimator & Gilbert (1987) 95% CI.
 *
 * Scientific guarantees:
 * 1. Sub-monthly composites (8-day MOD11A2, 16-day MOD13Q1) are aggregated to 1 mean value per (Year, Month)
 *    so multiple composites from the same year are NEVER compared against each other.
 * 2. Missing observations remain missing (no interpolation).
 * 3. Inter-seasonal serial correlation across calendar months is accounted for via Hirsch & Slack (1984) Cov(S_g, S_h).
 * 4. Significance testing (p <= 0.05) and decadal extrapolation require >= 5.0 years of span and >= 5 years in a season.
 */
export function computeSeasonalMannKendall(
  points: Array<{ date: string; value: number }>,
  metricName: string,
  unit: string,
  minRawSamples = 12
): MannKendallTrendResult {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const rawCount = sorted.length;

  if (rawCount < minRawSamples) {
    return {
      status: 'insufficient_data',
      metricName,
      unit,
      sampleCount: rawCount,
      rawSampleCount: rawCount,
      seasonalCellCount: 0,
      distinctYears: 0,
      spanYears: 0,
      dateSpanStart: sorted[0]?.date,
      dateSpanEnd: sorted[rawCount - 1]?.date,
      sStatistic: null,
      zScore: null,
      pValue: null,
      significanceSupported: false,
      sensSlopePerYear: null,
      sensSlopeCiLow: null,
      sensSlopeCiHigh: null,
      ciLevel: 0.95,
      sensSlopePerDecade: null,
      shortRecordLimitationEn: `Only ${rawCount} QA-valid observations available (minimum ${minRawSamples} required).`,
      shortRecordLimitationAr: `يتوفر ${rawCount} رصداً صالحاً فقط (الحد الأدنى المطلوب هو ${minRawSamples}).`,
      direction: 'insufficient_data',
      alpha: 0.05,
      methodUsed: 'Monthly-Aggregated Seasonal Mann-Kendall (Hirsch-Slack 1984) + Sen Slope',
      interpretationEn: `Only ${rawCount} QA-valid observations available (minimum ${minRawSamples} required for inter-annual seasonal analysis).`,
      interpretationAr: `يتوفر ${rawCount} رصداً صالحاً فقط (الحد الأدنى المطلوب هو ${minRawSamples} لإجراء التحليل الموسمي بين السنوات).`,
    };
  }

  // Step 1: Aggregate QA-valid observations to at most 1 monthly mean per (year, month)
  const monthlyCells = new Map<
    string,
    { year: number; month: number; sumVal: number; sumMs: number; count: number }
  >();
  for (const pt of sorted) {
    const ms = Date.parse(`${pt.date}T00:00:00Z`);
    if (!Number.isFinite(ms)) continue;
    const dt = new Date(ms);
    const year = dt.getUTCFullYear();
    const month = dt.getUTCMonth();
    const key = `${year}-${month}`;
    const cell = monthlyCells.get(key) || { year, month, sumVal: 0, sumMs: 0, count: 0 };
    cell.sumVal += pt.value;
    cell.sumMs += ms;
    cell.count += 1;
    monthlyCells.set(key, cell);
  }

  const yearsSet = new Set<number>();
  // matrix[month][year] = { timeYr, value }
  const monthMatrix: Array<Map<number, { year: number; timeYr: number; value: number }>> =
    Array.from({ length: 12 }, () => new Map());

  for (const cell of monthlyCells.values()) {
    yearsSet.add(cell.year);
    const meanVal = cell.sumVal / cell.count;
    const meanTimeYr = cell.sumMs / cell.count / (365.25 * 24 * 3600 * 1000);
    monthMatrix[cell.month].set(cell.year, {
      year: cell.year,
      timeYr: meanTimeYr,
      value: meanVal,
    });
  }

  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
  const seasonalCellCount = monthlyCells.size;
  const firstMs = Date.parse(`${sorted[0].date}T00:00:00Z`);
  const lastMs = Date.parse(`${sorted[rawCount - 1].date}T00:00:00Z`);
  const spanYears = Math.max(0, (lastMs - firstMs) / (365.25 * 24 * 3600 * 1000));

  let totalS = 0;
  let diagVarS = 0;
  let maxYearsPerSeason = 0;
  const seasonalSlopes: number[] = [];

  // Precompute within-month S_g, Var(S_g), mid-ranks R_{y,g}, and strictly inter-annual slopes
  const seasonStats: Array<{
    years: number[];
    n: number;
    ranks: Map<number, number>;
  }> = [];

  for (let g = 0; g < 12; g++) {
    const mapG = monthMatrix[g];
    const yrsG = sortedYears.filter((y) => mapG.has(y));
    const nG = yrsG.length;
    if (nG > maxYearsPerSeason) maxYearsPerSeason = nG;

    const ranks = new Map<number, number>();
    if (nG >= 2) {
      let sG = 0;
      const tieCounts = new Map<number, number>();
      for (const y of yrsG) {
        const tk = tieKey(mapG.get(y)!.value);
        tieCounts.set(tk, (tieCounts.get(tk) || 0) + 1);
      }

      for (let i = 0; i < nG - 1; i++) {
        const ptI = mapG.get(yrsG[i])!;
        for (let j = i + 1; j < nG; j++) {
          const ptJ = mapG.get(yrsG[j])!;
          // Strictly inter-annual guarantee: yrsG[j] > yrsG[i]
          const diff = ptJ.value - ptI.value;
          sG += signTol(diff);
          const dtYr = ptJ.timeYr - ptI.timeYr;
          if (dtYr >= 0.75) {
            seasonalSlopes.push(diff / dtYr);
          }
        }
      }

      let tieSum = 0;
      for (const c of tieCounts.values()) {
        if (c > 1) tieSum += c * (c - 1) * (2 * c + 5);
      }
      const varG = (nG * (nG - 1) * (2 * nG + 5) - tieSum) / 18;
      totalS += sG;
      diagVarS += Math.max(0, varG);

      // Hirsch & Slack (1984) mid-ranks for non-missing years in season g
      for (const y of yrsG) {
        const valY = mapG.get(y)!.value;
        let sgnSum = 0;
        for (const k of yrsG) {
          if (k === y) continue;
          sgnSum += signTol(valY - mapG.get(k)!.value);
        }
        ranks.set(y, 0.5 * (nG + 1 + sgnSum));
      }
    }
    seasonStats.push({ years: yrsG, n: nG, ranks });
  }

  // Hirsch & Slack (1984) inter-seasonal covariance Cov(S_g, S_h)
  let covTermSum = 0;
  for (let g = 0; g < 11; g++) {
    if (seasonStats[g].n < 2) continue;
    const mapG = monthMatrix[g];
    for (let h = g + 1; h < 12; h++) {
      if (seasonStats[h].n < 2) continue;
      const mapH = monthMatrix[h];
      const commonYears = sortedYears.filter((y) => mapG.has(y) && mapH.has(y));
      const nGh = commonYears.length;
      if (nGh < 2) continue;

      let kGh = 0;
      for (let i = 0; i < nGh - 1; i++) {
        const yI = commonYears[i];
        const gI = mapG.get(yI)!.value;
        const hI = mapH.get(yI)!.value;
        for (let j = i + 1; j < nGh; j++) {
          const yJ = commonYears[j];
          kGh +=
            signTol(mapG.get(yJ)!.value - gI) * signTol(mapH.get(yJ)!.value - hI);
        }
      }

      let rProdSum = 0;
      for (const y of commonYears) {
        rProdSum += seasonStats[g].ranks.get(y)! * seasonStats[h].ranks.get(y)!;
      }
      const covGh =
        (kGh + 4 * rProdSum - nGh * (seasonStats[g].n + 1) * (seasonStats[h].n + 1)) / 3;
      covTermSum += covGh;
    }
  }

  const totalVarS = diagVarS + 2 * covTermSum;

  if (seasonalCellCount < 12 || seasonalSlopes.length < 4 || sortedYears.length < 2) {
    return {
      status: 'insufficient_data',
      metricName,
      unit,
      sampleCount: seasonalCellCount,
      rawSampleCount: rawCount,
      seasonalCellCount,
      distinctYears: sortedYears.length,
      spanYears: Number(spanYears.toFixed(2)),
      dateSpanStart: sorted[0].date,
      dateSpanEnd: sorted[rawCount - 1].date,
      sStatistic: totalS,
      zScore: null,
      pValue: null,
      significanceSupported: false,
      sensSlopePerYear: null,
      sensSlopeCiLow: null,
      sensSlopeCiHigh: null,
      ciLevel: 0.95,
      sensSlopePerDecade: null,
      shortRecordLimitationEn: `Insufficient inter-annual monthly overlap (${seasonalCellCount} year-month cells across ${sortedYears.length} years) to estimate Seasonal Mann-Kendall variance.`,
      shortRecordLimitationAr: `تداخل شهري بين السنوات غير كافٍ (${seasonalCellCount} خلية شهر-سنة عبر ${sortedYears.length} سنوات) لحساب التباين الموسمي.`,
      direction: 'insufficient_data',
      alpha: 0.05,
      methodUsed: 'Monthly-Aggregated Seasonal Mann-Kendall (Hirsch-Slack 1984) + Sen Slope',
      interpretationEn: `Insufficient inter-annual overlap (${rawCount} valid composites, ${seasonalCellCount} month-cells) for Seasonal Mann-Kendall trend testing.`,
      interpretationAr: `تداخل سنوي غير كافٍ (${rawCount} رصداً صالحاً، ${seasonalCellCount} خلية شهرية) لإجراء اختبار مان-كيندال الموسمي.`,
    };
  }

  const effectiveVarS = totalVarS > 0 ? totalVarS : diagVarS > 0 ? diagVarS : 0;
  const sd = effectiveVarS > 0 ? Math.sqrt(effectiveVarS) : 0;
  const z =
    sd > 0
      ? totalS > 0
        ? (totalS - 1) / sd
        : totalS < 0
          ? (totalS + 1) / sd
          : 0
      : 0;
  const pValue = sd > 0 ? Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(z))))) : 1;
  const slopeYr = median(seasonalSlopes);

  // Gilbert (1987) non-parametric 95% confidence interval for Seasonal Sen's slope
  const sortedSlopes = [...seasonalSlopes].sort((a, b) => a - b);
  const nSlopes = sortedSlopes.length;
  const cAlpha = 1.959964 * sd;
  const m1 = (nSlopes - cAlpha) / 2;
  const m2 = (nSlopes + cAlpha) / 2;
  const idxLow = Math.floor(m1) - 1;
  const idxHigh = Math.ceil(m2);
  let sensSlopeCiLow: number | null = null;
  let sensSlopeCiHigh: number | null = null;
  if (sd === 0 && nSlopes >= 6) {
    sensSlopeCiLow = Number(sortedSlopes[0].toFixed(5));
    sensSlopeCiHigh = Number(sortedSlopes[nSlopes - 1].toFixed(5));
  } else if (nSlopes >= 6 && idxLow >= 0 && idxHigh < nSlopes && idxLow <= idxHigh) {
    sensSlopeCiLow = Number(sortedSlopes[idxLow].toFixed(5));
    sensSlopeCiHigh = Number(sortedSlopes[idxHigh].toFixed(5));
  }

  // Significance gate: Seasonal Mann-Kendall with Hirsch-Slack covariance requires >= 5 years
  const significanceSupported =
    spanYears >= 5.0 && maxYearsPerSeason >= 5 && seasonalSlopes.length >= 24;

  let direction: MannKendallTrendResult['direction'];
  let sensSlopePerDecade: number | null = null;
  let shortRecordLimitationEn: string | null = null;
  let shortRecordLimitationAr: string | null = null;

  const spanFmt = spanYears.toFixed(2);
  const ciFmt =
    sensSlopeCiLow !== null && sensSlopeCiHigh !== null
      ? ` [95% CI: ${sensSlopeCiLow >= 0 ? '+' : ''}${sensSlopeCiLow.toFixed(4)} to ${
          sensSlopeCiHigh >= 0 ? '+' : ''
        }${sensSlopeCiHigh.toFixed(4)}]`
      : ' [95% CI: unbounded for sample size]';
  const slopeFmt = `${slopeYr >= 0 ? '+' : ''}${slopeYr.toFixed(4)} ${unit}/yr`;
  const pFmt = pValue < 0.001 ? '< 0.001' : pValue.toFixed(4);

  let interpretationEn: string;
  let interpretationAr: string;

  if (!significanceSupported) {
    direction = 'inconclusive_short_record';
    sensSlopePerDecade = null; // Never extrapolate <5 yr record to a decade
    shortRecordLimitationEn = `Short-record limitation (${spanFmt} yr, ${sorted[0].date} to ${
      sorted[rawCount - 1].date
    }; ${rawCount} valid composites / ${seasonalCellCount} monthly means): ≥5 years are required for reliable Seasonal Mann-Kendall significance and decadal projection.`;
    shortRecordLimitationAr = `قيد قِصر السلسلة الزمنية (${spanFmt} سنة من ${sorted[0].date} إلى ${
      sorted[rawCount - 1].date
    }؛ ${rawCount} رصداً صالحاً / ${seasonalCellCount} متوسطاً شهرياً): يلزم 5 سنوات فأكثر لاعتماد الدلالة الإحصائية أو التنبؤ العقدي.`;

    interpretationEn = `Short record (${spanFmt} yr < 5 yr min): descriptive inter-annual Sen's slope is ${slopeFmt}${ciFmt} (${rawCount} valid obs, ${seasonalCellCount} month-cells). Significance test underpowered (exploratory p = ${pFmt}).`;
    interpretationAr = `سلسلة زمنية قصيرة (${spanFmt} سنة < 5 سنوات): ميل سين الوصفي بين السنوات ${slopeFmt} (${rawCount} رصداً صالحاً، ${seasonalCellCount} خلية شهرية). اختبار الدلالة غير مكتمل القوة (p استكشافي = ${pFmt}).`;
  } else {
    direction =
      pValue <= 0.05
        ? totalS > 0
          ? 'increasing'
          : totalS < 0
          ? 'decreasing'
          : 'no_significant_trend'
        : 'no_significant_trend';
    sensSlopePerDecade = Number((slopeYr * 10).toFixed(4));
    if (spanYears < 10) {
      shortRecordLimitationEn = `Moderate-length record (${spanFmt} yr < 10 yr): per-decade value is a linear extrapolation beyond observed span.`;
      shortRecordLimitationAr = `سلسلة متوسطة الطول (${spanFmt} سنة < 10 سنوات): القيمة العقدية تمثل امتداداً خطياً يتجاوز مدة الرصد الفعلية.`;
    }
    interpretationEn =
      direction === 'increasing'
        ? `Statistically significant upward inter-annual trend (${slopeFmt}${ciFmt}, Z = ${z.toFixed(2)}, p = ${pFmt}, ${rawCount} valid obs / ${seasonalCellCount} month-cells, ${spanFmt} yr).`
        : direction === 'decreasing'
        ? `Statistically significant downward inter-annual trend (${slopeFmt}${ciFmt}, Z = ${z.toFixed(2)}, p = ${pFmt}, ${rawCount} valid obs / ${seasonalCellCount} month-cells, ${spanFmt} yr).`
        : `No statistically significant monotonic trend at α = 0.05 (Sen's slope ${slopeFmt}${ciFmt}, p = ${pFmt}, ${rawCount} valid obs / ${seasonalCellCount} month-cells, ${spanFmt} yr).`;

    interpretationAr =
      direction === 'increasing'
        ? `اتجاه تصاعدي ذو دلالة إحصائية (${slopeFmt}، Z = ${z.toFixed(2)}، p = ${pFmt}، ${rawCount} رصداً عبر ${spanFmt} سنة).`
        : direction === 'decreasing'
        ? `اتجاه تنازلي ذو دلالة إحصائية (${slopeFmt}، Z = ${z.toFixed(2)}، p = ${pFmt}، ${rawCount} رصداً عبر ${spanFmt} سنة).`
        : `لا يوجد اتجاه أحادي ذو دلالة إحصائية عند α = 0.05 (ميل سين ${slopeFmt}، p = ${pFmt}، ${rawCount} رصداً عبر ${spanFmt} سنة).`;
  }

  return {
    status: 'computed',
    metricName,
    unit,
    sampleCount: rawCount,
    rawSampleCount: rawCount,
    seasonalCellCount,
    distinctYears: sortedYears.length,
    spanYears: Number(spanYears.toFixed(2)),
    dateSpanStart: sorted[0].date,
    dateSpanEnd: sorted[rawCount - 1].date,
    sStatistic: totalS,
    zScore: Number(z.toFixed(3)),
    pValue: Number(pValue.toFixed(5)),
    significanceSupported,
    sensSlopePerYear: Number(slopeYr.toFixed(5)),
    sensSlopeCiLow,
    sensSlopeCiHigh,
    ciLevel: 0.95,
    sensSlopePerDecade,
    shortRecordLimitationEn,
    shortRecordLimitationAr,
    direction,
    alpha: 0.05,
    methodUsed: 'Monthly-Aggregated Seasonal Mann-Kendall (Hirsch-Slack 1984) + Sen Slope',
    interpretationEn,
    interpretationAr,
  };
}

/**
 * Compares the latest 12 months of observations against earlier baseline years.
 */
export function computeBaselineAnomaly(
  points: Array<{ date: string; value: number }>,
  metricName: string,
  unit: string
): BaselineAnomalyResult {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 12) {
    return {
      status: 'insufficient_data',
      metricName,
      unit,
      baselinePeriodLabel: 'N/A',
      comparisonPeriodLabel: 'N/A',
      baselineMean: null,
      baselineStdDev: null,
      comparisonMean: null,
      absoluteDelta: null,
      percentChange: null,
      zScore: null,
      baselineSampleCount: 0,
      comparisonSampleCount: sorted.length,
    };
  }

  const latestDate = new Date(sorted[sorted.length - 1].date);
  const cutoffDate = new Date(latestDate.getTime() - 365 * 24 * 3600 * 1000);
  const baselinePts = sorted.filter((p) => new Date(p.date) < cutoffDate);
  const recentPts = sorted.filter((p) => new Date(p.date) >= cutoffDate);

  if (baselinePts.length < 6 || recentPts.length < 4) {
    return {
      status: 'insufficient_data',
      metricName,
      unit,
      baselinePeriodLabel: 'Insufficient baseline',
      comparisonPeriodLabel: 'Latest 12 months',
      baselineMean: null,
      baselineStdDev: null,
      comparisonMean: null,
      absoluteDelta: null,
      percentChange: null,
      zScore: null,
      baselineSampleCount: baselinePts.length,
      comparisonSampleCount: recentPts.length,
    };
  }

  const bMean = baselinePts.reduce((s, p) => s + p.value, 0) / baselinePts.length;
  const bStd = Math.sqrt(
    baselinePts.reduce((s, p) => s + Math.pow(p.value - bMean, 2), 0) / baselinePts.length
  );
  const cMean = recentPts.reduce((s, p) => s + p.value, 0) / recentPts.length;
  const delta = cMean - bMean;
  const pct = Math.abs(bMean) > 1e-6 ? (delta / Math.abs(bMean)) * 100 : null;
  const z = bStd > 1e-6 ? delta / bStd : null;

  return {
    status: 'computed',
    metricName,
    unit,
    baselinePeriodLabel: `${baselinePts[0].date.slice(0, 7)} → ${baselinePts[baselinePts.length - 1].date.slice(0, 7)}`,
    comparisonPeriodLabel: `${recentPts[0].date.slice(0, 7)} → ${recentPts[recentPts.length - 1].date.slice(0, 7)}`,
    baselineMean: Number(bMean.toFixed(4)),
    baselineStdDev: Number(bStd.toFixed(4)),
    comparisonMean: Number(cMean.toFixed(4)),
    absoluteDelta: Number(delta.toFixed(4)),
    percentChange: pct !== null ? Number(pct.toFixed(2)) : null,
    zScore: z !== null ? Number(z.toFixed(2)) : null,
    baselineSampleCount: baselinePts.length,
    comparisonSampleCount: recentPts.length,
  };
}

/**
 * Computes pixel-by-pixel IGBP land cover transition matrix between baseline & latest MCD12Q1 year
 */
export function computeLandCoverTransitions(
  lc: OrnlLandCoverResult
): {
  baselineYear: number | null;
  latestYear: number | null;
  transitions: LandCoverTransitionEntry[];
  unchangedPercent: number | null;
  changedPercent: number | null;
} {
  const validYears = lc.years.map((y) => y.year).sort((a, b) => a - b);
  if (validYears.length < 2) {
    return {
      baselineYear: validYears[0] ?? null,
      latestYear: validYears[validYears.length - 1] ?? null,
      transitions: [],
      unchangedPercent: null,
      changedPercent: null,
    };
  }

  const baselineYear = validYears[0];
  const latestYear = validYears[validYears.length - 1];
  const baseGrid = lc.pixelGridsByYear[baselineYear] || [];
  const currGrid = lc.pixelGridsByYear[latestYear] || [];
  const n = Math.min(baseGrid.length, currGrid.length);

  const pairCounts = new Map<string, { from: number; to: number; count: number }>();
  let totalValidPairs = 0;
  let changedPixels = 0;

  for (let i = 0; i < n; i++) {
    const f = baseGrid[i];
    const t = currGrid[i];
    if (f < 1 || f > 17 || t < 1 || t > 17) continue;
    totalValidPairs++;
    if (f !== t) changedPixels++;
    const key = `${f}->${t}`;
    const prev = pairCounts.get(key) || { from: f, to: t, count: 0 };
    prev.count++;
    pairCounts.set(key, prev);
  }

  const transitions: LandCoverTransitionEntry[] = Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .map((p) => {
      const fDef = IGBP_LAND_COVER_CLASSES[p.from] || {
        nameEn: `Class ${p.from}`,
        nameAr: `فئة ${p.from}`,
      };
      const tDef = IGBP_LAND_COVER_CLASSES[p.to] || {
        nameEn: `Class ${p.to}`,
        nameAr: `فئة ${p.to}`,
      };
      return {
        fromClassId: p.from,
        fromNameEn: fDef.nameEn,
        fromNameAr: fDef.nameAr,
        toClassId: p.to,
        toNameEn: tDef.nameEn,
        toNameAr: tDef.nameAr,
        pixelCount: p.count,
        percentOfAnalyzedGrid:
          totalValidPairs > 0 ? Number(((p.count / totalValidPairs) * 100).toFixed(1)) : 0,
        isChanged: p.from !== p.to,
      };
    });

  const changedPercent =
    totalValidPairs > 0 ? Number(((changedPixels / totalValidPairs) * 100).toFixed(1)) : null;
  const unchangedPercent = changedPercent !== null ? Number((100 - changedPercent).toFixed(1)) : null;

  return {
    baselineYear,
    latestYear,
    transitions,
    unchangedPercent,
    changedPercent,
  };
}

/**
 * Builds complete, QA-filtered, provenance-rich analysis payload for a study region or custom coordinates
 */
export function buildRegionAnalysisPayload(args: {
  region: StudyRegionDefinition;
  veg: OrnlVegResult | null;
  lc: OrnlLandCoverResult | null;
  lst: OrnlLstResult | null;
  qaFilterMode: 'strict_good' | 'good_and_marginal';
  errors: Array<{ product: string; message: string }>;
}): RegionAnalysisPayload {
  const { region, veg, lc, lst, qaFilterMode, errors } = args;

  // 1. Vegetation (MOD13Q1) — strictly enforce pixel-level and scene-level QA
  const rawVegObs = veg?.observations || [];
  const vegObservationsForMode: ModisVegetationObservation[] = rawVegObs.map((o) => {
    const isStrict = qaFilterMode === 'strict_good';
    const activeNdvi = isStrict ? (o.strictNdvi ?? null) : o.ndvi;
    const activeEvi = isStrict ? (o.strictEvi ?? null) : o.evi;
    const activeNdviStd = isStrict ? (o.strictNdviStdDev ?? null) : o.ndviStdDev;
    const activeEviStd = isStrict ? (o.strictEviStdDev ?? null) : o.eviStdDev;
    const activeValidPx = isStrict ? (o.strictValidPixels ?? 0) : o.validPixels;

    const passed = isStrict
      ? o.pixelReliabilityMode === 0 && o.qualityLabel === 'Good' && activeNdvi !== null && activeValidPx > 0
      : (o.pixelReliabilityMode === 0 || o.pixelReliabilityMode === 1) &&
        (o.qualityLabel === 'Good' || o.qualityLabel === 'Marginal') &&
        activeNdvi !== null &&
        activeValidPx > 0;

    return {
      ...o,
      ndvi: passed ? activeNdvi : null,
      evi: passed ? activeEvi : null,
      ndviStdDev: passed ? activeNdviStd : null,
      eviStdDev: passed ? activeEviStd : null,
      validPixels: passed ? activeValidPx : 0,
      qaPassed: passed,
    };
  });

  const filteredVegObs = vegObservationsForMode.filter((o) => o.qaPassed && o.ndvi !== null);
  const ndviPts = filteredVegObs.map((o) => ({ date: o.date, value: o.ndvi as number }));
  const eviPts = filteredVegObs
    .filter((o) => o.evi !== null)
    .map((o) => ({ date: o.date, value: o.evi as number }));

  const ndviTrend = computeSeasonalMannKendall(ndviPts, 'MODIS NDVI (MOD13Q1)', 'NDVI');
  const eviTrend = computeSeasonalMannKendall(eviPts, 'MODIS EVI (MOD13Q1)', 'EVI');
  const ndviAnomaly = computeBaselineAnomaly(ndviPts, 'MODIS NDVI Anomaly', 'NDVI');

  const vegStatus =
    rawVegObs.length > 0 && filteredVegObs.length > 0
      ? 'verified'
      : errors.some((e) => e.product === 'MOD13Q1')
      ? 'error'
      : 'insufficient_data';

  // 2. Land Cover (MCD12Q1)
  const lcYears = lc?.years || [];
  const lcTrans = lc
    ? computeLandCoverTransitions(lc)
    : {
        baselineYear: null,
        latestYear: null,
        transitions: [],
        unchangedPercent: null,
        changedPercent: null,
      };
  const lcStatus =
    lcYears.length > 0
      ? 'verified'
      : errors.some((e) => e.product === 'MCD12Q1')
      ? 'error'
      : 'insufficient_data';

  // 3. Temperature (MOD11A2) — strictly enforce pixel-level and modal scene-level QA
  const rawLstObs = lst?.observations || [];
  const lstObservationsForMode: ModisLstObservation[] = rawLstObs.map((o) => {
    const isStrict = qaFilterMode === 'strict_good';
    const activeDayC = isStrict ? (o.strictLstDayCelsius ?? null) : o.lstDayCelsius;
    const activeNightC = isStrict ? (o.strictLstNightCelsius ?? null) : o.lstNightCelsius;
    const activeDayPx = isStrict ? (o.strictDayValidPixels ?? 0) : o.dayValidPixels;
    const activeNightPx = isStrict ? (o.strictNightValidPixels ?? 0) : o.nightValidPixels;

    const dayPassed = isStrict
      ? o.dayQualityLabel !== 'Cloud/Invalid' &&
        o.dayQualityLabel !== 'NoData' &&
        activeDayC !== null &&
        activeDayPx > 0
      : (o.qcDayFlag === 0 || o.qcDayFlag === 1) &&
        (o.dayQualityLabel === 'Good' || o.dayQualityLabel === 'OtherQuality') &&
        activeDayC !== null &&
        activeDayPx > 0;

    const nightPassed = isStrict
      ? o.nightQualityLabel !== 'Cloud/Invalid' &&
        o.nightQualityLabel !== 'NoData' &&
        activeNightC !== null &&
        activeNightPx > 0
      : (o.qcNightFlag === 0 || o.qcNightFlag === 1) &&
        (o.nightQualityLabel === 'Good' || o.nightQualityLabel === 'OtherQuality') &&
        activeNightC !== null &&
        activeNightPx > 0;

    const finalDay = dayPassed ? activeDayC : null;
    const finalNight = nightPassed ? activeNightC : null;
    const finalDiurnal =
      finalDay !== null && finalNight !== null ? Number((finalDay - finalNight).toFixed(2)) : null;

    return {
      ...o,
      lstDayCelsius: finalDay,
      lstNightCelsius: finalNight,
      diurnalRangeCelsius: finalDiurnal,
      lstDayKelvin: finalDay !== null ? Number((finalDay + 273.15).toFixed(2)) : null,
      lstNightKelvin: finalNight !== null ? Number((finalNight + 273.15).toFixed(2)) : null,
      dayValidPixels: dayPassed ? activeDayPx : 0,
      nightValidPixels: nightPassed ? activeNightPx : 0,
      qaPassedDay: dayPassed,
      qaPassedNight: nightPassed,
    };
  });

  const validDayLst = lstObservationsForMode
    .filter((o) => o.qaPassedDay && o.lstDayCelsius !== null)
    .map((o) => ({ date: o.date, value: o.lstDayCelsius as number }));
  const validNightLst = lstObservationsForMode
    .filter((o) => o.qaPassedNight && o.lstNightCelsius !== null)
    .map((o) => ({ date: o.date, value: o.lstNightCelsius as number }));

  const dayLstTrend = computeSeasonalMannKendall(validDayLst, 'Daytime LST (MOD11A2)', '°C');
  const nightLstTrend = computeSeasonalMannKendall(validNightLst, 'Nighttime LST (MOD11A2)', '°C');
  const dayLstAnomaly = computeBaselineAnomaly(validDayLst, 'Daytime LST Anomaly', '°C');

  const lstStatus =
    rawLstObs.length > 0 && (validDayLst.length > 0 || validNightLst.length > 0)
      ? 'verified'
      : errors.some((e) => e.product === 'MOD11A2')
      ? 'error'
      : 'insufficient_data';

  // Overall status
  const verifiedCount = [vegStatus, lcStatus, lstStatus].filter((s) => s === 'verified').length;
  const retrievalStatus =
    verifiedCount === 3 ? 'verified' : verifiedCount > 0 ? 'verified' : errors.length > 0 ? 'error' : 'insufficient_data';

  // 4. Evidence-Based Earth Change Story (strictly constructed from QA-filtered verified metrics)
  const story = buildEarthChangeStory({
    region,
    vegStatus,
    filteredVegObs,
    ndviTrend,
    ndviAnomaly,
    lcStatus,
    lcYears,
    lcTrans,
    lstStatus,
    rawLstObs: lstObservationsForMode.filter((o) => o.qaPassedDay && o.lstDayCelsius !== null),
    dayLstTrend,
    dayLstAnomaly,
  });

  const retrievedAt = veg?.retrievedAt || lst?.retrievedAt || lc?.retrievedAt || new Date().toISOString();
  const fromCache = Boolean(veg?.fromCache && lst?.fromCache && lc?.fromCache);

  return {
    region,
    retrievalStatus,
    retrievedAt,
    fromCache,
    errors,
    qaFilterMode,
    vegetation: {
      status: vegStatus,
      productId: 'MOD13Q1.061',
      tile: veg?.tile || null,
      gridRows: veg?.gridRows || 0,
      gridCols: veg?.gridCols || 0,
      cellSizeMeters: veg?.cellSizeMeters || 250,
      totalObservations: rawVegObs.length,
      validObservations: filteredVegObs.length,
      excludedObservations: Math.max(0, rawVegObs.length - filteredVegObs.length),
      qaCoveragePercent:
        rawVegObs.length > 0 ? Number(((filteredVegObs.length / rawVegObs.length) * 100).toFixed(1)) : 0,
      observations: vegObservationsForMode,
      ndviTrend,
      eviTrend,
      ndviAnomaly,
    },
    landCover: {
      status: lcStatus,
      productId: 'MCD12Q1.061',
      tile: lc?.tile || null,
      gridRows: lc?.gridRows || 0,
      gridCols: lc?.gridCols || 0,
      cellSizeMeters: lc?.cellSizeMeters || 500,
      classificationScheme: 'IGBP Type 1 (LC_Type1, Classes 1–17)',
      years: lcYears,
      baselineYear: lcTrans.baselineYear,
      latestYear: lcTrans.latestYear,
      transitions: lcTrans.transitions,
      unchangedPercent: lcTrans.unchangedPercent,
      changedPercent: lcTrans.changedPercent,
      caveatEn:
        'MCD12Q1 operates at 500m resolution and annual cadence. Observed transitions describe IGBP land-cover class shifts across the sampled grid and do not assume every change represents urban expansion.',
      caveatAr:
        'يعمل منتج MCD12Q1 بدقة 500 متر وتكرار سنوي. تعكس المصفوفة تحولات تصنيف الغطاء الأرضي IGBP ولا تفترض أن كل تغير يمثل توسعاً عمرانياً.',
    },
    temperature: {
      status: lstStatus,
      productId: 'MOD11A2.061',
      tile: lst?.tile || null,
      gridRows: lst?.gridRows || 0,
      gridCols: lst?.gridCols || 0,
      cellSizeMeters: lst?.cellSizeMeters || 1000,
      totalObservations: rawLstObs.length,
      validDayObservations: validDayLst.length,
      validNightObservations: validNightLst.length,
      excludedDayObservations: Math.max(0, rawLstObs.length - validDayLst.length),
      observations: lstObservationsForMode,
      dayLstTrend,
      nightLstTrend,
      dayLstAnomaly,
      surfaceVsAirNoteEn:
        'MOD11A2 reports radiative skin Land Surface Temperature (LST) under clear skies — physically distinct from and often hotter/colder than 2m ambient air temperature.',
      surfaceVsAirNoteAr:
        'تقيس بيانات MOD11A2 درجة حرارة السطح الإشعاعية (Skin LST) تحت سماء صافية، وهي تختلف فيزيائياً عن درجة حرارة الهواء الجوي.',
    },
    story,
    provenance: {
      apiProvider: 'NASA / ORNL DAAC MODIS Global Subsets REST API v1 + NASA EOSDIS GIBS WMTS',
      modisGridSampleCount: `MOD13Q1: ${veg?.gridRows || 0}×${veg?.gridCols || 0} (250m) | MCD12Q1: ${lc?.gridRows || 0}×${lc?.gridCols || 0} (500m) | MOD11A2: ${lst?.gridRows || 0}×${lst?.gridCols || 0} (1km)`,
      transformationsApplied: [
        `MOD13Q1 (${qaFilterMode}): Excluded fill (-3000), decoded Pixel Reliability & VI_Quality bitmasks (MODLAND, mixed/adjacent cloud, snow/ice, shadow, high aerosol), rejected missing QA, and scaled DN × 0.0001.`,
        'MCD12Q1: Excluded fill (255) & QC fill pixels; mapped IGBP LC_Type1 integers (1–17); computed pixel-by-pixel transition matrix.',
        `MOD11A2 (${qaFilterMode}): Excluded fill (0) & DN < 7500; decoded QC_Day/QC_Night mandatory & LST error bits (6–7) + Clear_sky_days/nights bitmasks; scaled DN × 0.02 - 273.15 to °C.`,
        'Time-series analytics: Aggregated valid composites to monthly means (≤1 per Year-Month) to eliminate intra-year comparisons, computed Hirsch-Slack (1984) Seasonal Mann-Kendall variance & Gilbert (1987) 95% Sen slope CIs, and withheld formal significance/decadal extrapolation for records < 5 years.',
      ],
      epistemicBoundaries: [
        {
          tier: 'raw_satellite',
          labelEn: '1. Raw Satellite Product',
          labelAr: '1. بيانات القمر الصناعي الخام',
          descriptionEn: 'Official NASA LP DAAC MOD13Q1, MCD12Q1, MOD11A2 Collection 6.1 HDF/GeoTIFF integer values.',
          descriptionAr: 'قيم المنتجات الرسمية من ناسا قبل التحويل.',
        },
        {
          tier: 'processed_measurement',
          labelEn: '2. Processed Physical Measurement',
          labelAr: '2. قياسات فيزيائية معالجة',
          descriptionEn: 'QA-filtered scaled NDVI/EVI ratios, °C skin surface temperatures, and IGBP class shares.',
          descriptionAr: 'مؤشرات NDVI/EVI ودرجة حرارة السطح بالدرجة المئوية وفئات الغطاء الأرضي بعد تصفية الجودة.',
        },
        {
          tier: 'calculated_indicator',
          labelEn: '3. Calculated Statistical Indicator',
          labelAr: '3. مؤشرات إحصائية محسوبة',
          descriptionEn: 'Monthly-aggregated Seasonal Mann-Kendall (Hirsch-Slack 1984), Sen’s slope + 95% CI, baseline z-scores, and transition percentages.',
          descriptionAr: 'نتائج اختبار مان-كيندال الموسمي، ميل سين مع مجال الثقة، والانحراف المعياري عن خط الأساس.',
        },
        {
          tier: 'analytical_interpretation',
          labelEn: '4. Analytical Interpretation',
          labelAr: '4. التفسير العلمي التحليلي',
          descriptionEn: 'Contextual diagnosis of vegetation stress, thermal anomalies, or land-cover shifts with stated short-record and spatial caveats.',
          descriptionAr: 'تفسير التغير البيئي مع توضيح قيود الدقة المكانية والمدة الزمنية والتمييز بين حرارة السطح والهواء.',
        },
        {
          tier: 'suggested_action',
          labelEn: '5. Suggested Circular Action',
          labelAr: '5. الإجراء الميداني المقترح',
          descriptionEn: 'Prioritized waste interception and route guidance combining NASA context with Cycle crowd reports.',
          descriptionAr: 'توصيات تجميع وتدوير مبنية على دمج مؤشرات ناسا مع بلاغات مجتمع سايكل.',
        },
      ],
    },
  };
}

function buildEarthChangeStory(args: {
  region: StudyRegionDefinition;
  vegStatus: string;
  filteredVegObs: ModisVegetationObservation[];
  ndviTrend: MannKendallTrendResult;
  ndviAnomaly: BaselineAnomalyResult;
  lcStatus: string;
  lcYears: any[];
  lcTrans: ReturnType<typeof computeLandCoverTransitions>;
  lstStatus: string;
  rawLstObs: ModisLstObservation[];
  dayLstTrend: MannKendallTrendResult;
  dayLstAnomaly: BaselineAnomalyResult;
}): EarthChangeStory {
  const { region, vegStatus, filteredVegObs, ndviTrend, ndviAnomaly, lcStatus, lcYears, lcTrans, lstStatus, rawLstObs, dayLstTrend, dayLstAnomaly } =
    args;

  if (vegStatus !== 'verified' && lcStatus !== 'verified' && lstStatus !== 'verified') {
    return {
      id: `story-${region.id}`,
      regionId: region.id,
      regionNameEn: region.nameEn,
      regionNameAr: region.nameAr,
      status: 'insufficient_data',
      titleEn: `Awaiting verified NASA observations for ${region.nameEn}`,
      titleAr: `بانتظار رصد موثق من ناسا لمنطقة ${region.nameAr}`,
      summaryEn: 'Not enough QA-valid MODIS records were retrieved to generate a factual change narrative.',
      summaryAr: 'لم يتوفر عدد كافٍ من الأرصاد الموثقة لإنشاء قصة تغير بيئي قائمة على الأدلة.',
      evidenceItems: [],
      uncertaintyNoteEn: 'Cycle refuses to fabricate environmental narratives without retrieved satellite records.',
      uncertaintyNoteAr: 'لا تعرض منصة سايكل أي استنتاجات غير مدعومة بأرصاد فضائية فعلية.',
    };
  }

  const evidenceItems: EarthChangeStory['evidenceItems'] = [];
  const sentencesEn: string[] = [];
  const sentencesAr: string[] = [];

  if (vegStatus === 'verified' && filteredVegObs.length > 0) {
    const latestVeg = filteredVegObs[filteredVegObs.length - 1];
    const span = `${filteredVegObs[0].date} → ${latestVeg.date}`;
    evidenceItems.push({
      tier: 'processed_measurement',
      datasetId: 'MOD13Q1.061',
      metricLabelEn: 'Latest QA-Valid Mean NDVI',
      metricLabelAr: 'أحدث متوسط NDVI صالح',
      valueFormatted: latestVeg.ndvi !== null ? latestVeg.ndvi.toFixed(4) : 'N/A',
      dateRange: latestVeg.date,
    });

    if (ndviTrend.status === 'computed' && ndviTrend.sensSlopePerYear !== null) {
      evidenceItems.push({
        tier: 'calculated_indicator',
        datasetId: 'MOD13Q1.061',
        metricLabelEn: ndviTrend.significanceSupported
          ? 'Seasonal Mann-Kendall NDVI Slope'
          : 'Exploratory Inter-Annual NDVI Slope (<5 yr)',
        metricLabelAr: 'اتجاه الغطاء النباتي (مان-كيندال)',
        valueFormatted: `${ndviTrend.sensSlopePerYear >= 0 ? '+' : ''}${ndviTrend.sensSlopePerYear.toFixed(4)} / yr (${
          ndviTrend.significanceSupported ? `p=${ndviTrend.pValue?.toFixed(3)}` : `n=${ndviTrend.sampleCount}, <5yr`
        })`,
        dateRange: span,
      });
      sentencesEn.push(`MOD13Q1 250m vegetation monitoring (${filteredVegObs.length} QA-filtered scenes) shows ${ndviTrend.interpretationEn}`);
      sentencesAr.push(`تُظهر مراقبة الغطاء النباتي MOD13Q1 بدقة 250م (${filteredVegObs.length} رصداً موثقاً) ${ndviTrend.interpretationAr}`);
    }
    if (ndviAnomaly.status === 'computed' && ndviAnomaly.absoluteDelta !== null) {
      sentencesEn.push(
        `Recent 12-month mean NDVI (${ndviAnomaly.comparisonMean?.toFixed(3)}) differs by ${ndviAnomaly.absoluteDelta >= 0 ? '+' : ''}${ndviAnomaly.absoluteDelta.toFixed(3)} compared to the ${ndviAnomaly.baselinePeriodLabel} baseline.`
      );
      sentencesAr.push(
        `يختلف متوسط NDVI خلال آخر 12 شهراً (${ndviAnomaly.comparisonMean?.toFixed(3)}) بمقدار ${ndviAnomaly.absoluteDelta >= 0 ? '+' : ''}${ndviAnomaly.absoluteDelta.toFixed(3)} عن خط الأساس.`
      );
    }
  }

  if (lcStatus === 'verified' && lcYears.length >= 2) {
    const latestLc = lcYears[lcYears.length - 1];
    evidenceItems.push({
      tier: 'processed_measurement',
      datasetId: 'MCD12Q1.061',
      metricLabelEn: `Dominant IGBP Class (${latestLc.year})`,
      metricLabelAr: `الغلاف السائد (${latestLc.year})`,
      valueFormatted: `${latestLc.dominantClassNameEn} (${latestLc.classes[0]?.percent ?? 0}%)`,
      dateRange: `${lcTrans.baselineYear} → ${lcTrans.latestYear}`,
    });

    const changedOnly = lcTrans.transitions.filter((t) => t.isChanged);
    if (changedOnly.length > 0) {
      const topChange = changedOnly[0];
      sentencesEn.push(
        `Across the 500m MCD12Q1 grid (${lcTrans.baselineYear}–${lcTrans.latestYear}), ${lcTrans.changedPercent}% of pixels shifted IGBP class, led by ${topChange.fromNameEn} → ${topChange.toNameEn} (${topChange.percentOfAnalyzedGrid}% of grid).`
      );
      sentencesAr.push(
        `على شبكة MCD12Q1 بدقة 500م (${lcTrans.baselineYear}–${lcTrans.latestYear})، تغير تصنيف ${lcTrans.changedPercent}% من البكسلات، أبرزها تحول ${topChange.fromNameAr} إلى ${topChange.toNameAr} بنسبة ${topChange.percentOfAnalyzedGrid}%.`
      );
    } else {
      sentencesEn.push(
        `Across the 500m MCD12Q1 grid (${lcTrans.baselineYear}–${lcTrans.latestYear}), ${lcTrans.unchangedPercent ?? 100}% of pixels retained their IGBP classification (${latestLc.dominantClassNameEn}).`
      );
      sentencesAr.push(
        `حافظ ${lcTrans.unchangedPercent ?? 100}% من شبكة MCD12Q1 بدقة 500م (${lcTrans.baselineYear}–${lcTrans.latestYear}) على تصنيفه (${latestLc.dominantClassNameAr}).`
      );
    }
  }

  if (lstStatus === 'verified' && rawLstObs.length > 0) {
    const validLst = rawLstObs.filter((o) => o.lstDayCelsius !== null);
    if (validLst.length > 0) {
      const latest = validLst[validLst.length - 1];
      evidenceItems.push({
        tier: 'processed_measurement',
        datasetId: 'MOD11A2.061',
        metricLabelEn: 'Latest 8-Day Daytime Surface Temp',
        metricLabelAr: 'أحدث حرارة سطح نهارية',
        valueFormatted: `${latest.lstDayCelsius?.toFixed(1)} °C (${latest.date})`,
        dateRange: `${validLst[0].date} → ${latest.date}`,
      });
      if (dayLstAnomaly.status === 'computed' && dayLstAnomaly.absoluteDelta !== null) {
        sentencesEn.push(
          `Clear-sky daytime Land Surface Temperature averaged ${dayLstAnomaly.comparisonMean?.toFixed(1)}°C over the past year (${dayLstAnomaly.absoluteDelta >= 0 ? '+' : ''}${dayLstAnomaly.absoluteDelta.toFixed(2)}°C vs baseline).`
        );
        sentencesAr.push(
          `بلغ متوسط حرارة السطح النهارية الصافية ${dayLstAnomaly.comparisonMean?.toFixed(1)}°م خلال العام الماضي (بفارق ${dayLstAnomaly.absoluteDelta >= 0 ? '+' : ''}${dayLstAnomaly.absoluteDelta.toFixed(2)}°م عن الأساس).`
        );
      } else if (dayLstTrend.status === 'computed' && dayLstTrend.sensSlopePerYear !== null) {
        sentencesEn.push(`Daytime surface temperature trend: ${dayLstTrend.interpretationEn}`);
      }
    }
  }

  return {
    id: `story-${region.id}`,
    regionId: region.id,
    regionNameEn: region.nameEn,
    regionNameAr: region.nameAr,
    status: 'verified',
    titleEn: `Satellite Environmental Profile: ${region.nameEn}`,
    titleAr: `سجل التغير الفضائي الموثق: ${region.nameAr}`,
    summaryEn: sentencesEn.join(' '),
    summaryAr: sentencesAr.join(' '),
    evidenceItems,
    uncertaintyNoteEn: region.resolutionCaveatEn,
    uncertaintyNoteAr: region.resolutionCaveatAr,
  };
}

/**
 * Connects verified NASA environmental observations to Cycle's real Firestore reports & organizations.
 * Strictly separates Satellite Context from Ground Plastic Reports and labels the priority heuristic as experimental.
 */
export function buildEnvironmentalActionInsights(args: {
  regions: StudyRegionDefinition[];
  analysesByRegion: Record<string, RegionAnalysisPayload>;
  reports: PlasticReport[];
  organizations: Array<{ id: string; name: string; orgType?: string; location?: string }>;
}): ActionInsightMatch[] {
  const { regions, analysesByRegion, reports, organizations } = args;

  return regions.map((region) => {
    const analysis = analysesByRegion[region.id];

    // Match Cycle reports & organizations to this region strictly via location keywords or coordinates
    const matchedReports = reports.filter((r) => {
      const loc = (r.location || '').toLowerCase();
      return region.keywords.some((kw) => loc.includes(kw.toLowerCase()));
    });

    const availableReports = matchedReports.filter((r) => r.status === 'Available' || r.status === 'In discussion');
    let totalWeightKg = 0;
    const polymerCounts = new Map<PlasticType, number>();

    for (const r of matchedReports) {
      const qty = Number(r.quantity) || 0;
      const kg = r.unit === 'tons' ? qty * 1000 : r.unit === 'pieces' ? qty * 0.04 : qty;
      totalWeightKg += kg;
      polymerCounts.set(r.plasticType, (polymerCounts.get(r.plasticType) || 0) + kg);
    }

    const dominantPolymers = Array.from(polymerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p]) => p);

    const nearbyOrgs = organizations
      .filter((o) => {
        const loc = (o.location || '').toLowerCase();
        return region.keywords.some((kw) => loc.includes(kw.toLowerCase()));
      })
      .map((o) => ({
        id: o.id,
        name: o.name,
        orgType: o.orgType || 'Recycler',
        location: o.location || region.governorateEn,
      }));

    // Extract verified QA-filtered environmental indicators
    const validVeg = analysis?.vegetation.observations.filter((o) => o.qaPassed !== false && o.ndvi !== null) || [];
    const latestNdvi = validVeg.length > 0 ? validVeg[validVeg.length - 1].ndvi : null;
    const validLst =
      analysis?.temperature.observations.filter((o) => o.qaPassedDay !== false && o.lstDayCelsius !== null) || [];
    const latestDayLstCelsius = validLst.length > 0 ? validLst[validLst.length - 1].lstDayCelsius : null;
    const lstAnomalyCelsius = analysis?.temperature.dayLstAnomaly.absoluteDelta ?? null;
    const latestLc =
      analysis?.landCover.years && analysis.landCover.years.length > 0
        ? analysis.landCover.years[analysis.landCover.years.length - 1]
        : null;
    const urbanEntry = latestLc?.classes.find((c) => c.classId === 13);
    const builtUpPercent = urbanEntry ? urbanEntry.percent : 0;

    // Experimental operational coordination score (transparently disclosed!)
    let compositeScore: number | null = null;
    let priorityLevel: ActionInsightMatch['priorityLevel'] = 'Unranked';

    if (analysis && analysis.retrievalStatus === 'verified') {
      const volumeComponent = Math.min(40, (Math.log10(totalWeightKg + 1) / 4) * 40);
      const thermalComponent =
        latestDayLstCelsius !== null ? Math.min(25, Math.max(0, ((latestDayLstCelsius - 20) / 30) * 25)) : 0;
      const urbanComponent = (builtUpPercent / 100) * 20;
      const gapComponent = matchedReports.length > 0 && nearbyOrgs.length === 0 ? 15 : matchedReports.length > 0 ? 6 : 0;
      compositeScore = Number((volumeComponent + thermalComponent + urbanComponent + gapComponent).toFixed(1));
      priorityLevel = compositeScore >= 65 ? 'High' : compositeScore >= 35 ? 'Medium' : 'Low';
    }

    const recommendedActionsEn: string[] = [];
    const recommendedActionsAr: string[] = [];

    if (availableReports.length > 0) {
      recommendedActionsEn.push(
        `Dispatch collection for ${availableReports.length} open Cycle report(s) totaling ${Math.round(totalWeightKg).toLocaleString()} kg in ${region.governorateEn}.`
      );
      recommendedActionsAr.push(
        `توجيه مسار جمع لعدد ${availableReports.length} بلاغات نشطة بإجمالي ${Math.round(totalWeightKg).toLocaleString()} كجم في ${region.governorateAr}.`
      );
    } else {
      recommendedActionsEn.push(
        `No uncollected reports currently logged in ${region.governorateEn}; maintain community awareness campaigns.`
      );
      recommendedActionsAr.push(
        `لا توجد بلاغات معلقة حالياً في ${region.governorateAr}؛ يوصى بمواصلة التوعية الميدانية.`
      );
    }

    if (latestDayLstCelsius !== null && latestDayLstCelsius >= 38) {
      recommendedActionsEn.push(
        `High radiative surface heat (${latestDayLstCelsius.toFixed(1)}°C MODIS LST) accelerates polymer weathering outdoors—prioritize covered storage & prompt pickup.`
      );
      recommendedActionsAr.push(
        `ارتفاع حرارة السطح (${latestDayLstCelsius.toFixed(1)}°م عبر MODIS LST) يسرّع تفتت البلاستيك المكشوف—يُوصى بالتخزين المظلل وسرعة السحب.`
      );
    }

    if (latestLc?.dominantClassId === 12) {
      recommendedActionsEn.push(
        `Cropland-dominated corridor (MCD12Q1): prevent plastic film/packaging runoff near irrigation canals.`
      );
      recommendedActionsAr.push(
        `نطاق زراعي سائد (MCD12Q1): الأولوية لحماية قنوات الري والتربة من تسرب الرقائق والعبوات البلاستيكية.`
      );
    }

    return {
      regionId: region.id,
      regionNameEn: region.nameEn,
      regionNameAr: region.nameAr,
      center: region.center,
      environmentalContextStatus: analysis ? analysis.retrievalStatus : 'pending',
      environmentalIndicators: {
        latestNdvi,
        ndviTrendDirection: analysis?.vegetation.ndviTrend.direction || 'insufficient_data',
        latestDayLstCelsius,
        lstAnomalyCelsius,
        dominantLandCoverEn: latestLc?.dominantClassNameEn ?? null,
        dominantLandCoverAr: latestLc?.dominantClassNameAr ?? null,
        builtUpPercent: latestLc ? builtUpPercent : null,
      },
      cycleGroundData: {
        matchedReportsCount: matchedReports.length,
        availableReportsCount: availableReports.length,
        totalReportedWeightKg: Math.round(totalWeightKg),
        dominantPolymers,
        matchedReportIds: matchedReports.map((r) => r.id),
        nearbyOrganizationsCount: nearbyOrgs.length,
        nearbyOrganizations: nearbyOrgs,
      },
      compositePriorityScore: compositeScore,
      priorityLevel,
      formulaDisclosureEn:
        'Experimental Operational Heuristic (0–100): 40% Cycle Reported Waste Volume + 25% MODIS Daytime Surface Heat + 20% MCD12Q1 Built-Up Share + 15% Local Recycler Gap. Satellite pixels provide environmental context and do not detect plastic waste.',
      formulaDisclosureAr:
        'مؤشر تشغيلي تجريبي (0–100): 40% حجم البلاغات + 25% حرارة السطح MODIS + 20% نسبة العمران MCD12Q1 + 15% فجوة التغطية. الأقمار لا ترصد البلاستيك مباشرة بل توفر السياق البيئي.',
      recommendedActionsEn,
      recommendedActionsAr,
    };
  });
}
