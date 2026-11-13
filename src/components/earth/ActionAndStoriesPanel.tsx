import React from 'react';
import {
  ActionInsightMatch,
  EarthChangeStory,
  EpistemicTier,
} from '../../types';
import {
  BookOpen,
  Truck,
  Recycle,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface ActionAndStoriesPanelProps {
  story: EarthChangeStory;
  actionInsights: ActionInsightMatch[];
  insightsLoading: boolean;
  onSelectRegion: (regionId: string) => void;
  onNavigateToReports?: () => void;
  onNavigateToRoutes?: () => void;
  language: 'en' | 'ar';
}

const TIER_BADGES: Record<EpistemicTier, { en: string; ar: string; style: string }> = {
  raw_satellite: {
    en: 'RAW SATELLITE',
    ar: 'بيانات خام',
    style: 'border-slate-300 bg-slate-100 text-slate-700',
  },
  processed_measurement: {
    en: 'PROCESSED MEASUREMENT',
    ar: 'قياس معالج',
    style: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  },
  calculated_indicator: {
    en: 'STATISTICAL INDICATOR',
    ar: 'مؤشر إحصائي',
    style: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  analytical_interpretation: {
    en: 'ANALYTICAL INTERPRETATION',
    ar: 'تفسير تحليلي',
    style: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  suggested_action: {
    en: 'OPERATIONAL ACTION',
    ar: 'إجراء تشغيلي',
    style: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
};

export const ActionAndStoriesPanel: React.FC<ActionAndStoriesPanelProps> = ({
  story,
  actionInsights,
  insightsLoading,
  onSelectRegion,
  onNavigateToReports,
  onNavigateToRoutes,
  language,
}) => {
  return (
    <div className="space-y-6">
      {/* EARTH CHANGE STORY FOR CURRENT AOI */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-semibold text-slate-900">
              {language === 'ar' ? 'قصة التغير البيئي المبنية على الأدلة' : 'Evidence-Backed Earth Change Story'}
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 text-[11px] font-mono rounded border ${
              story.status === 'verified'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {story.status === 'verified' ? 'EVIDENCE VERIFIED' : 'INSUFFICIENT_DATA'}
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">
            {language === 'ar' ? story.titleAr : story.titleEn}
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            {language === 'ar' ? story.summaryAr : story.summaryEn}
          </p>
        </div>

        {story.evidenceItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {story.evidenceItems.map((item, idx) => {
              const badge = TIER_BADGES[item.tier];
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${badge.style}`}>
                      {language === 'ar' ? badge.ar : badge.en}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{item.datasetId}</span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    {language === 'ar' ? item.metricLabelAr : item.metricLabelEn}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                      {item.valueFormatted}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{item.dateRange}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2 text-xs text-slate-600">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{language === 'ar' ? story.uncertaintyNoteAr : story.uncertaintyNoteEn}</span>
        </div>
      </div>

      {/* CYCLE PRACTICAL ACTION INSIGHTS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Recycle className="w-4 h-4 text-emerald-700" />
              <h3 className="text-base font-semibold text-slate-900">
                {language === 'ar'
                  ? 'رؤى العمل البيئي وتنسيق التجميع في سايكل'
                  : 'Environmental Action Insights & Cycle Logistics Matching'}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-amber-200 bg-amber-50 text-amber-900">
                EXPERIMENTAL OPERATIONAL HEURISTIC
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'ar'
                ? 'يتم فصل مؤشرات ناسا البيئية بوضوح عن بلاغات البلاستيك الفعلية في قاعدة بيانات سايكل (Firestore) دون أي افتراض بأن الأقمار الصناعية ترصد قطع البلاستيك.'
                : 'Separates verified NASA regional environmental context from live Cycle Firestore plastic reports and registered organizations.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800"
              >
                {language === 'ar' ? 'تصفح البلاغات' : 'Browse Reports'}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onNavigateToRoutes && (
              <button
                type="button"
                onClick={onNavigateToRoutes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Truck className="w-3.5 h-3.5" />
                {language === 'ar' ? 'تخطيط مسارات التجميع' : 'Plan Collection Routes'}
              </button>
            )}
          </div>
        </div>

        {insightsLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            Loading NASA regional context & matching live Firestore Cycle records...
          </div>
        ) : actionInsights.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
            {language === 'ar' ? 'لا توجد بيانات مطابقة حالياً.' : 'No matched regional insights available.'}
          </div>
        ) : (
          <div className="space-y-4">
            {actionInsights.map((insight) => (
              <div
                key={insight.regionId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectRegion(insight.regionId)}
                      className="text-sm font-semibold text-slate-900 hover:text-cyan-700 underline-offset-2 hover:underline text-left"
                    >
                      {language === 'ar' ? insight.regionNameAr : insight.regionNameEn}
                    </button>
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-200 bg-white text-slate-600 tabular-nums">
                      {insight.center[0].toFixed(2)}, {insight.center[1].toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                    <span
                      className={`px-2 py-0.5 rounded border font-semibold ${
                        insight.priorityLevel === 'High'
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : insight.priorityLevel === 'Medium'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {insight.priorityLevel} Priority{' '}
                      {insight.compositePriorityScore !== null
                        ? `(${insight.compositePriorityScore}/100)`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Split: Left = NASA Context, Right = Live Cycle Ground Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="text-[11px] font-mono uppercase text-cyan-800 font-semibold">
                      {language === 'ar'
                        ? 'السياق البيئي من ناسا (250م–1كم)'
                        : 'NASA Environmental Context (250m–1km)'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-[11px] text-slate-700">
                      <div>
                        NDVI:{' '}
                        <span className="font-semibold text-slate-900">
                          {insight.environmentalIndicators.latestNdvi !== null
                            ? insight.environmentalIndicators.latestNdvi.toFixed(3)
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        LST Day:{' '}
                        <span className="font-semibold text-slate-900">
                          {insight.environmentalIndicators.latestDayLstCelsius !== null
                            ? `${insight.environmentalIndicators.latestDayLstCelsius.toFixed(1)}°C`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        Trend:{' '}
                        <span className="font-semibold text-slate-900">
                          {insight.environmentalIndicators.ndviTrendDirection}
                        </span>
                      </div>
                      <div>
                        Built-up:{' '}
                        <span className="font-semibold text-slate-900">
                          {insight.environmentalIndicators.builtUpPercent !== null
                            ? `${insight.environmentalIndicators.builtUpPercent.toFixed(0)}%`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {language === 'ar'
                        ? insight.environmentalIndicators.dominantLandCoverAr
                        : insight.environmentalIndicators.dominantLandCoverEn}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="text-[11px] font-mono uppercase text-emerald-800 font-semibold">
                      {language === 'ar'
                        ? 'بيانات سايكل الميدانية (Firestore المباشر)'
                        : 'Live Cycle Plastic Ground Data (Firestore)'}
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-[11px] text-slate-700">
                      <div>
                        Reports:{' '}
                        <span className="font-semibold text-slate-900">
                          {insight.cycleGroundData.availableReportsCount}
                        </span>{' '}
                        open / {insight.cycleGroundData.matchedReportsCount}
                      </div>
                      <div>
                        Volume:{' '}
                        <span className="font-semibold text-slate-900">
                          {insight.cycleGroundData.totalReportedWeightKg.toFixed(0)} kg
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{insight.cycleGroundData.nearbyOrganizationsCount} orgs</span>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      {insight.cycleGroundData.dominantPolymers.length > 0
                        ? `Polymers: ${insight.cycleGroundData.dominantPolymers.join(', ')}`
                        : language === 'ar'
                          ? 'لا توجد بلاغات مفتوحة مطابقة حالياً في هذا النطاق'
                          : 'No open Cycle plastic reports matched in this AOI currently.'}
                    </div>
                  </div>
                </div>

                {/* Recommended Practical Actions */}
                <ul className="space-y-1 text-xs text-slate-700 list-disc pl-5">
                  {(language === 'ar'
                    ? insight.recommendedActionsAr
                    : insight.recommendedActionsEn
                  ).map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>

                <div className="pt-1 flex items-start gap-1.5 text-[11px] font-mono text-slate-500">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {language === 'ar' ? insight.formulaDisclosureAr : insight.formulaDisclosureEn}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
