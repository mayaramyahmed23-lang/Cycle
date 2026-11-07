import React from 'react';
import { MatchFactorBreakdown } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle2, Layers, Scale, MapPin, Clock, Info } from 'lucide-react';

interface MatchExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  breakdown: MatchFactorBreakdown | null;
  targetTitle?: string;
}

export const MatchExplanationModal: React.FC<MatchExplanationModalProps> = ({
  isOpen,
  onClose,
  score,
  breakdown,
  targetTitle,
}) => {
  const { t, language } = useLanguage();

  if (!isOpen || !breakdown) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              %
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {t('matchBreakdownTitle')}
              </h3>
              {targetTitle && (
                <p className="text-xs text-stone-500 truncate max-w-xs">
                  {targetTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main Score Banner */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                {t('matchScoreLabel')}
              </span>
              <p className="text-2xl font-black text-emerald-950">
                {score}%
              </p>
            </div>
            <div className="text-right rtl:text-left text-xs text-stone-600 max-w-[200px]">
              {score >= 75
                ? language === 'ar'
                  ? 'توافق عالٍ ومثالي لسرعة التنفيذ والتجميع'
                  : 'High compatibility: Ideal material candidate for immediate pickup'
                : score >= 50
                ? language === 'ar'
                  ? 'توافق جيد مع متطلبات النقل أو الكميات الجزئية'
                  : 'Moderate compatibility: Good partial match with feasible transit'
                : language === 'ar'
                ? 'توافق منخفض يتطلب تنسيقاً إضافياً'
                : 'Lower compatibility: Requires flexible logistics'}
            </div>
          </div>

          {/* Factor 1: Polymer Type */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-stone-800">
                <Layers className="w-4 h-4 text-emerald-600" />
                {t('polymerMatchFactor')}
              </span>
              <span className="font-bold text-stone-900">
                +{breakdown.plasticTypeScore}%{' '}
                <span className="text-stone-400 font-normal">/ {breakdown.plasticTypeMax}%</span>
              </span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(breakdown.plasticTypeScore / breakdown.plasticTypeMax) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-stone-600">
              {language === 'ar' ? breakdown.plasticTypeDetailAr : breakdown.plasticTypeDetailEn}
            </p>
          </div>

          {/* Factor 2: Quantity Coverage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-stone-800">
                <Scale className="w-4 h-4 text-blue-600" />
                {t('quantityMatchFactor')}
              </span>
              <span className="font-bold text-stone-900">
                +{breakdown.quantityScore}%{' '}
                <span className="text-stone-400 font-normal">/ {breakdown.quantityMax}%</span>
              </span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(breakdown.quantityScore / breakdown.quantityMax) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-stone-600">
              {language === 'ar' ? breakdown.quantityDetailAr : breakdown.quantityDetailEn}
            </p>
          </div>

          {/* Factor 3: Location Proximity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-stone-800">
                <MapPin className="w-4 h-4 text-amber-600" />
                {t('locationMatchFactor')}
              </span>
              <span className="font-bold text-stone-900">
                +{breakdown.locationScore}%{' '}
                <span className="text-stone-400 font-normal">/ {breakdown.locationMax}%</span>
              </span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(breakdown.locationScore / breakdown.locationMax) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-stone-600">
              {language === 'ar' ? breakdown.locationDetailAr : breakdown.locationDetailEn}
            </p>
          </div>

          {/* Factor 4: Status / Availability */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-stone-800">
                <Clock className="w-4 h-4 text-purple-600" />
                {t('statusMatchFactor')}
              </span>
              <span className="font-bold text-stone-900">
                +{breakdown.statusScore}%{' '}
                <span className="text-stone-400 font-normal">/ {breakdown.statusMax}%</span>
              </span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(breakdown.statusScore / breakdown.statusMax) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-stone-600">
              {language === 'ar' ? breakdown.statusDetailAr : breakdown.statusDetailEn}
            </p>
          </div>

          {/* Footer note */}
          <div className="p-3 bg-stone-50 rounded-xl flex items-start gap-2 border border-stone-200/80">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-stone-500 leading-relaxed">
              {t('cycleFoundMatches')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
