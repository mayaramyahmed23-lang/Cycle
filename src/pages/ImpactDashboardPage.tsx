import React, { useMemo } from 'react';
import { PlasticReport, OrganizationNeedPost, PlasticType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  Leaf, 
  Package, 
  Building2, 
  Users, 
  Scale, 
  CheckCircle2, 
  Globe2, 
  Recycle,
  Award,
  Sparkles,
  BarChart3,
  PieChart,
  ArrowUpRight
} from 'lucide-react';

interface ImpactDashboardPageProps {
  reports: PlasticReport[];
  organizationPosts: OrganizationNeedPost[];
  onNavigateToNeeds?: () => void;
  onNavigateToReports?: () => void;
}

export const ImpactDashboardPage: React.FC<ImpactDashboardPageProps> = ({
  reports,
  organizationPosts,
  onNavigateToNeeds,
  onNavigateToReports,
}) => {
  const { t, language } = useLanguage();

  // Aggregate stats
  const stats = useMemo(() => {
    let totalKgReported = 0;
    let totalKgCollected = 0;
    const typeDistribution: Record<string, number> = {
      PET: 0,
      HDPE: 0,
      LDPE: 0,
      PP: 0,
      PVC: 0,
      PS: 0,
      Other: 0,
    };
    const regionDistribution: Record<string, number> = {};

    const uniqueIndividualIds = new Set<string>();
    const uniqueOrgIds = new Set<string>();

    // Process reports
    reports.forEach((r) => {
      if (r.creatorId) uniqueIndividualIds.add(r.creatorId);

      const qty = Number(r.quantity) || 0;
      const factor = r.unit === 'tons' ? 1000 : 1;
      const weightKg = qty * factor;

      totalKgReported += weightKg;
      if (r.status === 'Collected') {
        totalKgCollected += weightKg;
      }

      if (r.plasticType && typeDistribution[r.plasticType] !== undefined) {
        typeDistribution[r.plasticType] += weightKg;
      } else {
        typeDistribution.Other += weightKg;
      }

      // Region tracking
      const loc = (r.location || 'Cairo').split(',')[0].trim();
      regionDistribution[loc] = (regionDistribution[loc] || 0) + weightKg;
    });

    // Process organization posts
    organizationPosts.forEach((p) => {
      if (p.organizationId) uniqueOrgIds.add(p.organizationId);
    });

    // Standard EPA/circular economy factors:
    // 1 kg of recycled plastic saves ~1.85 kg of CO2 equivalent
    // 1 kg of plastic diverted saves ~0.0028 m³ landfill space
    // 1 kg of recycled PET saves ~23.8 MJ of energy
    const co2SavedKg = Math.round(totalKgReported * 1.85);
    const landfillDivertedM3 = Math.round(totalKgReported * 0.0028 * 10) / 10;
    const energySavedKwh = Math.round((totalKgReported * 6.6));

    return {
      totalKgReported: Math.round(totalKgReported),
      totalTonsReported: Math.round((totalKgReported / 1000) * 10) / 10,
      totalKgCollected: Math.round(totalKgCollected),
      activeReportsCount: reports.length,
      activeNeedsCount: organizationPosts.length,
      individualSuppliers: uniqueIndividualIds.size,
      recyclingOrganizations: uniqueOrgIds.size,
      co2SavedKg,
      landfillDivertedM3,
      energySavedKwh,
      typeDistribution,
      regionDistribution,
    };
  }, [reports, organizationPosts]);

  // Polymer distribution percentages for visual bar
  const totalWeight = stats.totalKgReported || 1;
  const polymerColors: Record<string, string> = {
    PET: '#059669', // emerald
    HDPE: '#2563eb', // blue
    PP: '#d97706', // amber
    LDPE: '#7c3aed', // violet
    PVC: '#dc2626', // rose
    PS: '#0891b2', // cyan
    Other: '#64748b', // slate
  };

  // Top regions
  const topRegions = useMemo(() => {
    return Object.entries(stats.regionDistribution)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5);
  }, [stats.regionDistribution]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-stone-900 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-xs text-xs font-semibold text-emerald-300 border border-emerald-400/20">
            <Globe2 className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الأثر البيئي والاقتصادي الدائري' : 'Circular Economy Environmental Impact'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {t('impactMetrics')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
            {t('impactMetricsSubtitle')}
          </p>
        </div>
      </div>

      {/* Primary KPI Grid (4 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Plastic Reported */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {t('totalPlasticReported')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-stone-900">
              {stats.totalKgReported.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1.5 rtl:ml-0 rtl:mr-1.5">
              kg ({stats.totalTonsReported} tons)
            </span>
            <p className="text-[11px] text-stone-500 mt-1">
              {stats.activeReportsCount} {language === 'ar' ? 'بلاغات مسجلة عبر المنصة' : 'individual supply batches'}
            </p>
          </div>
        </div>

        {/* Metric 2: CO2 Emissions Prevented */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {t('co2Saved')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-emerald-700">
              {stats.co2SavedKg.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1.5 rtl:ml-0 rtl:mr-1.5">
              kg CO₂e
            </span>
            <p className="text-[11px] text-stone-500 mt-1">
              {language === 'ar' ? 'ما يعادل زراعة' : 'Equivalent to planting'}{' '}
              <strong className="text-stone-700">{Math.round(stats.co2SavedKg / 21)}</strong>{' '}
              {language === 'ar' ? 'شجرة حضرية' : 'urban trees'}
            </p>
          </div>
        </div>

        {/* Metric 3: Active Organizations & Needs */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {t('activeOrganizations')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-stone-900">
              {stats.activeNeedsCount}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1.5 rtl:ml-0 rtl:mr-1.5">
              {language === 'ar' ? 'طلبات توريد' : 'Active Needs'}
            </span>
            <p className="text-[11px] text-stone-500 mt-1">
              {stats.recyclingOrganizations} {language === 'ar' ? 'مؤسسات معتمدة على شبكة Cycle' : 'verified recycling partners'}
            </p>
          </div>
        </div>

        {/* Metric 4: Landfill Space Saved */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {t('landfillSaved')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Recycle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-stone-900">
              {stats.landfillDivertedM3}
            </span>
            <span className="text-sm font-semibold text-stone-500 ml-1.5 rtl:ml-0 rtl:mr-1.5">
              m³ {language === 'ar' ? 'حجم مكبات محمي' : 'volume'}
            </span>
            <p className="text-[11px] text-stone-500 mt-1">
              {stats.energySavedKwh.toLocaleString()} kWh {language === 'ar' ? 'طاقة تصنيع موفرة' : 'energy conserved'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Polymer Type Breakdown & Regional Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Polymer Breakdown (Col 7) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">
                {t('plasticTypeDistribution')}
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              {language === 'ar' ? 'بحسب الوزن الموثق' : 'By reported weight'}
            </span>
          </div>

          {/* Visual Percentage Stacked Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-stone-100">
            {Object.entries(stats.typeDistribution).map(([type, rawWeight]) => {
              const weight = Number(rawWeight) || 0;
              const pct = (weight / totalWeight) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={type}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: polymerColors[type] || '#64748b',
                  }}
                  title={`${type}: ${Math.round(weight)} kg (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Polymer Grid Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.typeDistribution).map(([type, rawWeight]) => {
              const weight = Number(rawWeight) || 0;
              const pct = Math.round((weight / totalWeight) * 100) || 0;
              return (
                <div
                  key={type}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: polymerColors[type] || '#64748b' }}
                      />
                      {type}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-stone-900">
                    {Math.round(weight).toLocaleString()} kg
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Activity (Col 5) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-stone-900">
                {language === 'ar' ? 'التوزيع الجغرافي للنشاط' : 'Geographic Hubs'}
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              {topRegions.length} {language === 'ar' ? 'مناطق رئيسية' : 'key hubs'}
            </span>
          </div>

          <div className="space-y-3">
            {topRegions.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">
                {language === 'ar' ? 'بانتظار تسجيل أولى البلاغات' : 'Awaiting regional listings'}
              </p>
            ) : (
              topRegions.map(([region, weight], idx) => {
                const maxVal = topRegions[0][1] || 1;
                const fillPct = Math.round((weight / maxVal) * 100);
                return (
                  <div key={region} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-800">
                        {idx + 1}. {region}
                      </span>
                      <span className="font-mono text-stone-600">
                        {Math.round(weight).toLocaleString()} kg
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="p-6 rounded-2xl bg-stone-100/80 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left rtl:sm:text-right">
          <h4 className="text-sm font-bold text-stone-900">
            {language === 'ar' ? 'هل ترغب في المساهمة بزيادة هذه الأرقام؟' : 'Ready to expand our collective impact?'}
          </h4>
          <p className="text-xs text-stone-600">
            {language === 'ar'
              ? 'أبلغ عن مخلفاتك البلاستيكية أو تصفح احتياجات مصانع التدوير للتوريد الفوري.'
              : 'Post your plastic batch or browse industrial organization material requests.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('exploreReports')}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-90" />
            </button>
          )}

          {onNavigateToNeeds && (
            <button
              type="button"
              onClick={onNavigateToNeeds}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('orgNeeds')}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-90" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
