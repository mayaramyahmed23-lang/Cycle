import React from 'react';
import {
  NASADatasetCatalogEntry,
  RegionAnalysisPayload,
} from '../../types';
import { ShieldCheck, ExternalLink, Database, Clock, Layers } from 'lucide-react';

interface ProvenanceTransparencyPanelProps {
  catalog: NASADatasetCatalogEntry[];
  analysis: RegionAnalysisPayload;
  language: 'en' | 'ar';
}

export const ProvenanceTransparencyPanel: React.FC<ProvenanceTransparencyPanelProps> = ({
  catalog,
  analysis,
  language,
}) => {
  const vegObs = analysis.vegetation.observations;
  const lstObs = analysis.temperature.observations;
  const lcYears = analysis.landCover.years;

  const vegSpan =
    vegObs.length > 0
      ? `${vegObs[0].date} to ${vegObs[vegObs.length - 1].date} (${analysis.vegetation.validObservations}/${vegObs.length} valid)`
      : 'No observations';
  const lstSpan =
    lstObs.length > 0
      ? `${lstObs[0].date} to ${lstObs[lstObs.length - 1].date} (${analysis.temperature.validDayObservations}/${lstObs.length} valid day)`
      : 'No observations';
  const lcSpan =
    lcYears.length > 0
      ? `${lcYears[0].year}–${lcYears[lcYears.length - 1].year} (${lcYears.length} annual epochs)`
      : 'No epochs';

  return (
    <div className="space-y-6">
      {/* Live Retrieval Provenance Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-semibold text-slate-900">
              {language === 'ar'
                ? 'الشفافية العلمية وسلسلة توثيق بيانات ناسا'
                : 'NASA Data Transparency, Provenance & Epistemic Boundaries'}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-mono rounded border border-cyan-200 bg-cyan-50 text-cyan-900">
              QA_MODE: {analysis.qaFilterMode}
            </span>
            <span className="px-2.5 py-1 text-[11px] font-mono rounded border border-slate-200 bg-slate-50 text-slate-700">
              {analysis.fromCache ? 'CACHE_HIT (<=24H)' : 'LIVE_ORNL_DAAC_QUERY'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-slate-500 flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> API Provider
            </div>
            <div className="font-semibold text-slate-900">{analysis.provenance.apiProvider}</div>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Retrieval Timestamp (UTC)
            </div>
            <div className="font-semibold text-slate-900">{analysis.retrievedAt}</div>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-slate-500 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Spatial Sampling Geometry
            </div>
            <div className="font-semibold text-slate-900">{analysis.provenance.modisGridSampleCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-mono tabular-nums">
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-500">Retrieved MOD13Q1: </span>
            <span className="text-slate-900 font-semibold">{vegSpan}</span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-500">Retrieved MOD11A2: </span>
            <span className="text-slate-900 font-semibold">{lstSpan}</span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-500">Retrieved MCD12Q1: </span>
            <span className="text-slate-900 font-semibold">{lcSpan}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {language === 'ar'
              ? 'التحويلات الرياضية ومعالجة الجودة المطبقة'
              : 'Exact Mathematical Transformations & QA Filtering Applied'}
          </h4>
          <ul className="space-y-1 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5 list-disc pl-5">
            {analysis.provenance.transformationsApplied.map((tr, i) => (
              <li key={i}>{tr}</li>
            ))}
          </ul>
        </div>

        {/* 5 Epistemic Tiers */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {language === 'ar'
              ? 'حدود التصنيف المعرفي الخمسة (Epistemic Tiers)'
              : 'Five Epistemic Separation Tiers'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {analysis.provenance.epistemicBoundaries.map((eb) => (
              <div
                key={eb.tier}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1"
              >
                <div className="text-[11px] font-mono font-bold text-cyan-800 uppercase">
                  {language === 'ar' ? eb.labelAr : eb.labelEn}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {language === 'ar' ? eb.descriptionAr : eb.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Official NASA Dataset Catalog Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {catalog.map((ds) => (
          <div key={ds.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{ds.shortName}</span>
                  {ds.isVisualOnly && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-amber-200 bg-amber-50 text-amber-900">
                      VISUAL ONLY
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {language === 'ar' ? ds.titleAr : ds.titleEn}
                </div>
              </div>
              <a
                href={ds.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded border border-slate-300 hover:bg-slate-50 text-slate-800 shrink-0"
              >
                DOI / Source
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
              <div>
                <span className="text-slate-500">Resolution: </span>
                {ds.spatialResolution}
              </div>
              <div>
                <span className="text-slate-500">Cadence: </span>
                {ds.temporalFrequency}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Archive: </span>
                {ds.temporalCoverage}
              </div>
              {ds.queriedTemporalCoverage && (
                <div className="col-span-2">
                  <span className="text-slate-500">Cycle Queried: </span>
                  {ds.queriedTemporalCoverage}
                </div>
              )}
              <div className="col-span-2">
                <span className="text-slate-500">Bands: </span>
                {ds.bandsUsed.join(', ')}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Scaling: </span>
                {ds.scaleFactorNote}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Fill & QA: </span>
                {ds.fillValueNote} · {ds.qaMethod}
              </div>
            </div>

            <div className="p-2.5 rounded border border-slate-200 bg-slate-50 text-[11px] text-slate-700 leading-relaxed">
              <strong>{language === 'ar' ? 'الحدود العلمية: ' : 'Scientific Limitations: '}</strong>
              {language === 'ar' ? ds.limitationsAr : ds.limitationsEn}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
