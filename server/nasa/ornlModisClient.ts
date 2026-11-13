import fs from 'fs';
import path from 'path';
import {
  ModisVegetationObservation,
  ModisLandCoverYearRecord,
  ModisLstObservation,
} from '../../src/types';
import { IGBP_LAND_COVER_CLASSES } from './nasaCatalog';

const ORNL_BASE = 'https://modis.ornl.gov/rst/api/v1';
const CACHE_DIR = path.join(process.cwd(), '.nasa-cache', 'ornl');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for historical NASA V061 archives

function ensureCacheDir() {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {
    // non-fatal
  }
}

const inFlightRequests = new Map<string, Promise<any>>();

// Global concurrency limiter so simultaneous MOD13Q1 + MCD12Q1 + MOD11A2 calls do not saturate ORNL DAAC
let activeOrnlFetches = 0;
const ornlQueue: Array<() => void> = [];
const MAX_GLOBAL_ORNL_CONCURRENCY = 4;

async function withOrnlSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeOrnlFetches >= MAX_GLOBAL_ORNL_CONCURRENCY) {
    await new Promise<void>((resolve) => ornlQueue.push(resolve));
  }
  activeOrnlFetches++;
  try {
    return await fn();
  } finally {
    activeOrnlFetches--;
    const next = ornlQueue.shift();
    if (next) next();
  }
}

async function fetchJsonWithRetry(url: string, retries = 3): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await withOrnlSlot(() =>
        fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'Cycle-EarthIntelligence/2.0' },
          signal: controller.signal,
        })
      );

      if (res.status === 429 || res.status >= 500) {
        const waitMs = 800 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        lastErr = new Error(`ORNL API HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`ORNL API HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      return await res.json();
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 700 * Math.pow(2, attempt)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Failed to fetch from ORNL DAAC MODIS API');
}

interface OrnlDateEntry {
  modis_date: string;
  calendar_date: string;
}

async function getProductDates(
  product: 'MOD13Q1' | 'MCD12Q1' | 'MOD11A2',
  lat: number,
  lng: number
): Promise<OrnlDateEntry[]> {
  const url = `${ORNL_BASE}/${product}/dates?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`;
  const json = await fetchJsonWithRetry(url);
  return Array.isArray(json?.dates) ? json.dates : [];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function parseDoyFromModisDate(modisDate: string): number {
  const doy = parseInt(modisDate.slice(5, 8), 10);
  return Number.isFinite(doy) ? doy : 1;
}

function readDiskCache<T>(cacheKey: string): { data: T; retrievedAt: string } | null {
  try {
    const file = path.join(CACHE_DIR, `${cacheKey}.json`);
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!raw?.retrievedAt || !raw?.data) return null;
    const age = Date.now() - new Date(raw.retrievedAt).getTime();
    if (age > CACHE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeDiskCache(cacheKey: string, data: any) {
  try {
    ensureCacheDir();
    const file = path.join(CACHE_DIR, `${cacheKey}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({ retrievedAt: new Date().toISOString(), data }),
      'utf8'
    );
  } catch {
    // non-fatal
  }
}

export interface OrnlVegResult {
  tile: string | null;
  gridRows: number;
  gridCols: number;
  cellSizeMeters: number;
  observations: ModisVegetationObservation[];
  retrievedAt: string;
  fromCache: boolean;
}

function decodeMod13q1ViQuality(viQual: number | undefined): {
  decoded: boolean;
  modland: number;
  aerosol: number;
  adjCloud: boolean;
  mixedCloud: boolean;
  snowIce: boolean;
  shadow: boolean;
} | null {
  if (viQual === undefined || viQual === null || !Number.isFinite(viQual) || viQual < 0) {
    return null;
  }
  return {
    decoded: true,
    modland: viQual & 0b11,
    aerosol: (viQual >> 6) & 0b11,
    adjCloud: ((viQual >> 8) & 1) === 1,
    mixedCloud: ((viQual >> 10) & 1) === 1,
    snowIce: ((viQual >> 14) & 1) === 1,
    shadow: ((viQual >> 15) & 1) === 1,
  };
}

function popcount8(val: number): number {
  let x = val & 0xff;
  let c = 0;
  while (x > 0) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

export async function fetchMod13q1Series(
  lat: number,
  lng: number,
  options?: { startYear?: number; endYear?: number }
): Promise<OrnlVegResult> {
  const startYear = options?.startYear ?? 2022;
  const endYear = options?.endYear ?? new Date().getUTCFullYear();
  // Versioned v2 cache key preserves existing v1 cache files untouched
  const cacheKey = `mod13q1_v2_${lat.toFixed(3)}_${lng.toFixed(3)}_${startYear}_${endYear}`;

  const cached = readDiskCache<Omit<OrnlVegResult, 'fromCache'>>(cacheKey);
  if (cached) {
    return { ...cached.data, retrievedAt: cached.retrievedAt, fromCache: true };
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async (): Promise<OrnlVegResult> => {
    try {
      const allDates = await getProductDates('MOD13Q1', lat, lng);
      const filteredDates = allDates.filter((d) => {
        const yr = parseInt(d.calendar_date.slice(0, 4), 10);
        return yr >= startYear && yr <= endYear;
      });

      if (filteredDates.length === 0) {
        return {
          tile: null,
          gridRows: 0,
          gridCols: 0,
          cellSizeMeters: 250,
          observations: [],
          retrievedAt: new Date().toISOString(),
          fromCache: false,
        };
      }

      // Chunk into batches of 10 dates (ORNL API max 10 dates per /subset call)
      const chunks: OrnlDateEntry[][] = [];
      for (let i = 0; i < filteredDates.length; i += 10) {
        chunks.push(filteredDates.slice(i, i + 10));
      }

      const chunkResponses = await mapWithConcurrency(chunks, 3, async (chunk) => {
        const sDate = chunk[0].modis_date;
        const eDate = chunk[chunk.length - 1].modis_date;
        const url = `${ORNL_BASE}/MOD13Q1/subset?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(
          4
        )}&startDate=${sDate}&endDate=${eDate}&kmAboveBelow=1&kmLeftRight=1`;
        return fetchJsonWithRetry(url);
      });

      const byDate = new Map<
        string,
        {
          calendarDate: string;
          tile: string;
          ndviArr?: number[];
          eviArr?: number[];
          qaArr?: number[];
          viQualArr?: number[];
        }
      >();

      let gridRows = 0;
      let gridCols = 0;
      let cellSizeMeters = 231.66;
      let tile: string | null = null;

      for (const resp of chunkResponses) {
        if (!resp?.subset) continue;
        gridRows = resp.nrows || gridRows;
        gridCols = resp.ncols || gridCols;
        cellSizeMeters = Number(resp.cellsize) || cellSizeMeters;

        for (const item of resp.subset) {
          if (!tile && item.tile) tile = item.tile;
          let entry = byDate.get(item.modis_date);
          if (!entry) {
            entry = {
              calendarDate: item.calendar_date,
              tile: item.tile || '',
            };
          }
          if (item.band === '250m_16_days_NDVI') entry.ndviArr = item.data;
          else if (item.band === '250m_16_days_EVI') entry.eviArr = item.data;
          else if (item.band === '250m_16_days_pixel_reliability') entry.qaArr = item.data;
          else if (item.band === '250m_16_days_VI_Quality') entry.viQualArr = item.data;
          byDate.set(item.modis_date, entry);
        }
      }

      const observations: ModisVegetationObservation[] = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([modisDate, rec]) => {
          const ndviRaw = rec.ndviArr || [];
          const eviRaw = rec.eviArr || [];
          const qaRaw = rec.qaArr || [];
          const viQualRaw = rec.viQualArr || [];
          const n = Math.max(ndviRaw.length, eviRaw.length);

          const validNdvi: number[] = [];
          const validEvi: number[] = [];
          const strictNdviList: number[] = [];
          const strictEviList: number[] = [];
          const qaCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
          let hasViQual = false;

          for (let i = 0; i < n; i++) {
            const qa = qaRaw[i];
            if (qa >= 0 && qa <= 3) qaCounts[qa] = (qaCounts[qa] || 0) + 1;

            const viq = decodeMod13q1ViQuality(viQualRaw[i]);
            if (viq) hasViQual = true;

            // Missing QA (undefined, -1, out of range) is NEVER accepted
            const isGoodOrMarginalRel = qa === 0 || qa === 1;
            const isStrictGoodRel = qa === 0;

            const passesBitGoodMarginal =
              !viq || (viq.modland <= 1 && !viq.mixedCloud && !viq.snowIce);
            const passesBitStrictGood =
              !viq ||
              (viq.modland === 0 &&
                !viq.mixedCloud &&
                !viq.adjCloud &&
                !viq.snowIce &&
                !viq.shadow &&
                viq.aerosol < 3);

            const nVal = ndviRaw[i];
            const eVal = eviRaw[i];

            if (nVal !== undefined && nVal !== -3000 && nVal >= -2000 && nVal <= 10000) {
              if (isGoodOrMarginalRel && passesBitGoodMarginal) {
                validNdvi.push(nVal * 0.0001);
              }
              if (isStrictGoodRel && passesBitStrictGood) {
                strictNdviList.push(nVal * 0.0001);
              }
            }
            if (eVal !== undefined && eVal !== -3000 && eVal >= -2000 && eVal <= 10000) {
              if (isGoodOrMarginalRel && passesBitGoodMarginal) {
                validEvi.push(eVal * 0.0001);
              }
              if (isStrictGoodRel && passesBitStrictGood) {
                strictEviList.push(eVal * 0.0001);
              }
            }
          }

          // Conservative tie-break: worst QA wins ties (3 > 2 > 1 > 0)
          let modeQa: number | null = null;
          let maxCount = 0;
          for (const k of [3, 2, 1, 0]) {
            const c = qaCounts[k] || 0;
            if (c > maxCount) {
              maxCount = c;
              modeQa = k;
            }
          }

          const qualityLabel: ModisVegetationObservation['qualityLabel'] =
            modeQa === null
              ? 'NoData'
              : modeQa === 0
              ? 'Good'
              : modeQa === 1
              ? 'Marginal'
              : modeQa === 2
              ? 'Snow/Ice'
              : 'Cloudy';

          const calcMean = (arr: number[]) =>
            arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(4)) : null;
          const calcStd = (arr: number[], m: number | null) =>
            m !== null && arr.length > 1
              ? Number(Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length).toFixed(4))
              : null;

          const meanNdvi = calcMean(validNdvi);
          const meanEvi = calcMean(validEvi);
          const strictNdvi = calcMean(strictNdviList);
          const strictEvi = calcMean(strictEviList);

          return {
            modisDate,
            date: rec.calendarDate,
            dayOfYear: parseDoyFromModisDate(modisDate),
            ndvi: meanNdvi,
            evi: meanEvi,
            ndviStdDev: calcStd(validNdvi, meanNdvi),
            eviStdDev: calcStd(validEvi, meanEvi),
            validPixels: validNdvi.length,
            totalPixels: n,
            pixelReliabilityMode: modeQa,
            qualityLabel,
            strictNdvi,
            strictEvi,
            strictNdviStdDev: calcStd(strictNdviList, strictNdvi),
            strictEviStdDev: calcStd(strictEviList, strictEvi),
            strictValidPixels: strictNdviList.length,
            goodPixels: qaCounts[0] || 0,
            marginalPixels: qaCounts[1] || 0,
            cloudyPixels: qaCounts[3] || 0,
            viQualityDecoded: hasViQual,
            tile: rec.tile || tile || '',
          };
        });

      const payload = {
        tile,
        gridRows,
        gridCols,
        cellSizeMeters: Number(cellSizeMeters.toFixed(2)),
        observations,
      };
      writeDiskCache(cacheKey, payload);
      return { ...payload, retrievedAt: new Date().toISOString(), fromCache: false };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export interface OrnlLandCoverResult {
  tile: string | null;
  gridRows: number;
  gridCols: number;
  cellSizeMeters: number;
  years: ModisLandCoverYearRecord[];
  pixelGridsByYear: Record<number, number[]>;
  retrievedAt: string;
  fromCache: boolean;
}

export async function fetchMcd12q1Series(
  lat: number,
  lng: number,
  options?: { startYear?: number; endYear?: number }
): Promise<OrnlLandCoverResult> {
  const startYear = options?.startYear ?? 2016;
  const endYear = options?.endYear ?? 2025;
  const cacheKey = `mcd12q1_v2_${lat.toFixed(3)}_${lng.toFixed(3)}_${startYear}_${endYear}`;

  const cached = readDiskCache<Omit<OrnlLandCoverResult, 'fromCache'>>(cacheKey);
  if (cached) {
    return { ...cached.data, retrievedAt: cached.retrievedAt, fromCache: true };
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async (): Promise<OrnlLandCoverResult> => {
    try {
      const allDates = await getProductDates('MCD12Q1', lat, lng);
      const filteredDates = allDates.filter((d) => {
        const yr = parseInt(d.calendar_date.slice(0, 4), 10);
        return yr >= startYear && yr <= endYear;
      });

      if (filteredDates.length === 0) {
        return {
          tile: null,
          gridRows: 0,
          gridCols: 0,
          cellSizeMeters: 500,
          years: [],
          pixelGridsByYear: {},
          retrievedAt: new Date().toISOString(),
          fromCache: false,
        };
      }

      const chunks: OrnlDateEntry[][] = [];
      for (let i = 0; i < filteredDates.length; i += 10) {
        chunks.push(filteredDates.slice(i, i + 10));
      }

      const chunkResponses = await mapWithConcurrency(chunks, 2, async (chunk) => {
        const sDate = chunk[0].modis_date;
        const eDate = chunk[chunk.length - 1].modis_date;
        const url = `${ORNL_BASE}/MCD12Q1/subset?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(
          4
        )}&startDate=${sDate}&endDate=${eDate}&kmAboveBelow=2&kmLeftRight=2`;
        return fetchJsonWithRetry(url);
      });

      const byDate = new Map<
        string,
        {
          calendarDate: string;
          tile: string;
          lcType1?: number[];
          assessment?: number[];
          qc?: number[];
        }
      >();

      let gridRows = 0;
      let gridCols = 0;
      let cellSizeMeters = 463.31;
      let tile: string | null = null;

      for (const resp of chunkResponses) {
        if (!resp?.subset) continue;
        gridRows = resp.nrows || gridRows;
        gridCols = resp.ncols || gridCols;
        cellSizeMeters = Number(resp.cellsize) || cellSizeMeters;

        for (const item of resp.subset) {
          if (!tile && item.tile) tile = item.tile;
          let entry = byDate.get(item.modis_date);
          if (!entry) {
            entry = {
              calendarDate: item.calendar_date,
              tile: item.tile || '',
            };
          }
          if (item.band === 'LC_Type1') entry.lcType1 = item.data;
          else if (item.band === 'LC_Prop1_Assessment') entry.assessment = item.data;
          else if (item.band === 'QC') entry.qc = item.data;
          byDate.set(item.modis_date, entry);
        }
      }

      const pixelGridsByYear: Record<number, number[]> = {};
      const years: ModisLandCoverYearRecord[] = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([modisDate, rec]) => {
          const year = parseInt(rec.calendarDate.slice(0, 4), 10);
          const pixels = rec.lcType1 || [];
          const assess = rec.assessment || [];
          const qcArr = rec.qc || [];
          const hasQc = qcArr.length > 0;
          const sanitizedPixels: number[] = [];

          const counts = new Map<number, number>();
          let validPixels = 0;
          let qcValidPixels = 0;
          let assessSum = 0;
          let assessCount = 0;

          for (let i = 0; i < pixels.length; i++) {
            const cls = pixels[i];
            const qcVal = qcArr[i];
            const qcOk = !hasQc || (qcVal !== undefined && qcVal !== 255);
            if (qcOk && cls >= 1 && cls <= 17) {
              qcValidPixels++;
              validPixels++;
              counts.set(cls, (counts.get(cls) || 0) + 1);
              sanitizedPixels.push(cls);
            } else {
              sanitizedPixels.push(255);
            }
            const a = assess[i];
            if (qcOk && a !== undefined && a >= 0 && a <= 100) {
              assessSum += a;
              assessCount++;
            }
          }
          pixelGridsByYear[year] = sanitizedPixels;

          const classes = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([classId, pixelCount]) => {
              const def = IGBP_LAND_COVER_CLASSES[classId] || {
                nameEn: `Class ${classId}`,
                nameAr: `فئة ${classId}`,
                color: '#64748b',
              };
              return {
                classId,
                nameEn: def.nameEn,
                nameAr: def.nameAr,
                color: def.color,
                pixelCount,
                percent: validPixels > 0 ? Number(((pixelCount / validPixels) * 100).toFixed(1)) : 0,
              };
            });

          const dominant = classes[0];
          return {
            modisDate,
            year,
            date: rec.calendarDate,
            totalPixels: pixels.length,
            validPixels,
            qcValidPixels: hasQc ? qcValidPixels : undefined,
            qcProcessed: hasQc,
            meanAssessmentPercent: assessCount > 0 ? Number((assessSum / assessCount).toFixed(1)) : null,
            dominantClassId: dominant ? dominant.classId : null,
            dominantClassNameEn: dominant ? dominant.nameEn : 'No Data',
            dominantClassNameAr: dominant ? dominant.nameAr : 'لا توجد بيانات',
            classes,
            tile: rec.tile || tile || '',
          };
        });

      const payload = {
        tile,
        gridRows,
        gridCols,
        cellSizeMeters: Number(cellSizeMeters.toFixed(2)),
        years,
        pixelGridsByYear,
      };
      writeDiskCache(cacheKey, payload);
      return { ...payload, retrievedAt: new Date().toISOString(), fromCache: false };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export interface OrnlLstResult {
  tile: string | null;
  gridRows: number;
  gridCols: number;
  cellSizeMeters: number;
  observations: ModisLstObservation[];
  retrievedAt: string;
  fromCache: boolean;
}

function decodeLstQcQuality(qcVal: number | undefined): {
  flag: number | null;
  label: 'Good' | 'OtherQuality' | 'Cloud/Invalid' | 'NoData';
  emisErrorClass: number | null;
  lstErrorClass: number | null;
  lstErrorMaxK: number | null;
} {
  if (qcVal === undefined || qcVal === null || !Number.isFinite(qcVal) || qcVal < 0) {
    return {
      flag: null,
      label: 'NoData',
      emisErrorClass: null,
      lstErrorClass: null,
      lstErrorMaxK: null,
    };
  }
  const mandatoryBits = qcVal & 0b11;
  const emisErrorClass = (qcVal >> 4) & 0b11;
  const lstErrorClass = (qcVal >> 6) & 0b11;
  const lstErrorMaxK =
    lstErrorClass === 0 ? 1 : lstErrorClass === 1 ? 2 : lstErrorClass === 2 ? 3 : 4;

  if (mandatoryBits === 0) {
    return { flag: 0, label: 'Good', emisErrorClass, lstErrorClass, lstErrorMaxK };
  }
  if (mandatoryBits === 1) {
    return { flag: 1, label: 'OtherQuality', emisErrorClass, lstErrorClass, lstErrorMaxK };
  }
  return { flag: mandatoryBits, label: 'Cloud/Invalid', emisErrorClass, lstErrorClass, lstErrorMaxK };
}

function conservativeModalFlag(flags: number[]): number | null {
  if (flags.length === 0) return null;
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const f of flags) {
    if (f >= 0 && f <= 3) counts[f] = (counts[f] || 0) + 1;
  }
  let bestFlag: number | null = null;
  let bestCount = 0;
  // Tie-break conservatively (3 > 2 > 1 > 0)
  for (const k of [3, 2, 1, 0]) {
    if (counts[k] > bestCount) {
      bestCount = counts[k];
      bestFlag = k;
    }
  }
  return bestFlag;
}

export async function fetchMod11a2Series(
  lat: number,
  lng: number,
  options?: { startYear?: number; endYear?: number }
): Promise<OrnlLstResult> {
  const startYear = options?.startYear ?? 2023;
  const endYear = options?.endYear ?? new Date().getUTCFullYear();
  const cacheKey = `mod11a2_v2_${lat.toFixed(3)}_${lng.toFixed(3)}_${startYear}_${endYear}`;

  const cached = readDiskCache<Omit<OrnlLstResult, 'fromCache'>>(cacheKey);
  if (cached) {
    return { ...cached.data, retrievedAt: cached.retrievedAt, fromCache: true };
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async (): Promise<OrnlLstResult> => {
    try {
      const allDates = await getProductDates('MOD11A2', lat, lng);
      const filteredDates = allDates.filter((d) => {
        const yr = parseInt(d.calendar_date.slice(0, 4), 10);
        return yr >= startYear && yr <= endYear;
      });

      if (filteredDates.length === 0) {
        return {
          tile: null,
          gridRows: 0,
          gridCols: 0,
          cellSizeMeters: 1000,
          observations: [],
          retrievedAt: new Date().toISOString(),
          fromCache: false,
        };
      }

      const chunks: OrnlDateEntry[][] = [];
      for (let i = 0; i < filteredDates.length; i += 10) {
        chunks.push(filteredDates.slice(i, i + 10));
      }

      const chunkResponses = await mapWithConcurrency(chunks, 3, async (chunk) => {
        const sDate = chunk[0].modis_date;
        const eDate = chunk[chunk.length - 1].modis_date;
        const url = `${ORNL_BASE}/MOD11A2/subset?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(
          4
        )}&startDate=${sDate}&endDate=${eDate}&kmAboveBelow=1&kmLeftRight=1`;
        return fetchJsonWithRetry(url);
      });

      const byDate = new Map<
        string,
        {
          calendarDate: string;
          tile: string;
          lstDay?: number[];
          lstNight?: number[];
          qcDay?: number[];
          qcNight?: number[];
          clearSkyDays?: number[];
          clearSkyNights?: number[];
        }
      >();

      let gridRows = 0;
      let gridCols = 0;
      let cellSizeMeters = 926.63;
      let tile: string | null = null;

      for (const resp of chunkResponses) {
        if (!resp?.subset) continue;
        gridRows = resp.nrows || gridRows;
        gridCols = resp.ncols || gridCols;
        cellSizeMeters = Number(resp.cellsize) || cellSizeMeters;

        for (const item of resp.subset) {
          if (!tile && item.tile) tile = item.tile;
          let entry = byDate.get(item.modis_date);
          if (!entry) {
            entry = {
              calendarDate: item.calendar_date,
              tile: item.tile || '',
            };
          }
          if (item.band === 'LST_Day_1km') entry.lstDay = item.data;
          else if (item.band === 'LST_Night_1km') entry.lstNight = item.data;
          else if (item.band === 'QC_Day') entry.qcDay = item.data;
          else if (item.band === 'QC_Night') entry.qcNight = item.data;
          else if (item.band === 'Clear_sky_days') entry.clearSkyDays = item.data;
          else if (item.band === 'Clear_sky_nights') entry.clearSkyNights = item.data;
          byDate.set(item.modis_date, entry);
        }
      }

      const observations: ModisLstObservation[] = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([modisDate, rec]) => {
          const dayRaw = rec.lstDay || [];
          const nightRaw = rec.lstNight || [];
          const qcDayArr = rec.qcDay || [];
          const qcNightArr = rec.qcNight || [];
          const csDayArr = rec.clearSkyDays || [];
          const csNightArr = rec.clearSkyNights || [];
          const n = Math.max(dayRaw.length, nightRaw.length);

          const validDayK: number[] = [];
          const validNightK: number[] = [];
          const strictDayK: number[] = [];
          const strictNightK: number[] = [];
          const dayFlags: number[] = [];
          const nightFlags: number[] = [];
          const dayErrsK: number[] = [];
          const nightErrsK: number[] = [];
          const csDayCounts: number[] = [];
          const csNightCounts: number[] = [];
          let dayGoodPixels = 0;
          let dayOtherPixels = 0;
          let nightGoodPixels = 0;
          let nightOtherPixels = 0;

          for (let i = 0; i < n; i++) {
            const dDn = dayRaw[i];
            const dQc = decodeLstQcQuality(qcDayArr[i]);
            if (dQc.flag !== null) {
              dayFlags.push(dQc.flag);
              if (dQc.flag === 0) dayGoodPixels++;
              else if (dQc.flag === 1) dayOtherPixels++;
            }
            const dValidDn = dDn !== undefined && dDn !== 0 && dDn >= 7500 && dDn <= 65535;
            if (
              dValidDn &&
              dQc.flag !== null &&
              dQc.flag <= 1 &&
              dQc.lstErrorClass !== null &&
              dQc.lstErrorClass <= 2
            ) {
              validDayK.push(dDn * 0.02);
              if (dQc.lstErrorMaxK !== null) dayErrsK.push(dQc.lstErrorMaxK);
              if (dQc.flag === 0 && dQc.lstErrorClass <= 1) {
                strictDayK.push(dDn * 0.02);
              }
              if (csDayArr[i] !== undefined && csDayArr[i] >= 0) {
                csDayCounts.push(popcount8(csDayArr[i]));
              }
            }

            const nDn = nightRaw[i];
            const nQc = decodeLstQcQuality(qcNightArr[i]);
            if (nQc.flag !== null) {
              nightFlags.push(nQc.flag);
              if (nQc.flag === 0) nightGoodPixels++;
              else if (nQc.flag === 1) nightOtherPixels++;
            }
            const nValidDn = nDn !== undefined && nDn !== 0 && nDn >= 7500 && nDn <= 65535;
            if (
              nValidDn &&
              nQc.flag !== null &&
              nQc.flag <= 1 &&
              nQc.lstErrorClass !== null &&
              nQc.lstErrorClass <= 2
            ) {
              validNightK.push(nDn * 0.02);
              if (nQc.lstErrorMaxK !== null) nightErrsK.push(nQc.lstErrorMaxK);
              if (nQc.flag === 0 && nQc.lstErrorClass <= 1) {
                strictNightK.push(nDn * 0.02);
              }
              if (csNightArr[i] !== undefined && csNightArr[i] >= 0) {
                csNightCounts.push(popcount8(csNightArr[i]));
              }
            }
          }

          const meanK = (arr: number[]) =>
            arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
          const kToC = (k: number | null) => (k !== null ? Number((k - 273.15).toFixed(2)) : null);

          const meanDayK = meanK(validDayK);
          const meanNightK = meanK(validNightK);
          const strictMeanDayK = meanK(strictDayK);
          const strictMeanNightK = meanK(strictNightK);

          const lstDayCelsius = kToC(meanDayK);
          const lstNightCelsius = kToC(meanNightK);
          const strictLstDayCelsius = kToC(strictMeanDayK);
          const strictLstNightCelsius = kToC(strictMeanNightK);

          const diurnalRangeCelsius =
            lstDayCelsius !== null && lstNightCelsius !== null
              ? Number((lstDayCelsius - lstNightCelsius).toFixed(2))
              : null;

          // Modal QA flag across all pixels with conservative tie-break (not optimistic includes(0))
          const modalDayQc = conservativeModalFlag(dayFlags);
          const modalNightQc = conservativeModalFlag(nightFlags);

          const dayQualityLabel: ModisLstObservation['dayQualityLabel'] =
            modalDayQc === 0
              ? 'Good'
              : modalDayQc === 1
              ? 'OtherQuality'
              : modalDayQc !== null
              ? 'Cloud/Invalid'
              : 'NoData';

          const nightQualityLabel: ModisLstObservation['nightQualityLabel'] =
            modalNightQc === 0
              ? 'Good'
              : modalNightQc === 1
              ? 'OtherQuality'
              : modalNightQc !== null
              ? 'Cloud/Invalid'
              : 'NoData';

          return {
            modisDate,
            date: rec.calendarDate,
            dayOfYear: parseDoyFromModisDate(modisDate),
            lstDayCelsius,
            lstNightCelsius,
            diurnalRangeCelsius,
            lstDayKelvin: meanDayK !== null ? Number(meanDayK.toFixed(2)) : null,
            lstNightKelvin: meanNightK !== null ? Number(meanNightK.toFixed(2)) : null,
            dayValidPixels: validDayK.length,
            nightValidPixels: validNightK.length,
            totalPixels: n,
            qcDayFlag: modalDayQc,
            qcNightFlag: modalNightQc,
            dayQualityLabel,
            nightQualityLabel,
            strictLstDayCelsius,
            strictLstNightCelsius,
            strictDayValidPixels: strictDayK.length,
            strictNightValidPixels: strictNightK.length,
            dayGoodPixels,
            dayOtherQualityPixels: dayOtherPixels,
            nightGoodPixels,
            nightOtherQualityPixels: nightOtherPixels,
            dayLstErrorMaxK: dayErrsK.length > 0 ? Math.max(...dayErrsK) : null,
            nightLstErrorMaxK: nightErrsK.length > 0 ? Math.max(...nightErrsK) : null,
            clearSkyDayCountMean:
              csDayCounts.length > 0
                ? Number((csDayCounts.reduce((s, v) => s + v, 0) / csDayCounts.length).toFixed(1))
                : null,
            clearSkyNightCountMean:
              csNightCounts.length > 0
                ? Number((csNightCounts.reduce((s, v) => s + v, 0) / csNightCounts.length).toFixed(1))
                : null,
            tile: rec.tile || tile || '',
          };
        });

      const payload = {
        tile,
        gridRows,
        gridCols,
        cellSizeMeters: Number(cellSizeMeters.toFixed(2)),
        observations,
      };
      writeDiskCache(cacheKey, payload);
      return { ...payload, retrievedAt: new Date().toISOString(), fromCache: false };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
