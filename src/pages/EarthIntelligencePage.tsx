import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import {
  ActionInsightMatch,
  EarthIntelligenceOverviewResponse,
  PlasticReport,
  RegionAnalysisPayload,
} from '../types';
import { EarthIntelligenceMap } from '../components/EarthIntelligenceMap';
import { ModisVegetationChart } from '../components/ModisVegetationChart';
import { ModisLstAndLandCoverPanel } from '../components/earth/ModisLstAndLandCoverPanel';
import { ActionAndStoriesPanel } from '../components/earth/ActionAndStoriesPanel';
import { AppeearsPipelinePanel } from '../components/earth/AppeearsPipelinePanel';
import { ProvenanceTransparencyPanel } from '../components/earth/ProvenanceTransparencyPanel';
import {
  Globe2,
  MapPin,
  Activity,
  Thermometer,
  Recycle,
  Database,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface EarthIntelligencePageProps {
  reports: PlasticReport[];
  onNavigateToReports?: () => void;
  onNavigateToRoutes?: () => void;
}

type WorkbenchTab =
  | 'engine'
  | 'vegetation'
  | 'thermal-landcover'
  | 'actions'
  | 'appeears'
  | 'provenance';

const GLOBAL_PRESETS = [
  { label: 'Amazon Basin (-3.46, -62.21)', lat: -3.4653, lng: -62.2159, name: 'Amazon Rainforest Basin' },
  { label: 'London Urban Core (51.51, -0.13)', lat: 51.5074, lng: -0.1278, name: 'London Urban Core' },
  { label: 'Tokyo Bay (35.68, 139.65)', lat: 35.6762, lng: 139.6503, name: 'Tokyo Metropolitan Basin' },
];

export const EarthIntelligencePage: React.FC<EarthIntelligencePageProps> = ({
  reports,
  onNavigateToReports,
  onNavigateToRoutes,
}) => {
  const { language } = useLanguage();

  const [overview, setOverview] = useState<EarthIntelligenceOverviewResponse | null>(null);
  const [analysis, setAnalysis] = useState<RegionAnalysisPayload | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WorkbenchTab>('engine');
  const [qaFilterMode, setQaFilterMode] = useState<'good_and_marginal' | 'strict_good'>(
    'good_and_marginal'
  );

  // Global custom coordinate form
  const [customLat, setCustomLat] = useState('30.0444');
  const [customLng, setCustomLng] = useState('31.2357');
  const [customName, setCustomName] = useState('');

  // Organizations & Action Insights
  const [organizations, setOrganizations] = useState<
    Array<{ id: string; name: string; orgType?: string; location?: string }>
  >([]);
  const [actionInsights, setActionInsights] = useState<ActionInsightMatch[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Initial load of NASA overview + Firestore organizations
  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoadingInitial(true);
      setError(null);
      try {
        const [ovResp, orgSnap] = await Promise.all([
          fetch('/api/earth-intelligence/overview?regionId=cairo-urban-core'),
          getDocs(collection(db, 'organizations')).catch(() => null),
        ]);
        if (!ovResp.ok) {
          throw new Error(`HTTP ${ovResp.status} while querying NASA MODIS overview`);
        }
        const ovJson = await ovResp.json();
        if (!ovJson.success || !ovJson.data) {
          throw new Error(ovJson.error || 'Malformed NASA Earth Intelligence response');
        }
        if (!active) return;
        setOverview(ovJson.data);
        setAnalysis(ovJson.data.initialRegionAnalysis);

        const orgList: Array<{ id: string; name: string; orgType?: string; location?: string }> = [];
        if (orgSnap) {
          orgSnap.forEach((d) => {
            const data = d.data() as any;
            if (data?.status !== 'disabled') {
              orgList.push({
                id: d.id,
                name: data?.name || 'Organization',
                orgType: data?.orgType || 'Recycler',
                location: data?.location || '',
              });
            }
          });
        }
        setOrganizations(orgList);
      } catch (err: any) {
        if (active) setError(err?.message || 'Unable to load NASA Earth Observation datasets');
      } finally {
        if (active) setLoadingInitial(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  // Load/refresh Action Insights when reports or organizations update
  const loadActionInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const resp = await fetch('/api/earth-intelligence/action-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports,
          organizations,
        }),
      });
      const json = await resp.json();
      if (resp.ok && json.success && Array.isArray(json.data)) {
        setActionInsights(json.data);
      }
    } catch {
      // keep existing insights
    } finally {
      setInsightsLoading(false);
    }
  }, [reports, organizations]);

  useEffect(() => {
    if (!loadingInitial) {
      loadActionInsights();
    }
  }, [loadingInitial, loadActionInsights]);

  const runRegionAnalysis = async (params: {
    regionId?: string;
    lat?: number;
    lng?: number;
    name?: string;
    qaFilter?: 'strict_good' | 'good_and_marginal';
  }) => {
    setAnalyzing(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.regionId) qs.set('regionId', params.regionId);
      if (typeof params.lat === 'number' && typeof params.lng === 'number') {
        qs.set('lat', String(params.lat));
        qs.set('lng', String(params.lng));
      }
      if (params.name) qs.set('name', params.name);
      qs.set('qaFilter', params.qaFilter || qaFilterMode);

      const resp = await fetch(`/api/earth-intelligence/analyze?${qs.toString()}`);
      const json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || `HTTP ${resp.status}`);
      }
      setAnalysis(json.data);
      if (json.data?.region?.center) {
        setCustomLat(json.data.region.center[0].toFixed(4));
        setCustomLng(json.data.region.center[1].toFixed(4));
      }
    } catch (err: any) {
      setError(err?.message || 'Location analysis request failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQaFilterChange = (mode: 'strict_good' | 'good_and_marginal') => {
    setQaFilterMode(mode);
    if (!analysis) return;
    if (analysis.region.isCustom) {
      runRegionAnalysis({
        lat: analysis.region.center[0],
        lng: analysis.region.center[1],
        name: analysis.region.nameEn,
        qaFilter: mode,
      });
    } else {
      runRegionAnalysis({ regionId: analysis.region.id, qaFilter: mode });
    }
  };

  const handleCustomCoordinateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(customLat);
    const lng = Number(customLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
      setError('Enter valid coordinates: Latitude [-85..85], Longitude [-180..180].');
      return;
    }
    runRegionAnalysis({
      lat,
      lng,
      name: customName.trim() || undefined,
    });
  };

  if (loadingInitial) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-base font-semibold text-slate-900">
          {language === 'ar'
            ? 'جارٍ استرجاع بيانات ناسا الرسمية MODIS V061...'
            : 'Querying Official NASA MODIS V061 & GIBS Endpoints...'}
        </h2>
        <p className="text-xs font-mono text-slate-500">
          MOD13Q1.061 (250m) · MCD12Q1.061 (500m) · MOD11A2.061 (1km) · NASA GIBS WMTS
        </p>
      </div>
    );
  }

  if (!overview || !analysis) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="p-6 bg-white border border-rose-200 rounded-xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">
            {language === 'ar' ? 'تعذر تحميل محرك الذكاء الأرضي' : 'NASA Data Retrieval Unavailable'}
          </h3>
          <p className="text-xs font-mono text-rose-700">{error || 'Unknown service error'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const validVeg = analysis.vegetation.observations.filter(
    (o) => o.qaPassed !== false && o.ndvi !== null
  );
  const latestVeg = validVeg.length > 0 ? validVeg[validVeg.length - 1] : null;
  const validDayLst = analysis.temperature.observations.filter(
    (o) => o.qaPassedDay !== false && o.lstDayCelsius !== null
  );
  const latestDayLst = validDayLst.length > 0 ? validDayLst[validDayLst.length - 1] : null;
  const validNightLst = analysis.temperature.observations.filter(
    (o) => o.qaPassedNight !== false && o.lstNightCelsius !== null
  );
  const latestNightLst = validNightLst.length > 0 ? validNightLst[validNightLst.length - 1] : null;
  const latestLc =
    analysis.landCover.years.length > 0
      ? analysis.landCover.years[analysis.landCover.years.length - 1]
      : null;

  const vegTrendLabel =
    analysis.vegetation.ndviTrend.direction === 'inconclusive_short_record'
      ? `short-record (<5 yr, ${analysis.vegetation.ndviTrend.spanYears.toFixed(1)} yr)`
      : analysis.vegetation.ndviTrend.direction;

  return (
    <div className="bg-slate-50 min-h-screen border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Top Scientific Header Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Globe2 className="w-5 h-5 text-cyan-700" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {language === 'ar'
                    ? 'محرك الذكاء الأرضي — رصد تغيرات الأرض والعمل المناخي'
                    : 'CYCLE EARTH INTELLIGENCE ENGINE'}
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-cyan-200 bg-cyan-50 text-cyan-900 font-semibold">
                  NASA MODIS V061 + GIBS + AppEEARS
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-3xl">
                {language === 'ar'
                  ? 'تحليل كمي مباشر لبيانات ناسا (الغلاف النباتي، الغطاء الأرضي، وحرارة سطح الأرض) مع ربطها ميدانياً ببلاغات البلاستيك وإعادة التدوير في سايكل.'
                  : 'Scientific Earth observation engine combining real NASA MOD13Q1, MCD12Q1, MOD11A2, GIBS WMTS, and AppEEARS pipelines with Cycle plastic recovery logistics.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
              <span className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700">
                AOI: {analysis.region.center[0].toFixed(3)}, {analysis.region.center[1].toFixed(3)}
              </span>
              <span
                className={`px-2.5 py-1 rounded border ${
                  analysis.retrievalStatus === 'verified'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {analysis.fromCache ? 'CACHE_VERIFIED' : 'LIVE_VERIFIED'}
              </span>
              {analyzing && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-cyan-200 bg-cyan-50 text-cyan-800">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Querying NASA API...
                </span>
              )}
            </div>
          </div>

          {/* Region Selector (Egypt Case Study + Global Custom Coordinates) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-3 border-t border-slate-200">
            <div className="xl:col-span-6 space-y-1.5">
              <label className="block text-[11px] font-mono uppercase font-semibold text-slate-500">
                {language === 'ar'
                  ? 'نطاقات دراسة الحالة في مصر (7 محافظات ومحاور)'
                  : 'Egypt Case Study Regions (7 Focal Zones)'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {overview.regions.map((r) => {
                  const selected = analysis.region.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={analyzing}
                      onClick={() => runRegionAnalysis({ regionId: r.id })}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        selected
                          ? 'border-cyan-700 bg-cyan-700 text-white font-semibold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      {language === 'ar' ? r.governorateAr : r.nameEn.split(' (')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleCustomCoordinateSubmit} className="xl:col-span-6 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-mono uppercase font-semibold text-slate-500">
                  {language === 'ar'
                    ? 'استكشاف أي إحداثيات عالمية (Lat / Lng)'
                    : 'Global Coordinate Query (Any Earth Lat / Lng)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GLOBAL_PRESETS.map((gp) => (
                    <button
                      key={gp.name}
                      type="button"
                      disabled={analyzing}
                      onClick={() =>
                        runRegionAnalysis({ lat: gp.lat, lng: gp.lng, name: gp.name })
                      }
                      className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                      {gp.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="number"
                  step="any"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  placeholder="Lat"
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
                <input
                  type="number"
                  step="any"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  placeholder="Lng"
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={language === 'ar' ? 'اسم الموقع (اختياري)' : 'Label (optional)'}
                  className="sm:col-span-4 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <button
                  type="submit"
                  disabled={analyzing}
                  className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  Query
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-mono text-rose-800">
              {error}
            </div>
          )}
        </div>

        {/* Core "What is Changing Here?" Live Telemetry Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-slate-500">
              {language === 'ar' ? 'أحدث غطاء نباتي (MOD13Q1)' : 'Latest Vegetation (MOD13Q1)'}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {latestVeg?.ndvi !== null && latestVeg?.ndvi !== undefined
                  ? latestVeg.ndvi.toFixed(4)
                  : '—'}
              </span>
              <span className="text-xs font-mono text-slate-500">NDVI</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              {latestVeg?.date || 'No QA-valid date'} · {vegTrendLabel} · n=
              {analysis.vegetation.validObservations}/{analysis.vegetation.totalObservations}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-slate-500">
              {language === 'ar' ? 'حرارة السطح النهارية (MOD11A2)' : 'Day Skin LST (MOD11A2)'}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                {latestDayLst?.lstDayCelsius !== null && latestDayLst?.lstDayCelsius !== undefined
                  ? `${latestDayLst.lstDayCelsius.toFixed(1)}`
                  : '—'}
              </span>
              <span className="text-xs font-mono text-slate-500">°C (Surface Skin)</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              {latestDayLst?.date || 'No QA-valid date'} · Night:{' '}
              {latestNightLst?.lstNightCelsius !== null && latestNightLst?.lstNightCelsius !== undefined
                ? `${latestNightLst.lstNightCelsius.toFixed(1)}°C`
                : '—'}{' '}
              · n={analysis.temperature.validDayObservations}/{analysis.temperature.totalObservations}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-slate-500">
              {language === 'ar' ? 'الغطاء الأرضي السائد (MCD12Q1)' : 'Dominant Land Cover (MCD12Q1)'}
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate pt-1">
              {latestLc
                ? language === 'ar'
                  ? latestLc.dominantClassNameAr
                  : latestLc.dominantClassNameEn
                : 'INSUFFICIENT_DATA'}
            </div>
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              {latestLc ? `Year ${latestLc.year} · ` : ''}
              {analysis.landCover.changedPercent !== null
                ? `${analysis.landCover.changedPercent.toFixed(1)}% grid transitioned`
                : '500m IGBP'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-slate-500">
              {language === 'ar' ? 'شبكة سايكل الميدانية (Firestore)' : 'Cycle Ground Network'}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {reports.filter((r) => r.status === 'Available' || r.status === 'In discussion').length}
              </span>
              <span className="text-xs font-mono text-slate-500">
                active reports / {organizations.length} orgs
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {language === 'ar'
                ? analysis.region.resolutionCaveatAr.slice(0, 62) + '...'
                : analysis.region.resolutionCaveatEn.slice(0, 62) + '...'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5">
          {[
            {
              id: 'engine' as WorkbenchTab,
              icon: MapPin,
              en: 'Earth Engine Map & GIBS',
              ar: 'الخريطة الفضائية و GIBS',
            },
            {
              id: 'vegetation' as WorkbenchTab,
              icon: Activity,
              en: 'Vegetation Trends (MOD13Q1)',
              ar: 'تحليل الغطاء النباتي (MOD13Q1)',
            },
            {
              id: 'thermal-landcover' as WorkbenchTab,
              icon: Thermometer,
              en: 'Thermal & Land Cover (MOD11A2 / MCD12Q1)',
              ar: 'الحرارة والغطاء الأرضي',
            },
            {
              id: 'actions' as WorkbenchTab,
              icon: Recycle,
              en: 'Change Stories & Cycle Action',
              ar: 'قصص التغير وإجراءات سايكل',
            },
            {
              id: 'appeears' as WorkbenchTab,
              icon: Database,
              en: 'AppEEARS & GeoTIFF / NetCDF4',
              ar: 'استخلاص AppEEARS والملفات',
            },
            {
              id: 'provenance' as WorkbenchTab,
              icon: ShieldCheck,
              en: 'NASA Provenance & Limits',
              ar: 'الشفافية والحدود العلمية',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? tab.ar : tab.en}</span>
              </button>
            );
          })}
        </div>

        {/* Active Workbench View */}
        {activeTab === 'engine' && (
          <div className="space-y-6">
            <EarthIntelligenceMap
              regions={overview.regions}
              activeRegion={analysis.region}
              gibsLayers={overview.gibsLayers}
              reports={reports}
              organizations={organizations}
              onSelectRegion={(id) => runRegionAnalysis({ regionId: id })}
              onAnalyzeCustomPoint={(lat, lng) => runRegionAnalysis({ lat, lng })}
              analyzingGlobalPoint={analyzing}
              latestObservationDate={latestVeg?.date || latestDayLst?.date || null}
              language={language}
            />
            <ActionAndStoriesPanel
              story={analysis.story}
              actionInsights={actionInsights.slice(0, 3)}
              insightsLoading={insightsLoading}
              onSelectRegion={(id) => runRegionAnalysis({ regionId: id })}
              onNavigateToReports={onNavigateToReports}
              onNavigateToRoutes={onNavigateToRoutes}
              language={language}
            />
          </div>
        )}

        {activeTab === 'vegetation' && (
          <ModisVegetationChart
            vegetation={analysis.vegetation}
            qaFilterMode={qaFilterMode}
            onChangeQaFilter={handleQaFilterChange}
            regionName={language === 'ar' ? analysis.region.nameAr : analysis.region.nameEn}
            language={language}
          />
        )}

        {activeTab === 'thermal-landcover' && (
          <ModisLstAndLandCoverPanel
            analysis={analysis}
            qaFilterMode={qaFilterMode}
            onChangeQaFilter={handleQaFilterChange}
            language={language}
          />
        )}

        {activeTab === 'actions' && (
          <ActionAndStoriesPanel
            story={analysis.story}
            actionInsights={actionInsights}
            insightsLoading={insightsLoading}
            onSelectRegion={(id) => runRegionAnalysis({ regionId: id })}
            onNavigateToReports={onNavigateToReports}
            onNavigateToRoutes={onNavigateToRoutes}
            language={language}
          />
        )}

        {activeTab === 'appeears' && (
          <AppeearsPipelinePanel selectedRegion={analysis.region} language={language} />
        )}

        {activeTab === 'provenance' && (
          <ProvenanceTransparencyPanel
            catalog={overview.datasetCatalog}
            analysis={analysis}
            language={language}
          />
        )}
      </div>
    </div>
  );
};
