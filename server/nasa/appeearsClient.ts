import fs from 'fs';
import path from 'path';
import { AppEEARSTaskRecord, AppEEARSRasterFileSummary } from '../../src/types';
import { processRasterBuffer } from './rasterProcessor';

const APPEEARS_BASE = 'https://appeears.earthdatacloud.nasa.gov/api';
const APPEEARS_CACHE_DIR = path.join(process.cwd(), '.nasa-cache', 'appeears');
const TASKS_INDEX_FILE = path.join(APPEEARS_CACHE_DIR, 'tasks.json');

let cachedBearerToken: string | null = null;
let tokenExpiresAt = 0;

function ensureAppeearsDirs() {
  try {
    fs.mkdirSync(path.join(APPEEARS_CACHE_DIR, 'bundles'), { recursive: true });
  } catch {
    // non-fatal
  }
}

function loadSavedTasks(): AppEEARSTaskRecord[] {
  try {
    if (!fs.existsSync(TASKS_INDEX_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(TASKS_INDEX_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: AppEEARSTaskRecord[]) {
  try {
    ensureAppeearsDirs();
    fs.writeFileSync(TASKS_INDEX_FILE, JSON.stringify(tasks.slice(0, 50), null, 2), 'utf8');
  } catch {
    // non-fatal
  }
}

export function getAppeearsAuthConfig(): {
  configured: boolean;
  authMode: 'bearer_token' | 'username_password' | 'unconfigured';
} {
  if (process.env.EARTHDATA_TOKEN && process.env.EARTHDATA_TOKEN.trim().length > 10) {
    return { configured: true, authMode: 'bearer_token' };
  }
  if (
    process.env.EARTHDATA_USERNAME &&
    process.env.EARTHDATA_PASSWORD &&
    process.env.EARTHDATA_USERNAME.trim().length > 0 &&
    process.env.EARTHDATA_PASSWORD.trim().length > 0
  ) {
    return { configured: true, authMode: 'username_password' };
  }
  return { configured: false, authMode: 'unconfigured' };
}

async function getAppeearsBearerToken(): Promise<string | null> {
  const cfg = getAppeearsAuthConfig();
  if (!cfg.configured) return null;

  if (cfg.authMode === 'bearer_token') {
    return process.env.EARTHDATA_TOKEN!.trim();
  }

  if (cachedBearerToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedBearerToken;
  }

  const creds = Buffer.from(
    `${process.env.EARTHDATA_USERNAME!.trim()}:${process.env.EARTHDATA_PASSWORD!.trim()}`
  ).toString('base64');

  const resp = await fetch(`${APPEEARS_BASE}/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    throw new Error(`AppEEARS authentication failed (HTTP ${resp.status})`);
  }
  const data = await resp.json();
  if (!data?.token) {
    throw new Error('AppEEARS login response did not contain a bearer token.');
  }
  cachedBearerToken = data.token;
  tokenExpiresAt = data.expiration ? new Date(data.expiration).getTime() : Date.now() + 24 * 3600_000;
  return cachedBearerToken;
}

export function getAppeearsOverviewStatus() {
  const auth = getAppeearsAuthConfig();
  return {
    configured: auth.configured,
    authMode: auth.authMode,
    endpoint: APPEEARS_BASE,
    supportedProducts: ['MOD13Q1.061', 'MCD12Q1.061', 'MOD11A2.061'],
    supportedFormats: ['geotiff', 'netcdf4'] as Array<'geotiff' | 'netcdf4'>,
    tasks: loadSavedTasks(),
  };
}

export interface SubmitAppeearsJobInput {
  taskName: string;
  taskType: 'area' | 'point';
  products: Array<{ product: string; layer: string }>;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  outputFormat: 'geotiff' | 'netcdf4';
  bbox?: [number, number, number, number]; // [west, south, east, north]
  point?: { latitude: number; longitude: number };
}

export async function submitAppeearsTask(input: SubmitAppeearsJobInput): Promise<AppEEARSTaskRecord> {
  const auth = getAppeearsAuthConfig();
  const tasks = loadSavedTasks();

  // Duplicate submission guard: reuse identical active/completed task
  const existing = tasks.find(
    (t) =>
      t.status !== 'error' &&
      t.status !== 'requires_configuration' &&
      t.taskType === input.taskType &&
      t.startDate === input.startDate &&
      t.endDate === input.endDate &&
      t.outputFormat === input.outputFormat &&
      JSON.stringify(t.products) === JSON.stringify(input.products) &&
      JSON.stringify(t.bbox || null) === JSON.stringify(input.bbox || null) &&
      JSON.stringify(t.point || null) === JSON.stringify(input.point || null)
  );
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();

  // Honest unconfigured state when server-side Earthdata Login is not present
  if (!auth.configured) {
    return {
      taskId: `unconfigured_${Date.now()}`,
      taskName: input.taskName,
      status: 'requires_configuration',
      taskType: input.taskType,
      products: input.products,
      startDate: input.startDate,
      endDate: input.endDate,
      outputFormat: input.outputFormat,
      bbox: input.bbox,
      point: input.point,
      createdAt: nowIso,
      updatedAt: nowIso,
      errorMessage:
        'Live AppEEARS job submission requires server-side NASA Earthdata Login credentials (EARTHDATA_TOKEN or EARTHDATA_USERNAME + EARTHDATA_PASSWORD). Quantitative MODIS data in Cycle continues working via the public NASA/ORNL DAAC MODIS API, and you can also inspect downloaded GeoTIFF/NetCDF4 files directly.',
    };
  }

  const token = await getAppeearsBearerToken();
  const mmddyyyy = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${m}-${d}-${y}`;
  };

  const payload: any = {
    task_type: input.taskType,
    task_name: input.taskName,
    params: {
      dates: [
        {
          startDate: mmddyyyy(input.startDate),
          endDate: mmddyyyy(input.endDate),
        },
      ],
      layers: input.products.map((p) => ({ product: p.product, layer: p.layer })),
      output: {
        format: {
          type: input.outputFormat,
        },
        projection: 'geographic',
      },
    },
  };

  if (input.taskType === 'area' && input.bbox) {
    const [west, south, east, north] = input.bbox;
    payload.params.geo = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
              ],
            ],
          },
        },
      ],
    };
  } else if (input.point) {
    payload.params.coordinates = [
      {
        id: 'cycle-point-1',
        latitude: input.point.latitude,
        longitude: input.point.longitude,
        category: 'CycleStudyPoint',
      },
    ];
  }

  const resp = await fetch(`${APPEEARS_BASE}/task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`AppEEARS task submission failed (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
  }

  const json = await resp.json();
  const record: AppEEARSTaskRecord = {
    taskId: json.task_id,
    taskName: input.taskName,
    status: (json.status as any) || 'pending',
    taskType: input.taskType,
    products: input.products,
    startDate: input.startDate,
    endDate: input.endDate,
    outputFormat: input.outputFormat,
    bbox: input.bbox,
    point: input.point,
    createdAt: nowIso,
    updatedAt: nowIso,
    progressPercent: 5,
  };

  tasks.unshift(record);
  saveTasks(tasks);
  return record;
}

export async function pollAndProcessAppeearsTask(taskId: string): Promise<AppEEARSTaskRecord> {
  const tasks = loadSavedTasks();
  const idx = tasks.findIndex((t) => t.taskId === taskId);
  if (idx === -1) {
    throw new Error(`Task '${taskId}' not found in local AppEEARS task registry.`);
  }

  const record = tasks[idx];
  const token = await getAppeearsBearerToken();
  if (!token) {
    throw new Error('NASA Earthdata credentials not configured on server.');
  }

  const statusResp = await fetch(`${APPEEARS_BASE}/task/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!statusResp.ok) {
    throw new Error(`AppEEARS status check failed (HTTP ${statusResp.status})`);
  }
  const statusJson = await statusResp.json();
  record.status = statusJson.status || record.status;
  record.updatedAt = new Date().toISOString();

  if (record.status === 'done' && !record.processedSummaries) {
    const bundleResp = await fetch(`${APPEEARS_BASE}/bundle/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (bundleResp.ok) {
      const bundleJson = await bundleResp.json();
      const files: Array<{ file_id: string; file_name: string; file_size: number; file_type: string }> =
        Array.isArray(bundleJson?.files) ? bundleJson.files : [];
      record.bundleFiles = files;

      const rasterFiles = files
        .filter((f) => /\.(tif|tiff|nc|nc4)$/i.test(f.file_name))
        .slice(0, 6);

      const bundleDir = path.join(APPEEARS_CACHE_DIR, 'bundles', taskId);
      fs.mkdirSync(bundleDir, { recursive: true });

      const summaries: AppEEARSRasterFileSummary[] = [];
      for (const rf of rasterFiles) {
        try {
          const dlResp = await fetch(
            `${APPEEARS_BASE}/bundle/${encodeURIComponent(taskId)}/${encodeURIComponent(rf.file_id)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!dlResp.ok) continue;
          const ab = await dlResp.arrayBuffer();
          const buf = Buffer.from(ab);
          const safeName = path.basename(rf.file_name);
          fs.writeFileSync(path.join(bundleDir, safeName), buf);

          const matchingProd = record.products.find((p) =>
            safeName.toUpperCase().includes(p.product.split('.')[0])
          );
          const parsed = await processRasterBuffer(buf, safeName, {
            productId: matchingProd?.product,
            layerName: matchingProd?.layer || safeName,
          });
          summaries.push(parsed);
        } catch (fileErr: any) {
          summaries.push({
            fileName: rf.file_name,
            format: 'other',
            sizeBytes: rf.file_size || 0,
            crs: null,
            bbox: null,
            dimensions: null,
            noDataValue: null,
            scaleFactorApplied: null,
            addOffsetApplied: null,
            units: null,
            variables: [],
            warnings: [`Failed downloading/parsing bundle file: ${fileErr?.message}`],
          });
        }
      }
      record.processedSummaries = summaries;
    }
  }

  tasks[idx] = record;
  saveTasks(tasks);
  return record;
}

/**
 * Allows direct verification/inspection of a GeoTIFF or NetCDF4 file buffer
 * using the exact AppEEARS raster ingestion pipeline (CRS, NoData, scaling, QA stats).
 */
export async function inspectUploadedRasterFile(
  base64Content: string,
  fileName: string,
  productHint?: string
): Promise<AppEEARSRasterFileSummary> {
  const cleanB64 = base64Content.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanB64, 'base64');
  return processRasterBuffer(buffer, fileName, { productId: productHint, layerName: fileName });
}
