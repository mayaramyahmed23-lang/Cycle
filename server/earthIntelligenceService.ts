import {
  EarthIntelligenceOverviewResponse,
  RegionAnalysisPayload,
  StudyRegionDefinition,
  ActionInsightMatch,
  PlasticReport,
} from '../src/types';
import {
  EGYPT_STUDY_REGIONS,
  NASA_DATASET_CATALOG,
  NASA_GIBS_LAYERS,
} from './nasa/nasaCatalog';
import {
  fetchMod13q1Series,
  fetchMcd12q1Series,
  fetchMod11a2Series,
} from './nasa/ornlModisClient';
import {
  buildRegionAnalysisPayload,
  buildEnvironmentalActionInsights,
} from './nasa/analyticsEngine';
import { getAppeearsOverviewStatus } from './nasa/appeearsClient';

const inMemoryRegionCache = new Map<string, RegionAnalysisPayload>();

export async function analyzeLocation(params: {
  regionId?: string;
  lat?: number;
  lng?: number;
  customName?: string;
  startYear?: number;
  endYear?: number;
  qaFilterMode?: 'strict_good' | 'good_and_marginal';
}): Promise<RegionAnalysisPayload> {
  const qaFilterMode = params.qaFilterMode === 'strict_good' ? 'strict_good' : 'good_and_marginal';

  let region: StudyRegionDefinition | undefined;
  if (params.regionId) {
    region = EGYPT_STUDY_REGIONS.find((r) => r.id === params.regionId);
  }

  if (!region && typeof params.lat === 'number' && typeof params.lng === 'number') {
    const lat = Math.max(-85, Math.min(85, params.lat));
    const lng = Math.max(-180, Math.min(180, params.lng));
    const label = (params.customName || '').trim() || `Global Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
    region = {
      id: `custom_${lat.toFixed(3)}_${lng.toFixed(3)}`,
      nameEn: label,
      nameAr: label,
      governorateEn: 'Global Custom AOI',
      governorateAr: 'نطاق عالمي مخصص',
      countryCode: 'GLOBAL',
      isEgyptCaseStudy: false,
      isCustom: true,
      center: [lat, lng],
      bounds: [
        [lat - 0.08, lng - 0.08],
        [lat + 0.08, lng + 0.08],
      ],
      descriptionEn: `On-demand NASA MODIS V061 + GIBS analysis centered at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°.`,
      descriptionAr: `تحليل فوري من بيانات ناسا MODIS V061 و GIBS عند الإحداثيات ${lat.toFixed(4)}°، ${lng.toFixed(4)}°.`,
      resolutionCaveatEn:
        'Custom coordinate analysis samples ~2km around center (250m MOD13Q1, 500m MCD12Q1, 1km MOD11A2).',
      resolutionCaveatAr:
        'يغطي التحليل المخصص نطاق ~2 كم حول المركز بدقات 250م و 500م و 1كم.',
      keywords: [label.toLowerCase()],
    };
  }

  if (!region) {
    region = EGYPT_STUDY_REGIONS[0];
  }

  const startYear = params.startYear ?? 2022;
  const endYear = params.endYear ?? new Date().getUTCFullYear();
  const memKey = `${region.id}_${startYear}_${endYear}_${qaFilterMode}`;

  const [lat, lng] = region.center;
  const errors: Array<{ product: string; message: string }> = [];

  const [vegRes, lcRes, lstRes] = await Promise.all([
    fetchMod13q1Series(lat, lng, { startYear, endYear }).catch((err) => {
      errors.push({ product: 'MOD13Q1', message: err?.message || 'Failed retrieving MOD13Q1' });
      return null;
    }),
    fetchMcd12q1Series(lat, lng, {
      startYear: Math.min(2016, startYear),
      endYear: Math.max(2024, endYear),
    }).catch((err) => {
      errors.push({ product: 'MCD12Q1', message: err?.message || 'Failed retrieving MCD12Q1' });
      return null;
    }),
    fetchMod11a2Series(lat, lng, {
      startYear: Math.max(startYear, endYear - 3),
      endYear,
    }).catch((err) => {
      errors.push({ product: 'MOD11A2', message: err?.message || 'Failed retrieving MOD11A2' });
      return null;
    }),
  ]);

  const payload = buildRegionAnalysisPayload({
    region,
    veg: vegRes,
    lc: lcRes,
    lst: lstRes,
    qaFilterMode,
    errors,
  });

  if (payload.retrievalStatus === 'verified') {
    inMemoryRegionCache.set(memKey, payload);
    if (qaFilterMode === 'good_and_marginal') {
      inMemoryRegionCache.set(region.id, payload);
    }
  }
  return payload;
}

export async function getEarthIntelligenceOverview(
  regionId = 'cairo-urban-core',
  qaFilterMode: 'strict_good' | 'good_and_marginal' = 'good_and_marginal'
): Promise<EarthIntelligenceOverviewResponse> {
  const appeears = getAppeearsOverviewStatus();
  const initialRegionAnalysis = await analyzeLocation({
    regionId,
    qaFilterMode,
  });

  return {
    regions: EGYPT_STUDY_REGIONS,
    datasetCatalog: NASA_DATASET_CATALOG,
    gibsLayers: NASA_GIBS_LAYERS,
    appeearsStatus: {
      configured: appeears.configured,
      authMode: appeears.authMode,
      endpoint: appeears.endpoint,
      supportedProducts: appeears.supportedProducts,
      supportedFormats: appeears.supportedFormats,
    },
    initialRegionAnalysis,
  };
}

export async function getActionInsightsForRegions(args: {
  reports: PlasticReport[];
  organizations: Array<{ id: string; name: string; orgType?: string; location?: string }>;
  ensureRegionIds?: string[];
}): Promise<ActionInsightMatch[]> {
  const targetIds = args.ensureRegionIds?.length
    ? args.ensureRegionIds
    : EGYPT_STUDY_REGIONS.map((r) => r.id);

  // Fetch/warm up to 3 uncached regions gently if needed; use cache for any already retrieved
  const missingIds = targetIds.filter((id) => !inMemoryRegionCache.has(id));
  if (missingIds.length > 0) {
    await Promise.all(
      missingIds.slice(0, 7).map((id) =>
        analyzeLocation({ regionId: id, qaFilterMode: 'good_and_marginal' }).catch(() => null)
      )
    );
  }

  const analysesByRegion: Record<string, RegionAnalysisPayload> = {};
  for (const r of EGYPT_STUDY_REGIONS) {
    const cached = inMemoryRegionCache.get(r.id);
    if (cached) analysesByRegion[r.id] = cached;
  }

  return buildEnvironmentalActionInsights({
    regions: EGYPT_STUDY_REGIONS,
    analysesByRegion,
    reports: args.reports,
    organizations: args.organizations,
  });
}
