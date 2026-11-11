import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  EarthIntelligencePayload,
  PlasticReport,
  EnvironmentalHotspot,
} from '../types';
import { EarthIntelligenceMap } from '../components/EarthIntelligenceMap';
import { SatelliteComparisonSlider } from '../components/SatelliteComparisonSlider';
import { ModisVegetationChart } from '../components/ModisVegetationChart';
import {
  Globe2,
  Sparkles,
  Flame,
  Activity,
  Layers,
  TrendingUp,
  MapPin,
  Building2,
  Truck,
  ShieldAlert,
  Info,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Award,
} from 'lucide-react';

interface EarthIntelligencePageProps {
  reports: PlasticReport[];
  onNavigateToReports?: () => void;
  onNavigateToRoutes?: () => void;
}

export const EarthIntelligencePage: React.FC<EarthIntelligencePageProps> = ({
  reports,
  onNavigateToReports,
  onNavigateToRoutes,
}) => {
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [dataPayload, setDataPayload] = useState<EarthIntelligencePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Navigation inside Earth Intelligence
  const [activeSection, setActiveSection] = useState<'map' | 'change-slider' | 'vegetation' | 'hotspots' | 'methodology'>('map');

  // Selected entities
  const [selectedStudyAreaId, setSelectedStudyAreaId] = useState<string>('new-capital');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>('hotspot-new-capital-bulk');

  // Fetch Earth Intelligence data from backend
  const fetchEarthData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/earth-intelligence/data');
      if (!resp.ok) {
        throw new Error(`Failed to load satellite data (HTTP ${resp.status})`);
      }
      const json = await resp.json();
      if (json.success && json.data) {
        setDataPayload(json.data);
      } else {
        throw new Error(json.error || 'Invalid satellite data payload');
      }
    } catch (err: any) {
      console.error('[Earth Intelligence Error]', err);
      setError(err?.message || 'Error connecting to NASA Earth Observation services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarthData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h3 className="text-lg font-bold text-stone-900">
          {language === 'ar' ? 'جارٍ تحميل بيانات أقمار ناسا الصناعية...' : 'Retrieving NASA Earth Observation Datasets...'}
        </h3>
        <p className="text-xs text-stone-500 font-mono">
          Querying Landsat 8/9 Level-2 Surface Reflectance (30m) & MODIS MOD13Q1 (250m)...
        </p>
      </div>
    );
  }

  if (error || !dataPayload) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-bold text-base">
            {language === 'ar' ? 'تعذر تحميل بيانات الرصد الفضائي' : 'Unable to Load Satellite Intelligence'}
          </h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchEarthData}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry Data Retrieval'}
          </button>
        </div>
      </div>
    );
  }

  const { studyAreas, hotspots, historicalBenchmarks, modisTimeSeries, summary, attribution } = dataPayload;
  const activeStudyArea = studyAreas.find((a) => a.id === selectedStudyAreaId) || studyAreas[0];
  const activeBenchmark = historicalBenchmarks[selectedStudyAreaId] || historicalBenchmarks['new-capital'];
  const activeModisSeries = modisTimeSeries[selectedStudyAreaId] || [];
  const activeHotspot = hotspots.find((h) => h.id === selectedHotspotId) || hotspots[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 via-cyan-950 to-stone-900 text-white p-6 sm:p-10 border border-cyan-800/40 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>NASA Space Apps Challenge 2026 Submission</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Globe2 className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
              <span>{language === 'ar' ? 'ذكاء الأرض — منصة سايكل' : 'Cycle Earth Intelligence'}</span>
            </h1>

            <p className="text-sm sm:text-base text-cyan-100/90 leading-relaxed">
              {language === 'ar'
                ? 'دمج مباشر لبيانات لاندسات 8 و9 (30 متراً) وموديس (250 متراً) مع بلاغات منصة سايكل الأرضية لرصد بؤر تراكم البلاستيك وتوجيه شاحنات الجمع نحو الأماكن الأكثر حرجاً بيئياً.'
                : 'Direct fusion of NASA Landsat 8/9 Level-2 surface reflectance (30m) and MODIS 16-day vegetation indices (250m) with terrestrial crowd reports to model environmental accumulation risk and optimize circular collection routes.'}
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-xs text-cyan-200 block">
                {language === 'ar' ? 'المساحة المرصودة' : 'Monitored Area'}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                {(summary.totalSatelliteAreaSqKm).toLocaleString()} km²
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-xs text-cyan-200 block">
                {language === 'ar' ? 'بؤر الخطر النشطة' : 'Active Hotspots'}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
                {summary.activeHotspotsCount} Critical
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-xs text-cyan-200 block">
                {language === 'ar' ? 'مخلفات بلاستيكية بالمسار' : 'Tracked Waste'}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {(summary.totalWasteMonitoredKg).toLocaleString()} kg
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-xs text-cyan-200 block">
                {language === 'ar' ? 'أقمار الرصد' : 'Spaceborne Satellites'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white block mt-1">
                Landsat 8/9 & MODIS
              </span>
            </div>
          </div>
        </div>

        {/* Subtle Decorative Starburst */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Prominent Scientific Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block font-semibold mb-0.5">
            {language === 'ar' ? 'تنويه علمي دقيق:' : 'Scientific Methodological Notice:'}
          </strong>
          {language === 'ar' ? attribution.disclaimerAr : attribution.disclaimerEn}
        </div>
      </div>

      {/* Sub-Navigation Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 text-xs font-semibold">
        <button
          onClick={() => setActiveSection('map')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSection === 'map'
              ? 'bg-cyan-700 text-white shadow-xs font-bold'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'الخريطة التفاعلية والطبقات' : 'Interactive Satellite Map'}</span>
        </button>

        <button
          onClick={() => setActiveSection('change-slider')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSection === 'change-slider'
              ? 'bg-cyan-700 text-white shadow-xs font-bold'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'مقارنة لاندسات (2020 vs 2024)' : 'Landsat Land Use Benchmark'}</span>
        </button>

        <button
          onClick={() => setActiveSection('vegetation')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSection === 'vegetation'
              ? 'bg-cyan-700 text-white shadow-xs font-bold'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'سلسلة موديس للغطاء النباتي' : 'MODIS Vegetation Health'}</span>
        </button>

        <button
          onClick={() => setActiveSection('hotspots')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSection === 'hotspots'
              ? 'bg-cyan-700 text-white shadow-xs font-bold'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'بؤر الخطر وأولويات الجمع' : 'Hotspots & Collection Priority'}</span>
        </button>

        <button
          onClick={() => setActiveSection('methodology')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSection === 'methodology'
              ? 'bg-cyan-700 text-white shadow-xs font-bold'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'المنهجية العلمية والمصادر' : 'NASA Methodology & Sources'}</span>
        </button>
      </div>

      {/* SECTION 1: INTERACTIVE MAP & STUDY AREA SELECTOR */}
      {activeSection === 'map' && (
        <div className="space-y-6">
          {/* Study Area Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-stone-500 font-semibold uppercase tracking-wider text-[11px] mr-2">
              {language === 'ar' ? 'النطاق الجغرافي:' : 'Study Area:'}
            </span>
            {studyAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  setSelectedStudyAreaId(area.id);
                  const matchingHotspot = hotspots.find((h) => h.studyAreaId === area.id);
                  if (matchingHotspot) setSelectedHotspotId(matchingHotspot.id);
                }}
                className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                  selectedStudyAreaId === area.id
                    ? 'bg-cyan-100 border-cyan-500 text-cyan-900 font-bold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {language === 'ar' ? area.nameAr : area.nameEn}
              </button>
            ))}
          </div>

          {/* Interactive Map */}
          <EarthIntelligenceMap
            studyAreas={studyAreas}
            hotspots={hotspots}
            reports={reports}
            selectedStudyAreaId={selectedStudyAreaId}
            selectedHotspotId={selectedHotspotId}
            onSelectStudyArea={setSelectedStudyAreaId}
            onSelectHotspot={setSelectedHotspotId}
            language={language}
          />

          {/* Active Area Intelligence Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-4">
              <div>
                <span className="text-xs text-cyan-700 font-bold uppercase tracking-wider">
                  {language === 'ar' ? activeStudyArea.governorateAr : activeStudyArea.governorateEn} &bull; WRS Path/Row: {activeStudyArea.wrsPathRow}
                </span>
                <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                  {language === 'ar' ? activeStudyArea.nameAr : activeStudyArea.nameEn}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSection('change-slider')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-900 border border-cyan-200 text-xs font-semibold hover:bg-cyan-100 flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-700" />
                  <span>{language === 'ar' ? 'عرض تغير الكتلة (NDBI)' : 'View Landsat NDBI'}</span>
                </button>

                {onNavigateToRoutes && (
                  <button
                    onClick={onNavigateToRoutes}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5 shadow-xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تخطيط مسار جمع' : 'Plan Collection Route'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-stone-700">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="font-bold text-stone-900 block mb-1">
                  {language === 'ar' ? 'الوصف الإيكولوجي والميداني:' : 'Ecological & Field Context:'}
                </span>
                <p>{language === 'ar' ? activeStudyArea.descriptionAr : activeStudyArea.descriptionEn}</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="font-bold text-stone-900 block mb-1">
                  {language === 'ar' ? 'البصمة الطيفية الفضائية (NASA Spectrum):' : 'Satellite Spectral Footprint:'}
                </span>
                <p>{language === 'ar' ? activeStudyArea.environmentalProfileAr : activeStudyArea.environmentalProfileEn}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LANDSAT BEFORE / AFTER SLIDER */}
      {activeSection === 'change-slider' && activeBenchmark && (
        <div className="space-y-6">
          {/* Study Area Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-stone-500 font-semibold uppercase tracking-wider text-[11px] mr-2">
              {language === 'ar' ? 'اختر النطاق للمقارنة:' : 'Select Area:'}
            </span>
            {studyAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedStudyAreaId(area.id)}
                className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                  selectedStudyAreaId === area.id
                    ? 'bg-cyan-100 border-cyan-500 text-cyan-900 font-bold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {language === 'ar' ? area.nameAr : area.nameEn}
              </button>
            ))}
          </div>

          <SatelliteComparisonSlider
            studyAreaNameEn={activeStudyArea.nameEn}
            studyAreaNameAr={activeStudyArea.nameAr}
            baseline={activeBenchmark.baseline2020}
            current={activeBenchmark.current2024}
            deltaNDVI={activeBenchmark.deltaNDVI}
            deltaNDBI={activeBenchmark.deltaNDBI}
            urbanExpansionPercent={activeBenchmark.urbanExpansionPercent}
            language={language}
          />
        </div>
      )}

      {/* SECTION 3: MODIS 16-DAY VEGETATION VITALITY */}
      {activeSection === 'vegetation' && (
        <div className="space-y-6">
          {/* Study Area Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-stone-500 font-semibold uppercase tracking-wider text-[11px] mr-2">
              {language === 'ar' ? 'اختر النطاق الزراعي:' : 'Select Agricultural Zone:'}
            </span>
            {studyAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedStudyAreaId(area.id)}
                className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                  selectedStudyAreaId === area.id
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {language === 'ar' ? area.nameAr : area.nameEn}
              </button>
            ))}
          </div>

          <ModisVegetationChart
            records={activeModisSeries}
            areaNameEn={activeStudyArea.nameEn}
            areaNameAr={activeStudyArea.nameAr}
            language={language}
          />
        </div>
      )}

      {/* SECTION 4: ENVIRONMENTAL HOTSPOTS & COLLECTION PRIORITY */}
      {activeSection === 'hotspots' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hotspots List (Left 1 Col) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
                <span>{language === 'ar' ? 'قائمة بؤر الخطر البيئي' : 'Ranked Environmental Hotspots'}</span>
                <span className="text-xs text-stone-500">{hotspots.length} Detected</span>
              </h3>

              <div className="space-y-2.5">
                {hotspots.map((h) => {
                  const isSelected = h.id === selectedHotspotId;
                  const priorityColor =
                    h.priorityLevel === 'Critical'
                      ? 'border-rose-400 bg-rose-50/70 text-rose-950'
                      : h.priorityLevel === 'High'
                      ? 'border-amber-400 bg-amber-50/70 text-amber-950'
                      : 'border-yellow-400 bg-yellow-50/70 text-yellow-950';

                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedHotspotId(h.id);
                        setSelectedStudyAreaId(h.studyAreaId);
                      }}
                      className={`w-full text-left rtl:text-right p-4 rounded-xl border transition-all ${
                        isSelected
                          ? `ring-2 ring-cyan-500 shadow-md ${priorityColor}`
                          : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs">
                          {language === 'ar' ? h.nameAr : h.nameEn}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 border shadow-2xs">
                          {h.collectionPriorityScore.toFixed(0)} / 100
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-2">
                        <span>{h.wasteVolumeKg.toLocaleString()} kg waste</span>
                        <span>&bull;</span>
                        <span>NDBI: {h.landsatNDBI > 0 ? `+${h.landsatNDBI}` : h.landsatNDBI}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-stone-700">{h.priorityLevel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hotspot Detailed Breakdown (Right 2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        activeHotspot.priorityLevel === 'Critical'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {activeHotspot.priorityLevel} Priority
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      {activeHotspot.coordinates[0].toFixed(4)}°N, {activeHotspot.coordinates[1].toFixed(4)}°E
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {language === 'ar' ? activeHotspot.nameAr : activeHotspot.nameEn}
                  </h3>
                </div>

                {onNavigateToRoutes && (
                  <button
                    onClick={onNavigateToRoutes}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{language === 'ar' ? 'توجيه شاحنة الجمع لهذا الموقع' : 'Dispatch Collection to Hotspot'}</span>
                  </button>
                )}
              </div>

              {/* Explainable Score Breakdown Bars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                  <span>{language === 'ar' ? 'تفصيل مؤشر الأولوية الشامل (Multi-Criteria Score)' : 'Collection Priority Score Formula'}</span>
                  <span className="text-cyan-800 font-mono text-sm">
                    {activeHotspot.collectionPriorityScore.toFixed(1)} / 100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Waste Volume Component */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex justify-between text-stone-700 mb-1">
                      <span>Waste Volume Factor (35% wt)</span>
                      <span className="font-bold font-mono">{activeHotspot.scoreBreakdown.wasteVolumeComponent.toFixed(1)} pts</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${(activeHotspot.scoreBreakdown.wasteVolumeComponent / 35) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Urban Pressure Component */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex justify-between text-stone-700 mb-1">
                      <span>Landsat NDBI Pressure (25% wt)</span>
                      <span className="font-bold font-mono">{activeHotspot.scoreBreakdown.urbanPressureComponent.toFixed(1)} pts</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-600 h-full rounded-full"
                        style={{ width: `${(activeHotspot.scoreBreakdown.urbanPressureComponent / 25) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Logistical Gap Component */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex justify-between text-stone-700 mb-1">
                      <span>Logistical Gap Factor (25% wt)</span>
                      <span className="font-bold font-mono">{activeHotspot.scoreBreakdown.logisticalGapComponent.toFixed(1)} pts</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full"
                        style={{ width: `${(activeHotspot.scoreBreakdown.logisticalGapComponent / 25) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Ecological Vulnerability Component */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex justify-between text-stone-700 mb-1">
                      <span>Ecological Sensitivity (15% wt)</span>
                      <span className="font-bold font-mono">{activeHotspot.scoreBreakdown.ecologicalVulnerabilityComponent.toFixed(1)} pts</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 h-full rounded-full"
                        style={{ width: `${(activeHotspot.scoreBreakdown.ecologicalVulnerabilityComponent / 15) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scientific Rationale Narrative */}
              <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 text-xs text-cyan-950 space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-cyan-900">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-700" />
                  <span>{language === 'ar' ? 'التحليل العلمي والبيئي الميداني:' : 'Scientific Environmental Analysis:'}</span>
                </span>
                <p className="leading-relaxed">
                  {language === 'ar' ? activeHotspot.scientificRationaleAr : activeHotspot.scientificRationaleEn}
                </p>
              </div>

              {/* Nearest Recycler Info */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="text-stone-500 block">{language === 'ar' ? 'أقرب منشأة تدوير مسجلة:' : 'Nearest Registered Facility:'}</span>
                    <strong className="text-stone-900">{activeHotspot.nearestOrgName}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 block">{language === 'ar' ? 'المسافة اللوجستية:' : 'Distance:'}</span>
                  <span className="font-bold font-mono text-stone-900">{activeHotspot.nearestOrgDistanceKm} km</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: NASA METHODOLOGY & CITATION */}
      {activeSection === 'methodology' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 text-xs text-stone-700 leading-relaxed">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-lg font-bold text-stone-900">
              {language === 'ar' ? 'المنهجية العلمية ومصادر بيانات ناسا' : 'NASA Earth Observation Methodology & Attribution'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Developed for the NASA Space Apps Challenge &bull; Circular Economy Track
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                <span>1. Landsat 8 & 9 Collection 2 Level-2 Surface Reflectance</span>
              </h4>
              <p>
                Atmospherically corrected surface reflectance from the Operational Land Imager (OLI) and OLI-2 at 30-meter ground resolution. 
                Scaled via <code>Reflectance = (DN * 0.0000275) - 0.2</code>. Clouds and cloud shadows masked using the <code>QA_PIXEL</code> bitmask.
              </p>
              <div className="p-3 bg-stone-50 rounded-xl font-mono text-[11px] text-stone-800 space-y-1">
                <div>NDVI = (SR_B5 - SR_B4) / (SR_B5 + SR_B4) [Chlorophyll Vitality]</div>
                <div>NDBI = (SR_B6 - SR_B5) / (SR_B6 + SR_B5) [Built-up Surface Index]</div>
                <div>NDWI = (SR_B3 - SR_B5) / (SR_B3 + SR_B5) [Water / Wetland Index]</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>2. MODIS MOD13Q1 Version 6.1 (16-Day L3 Global 250m)</span>
              </h4>
              <p>
                From the Moderate Resolution Imaging Spectroradiometer (MODIS) aboard NASA's Terra satellite. 
                Composites optimal 16-day pixels with aerosol correction and nadir reflectance modeling (scale factor 0.0001).
              </p>
              <div className="p-3 bg-stone-50 rounded-xl font-mono text-[11px] text-stone-800 space-y-1">
                <div>Tile: h20v05 (Northern Egypt, Nile Delta, Cairo, Alexandria)</div>
                <div>SummaryQA: 0 = Good Quality, 1 = Marginal (Cloudy filtered)</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 text-[11px] space-y-2">
            <span className="font-bold text-stone-900 block">Official Citations & Attribution:</span>
            <ul className="list-disc pl-5 rtl:pr-5 space-y-1">
              <li>U.S. Geological Survey (USGS) and NASA Landsat Program: Landsat 8-9 Collection 2 Level-2 Science Products.</li>
              <li>NASA LP DAAC: Didan, K. (2015). MOD13Q1 MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V006 / V061.</li>
              <li>NASA Global Imagery Browse Services (GIBS), Earth Science Data and Information System (ESDIS) project.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
