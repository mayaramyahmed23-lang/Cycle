import React from 'react';
import { MatchFactorBreakdown } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { HelpCircle, Sparkles } from 'lucide-react';

interface MatchScoreBadgeProps {
  score: number;
  breakdown?: MatchFactorBreakdown;
  onClickWhy?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showWhyButton?: boolean;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  score,
  breakdown,
  onClickWhy,
  size = 'md',
  showWhyButton = false,
}) => {
  const { t } = useLanguage();

  // Color coding based on realistic percentage
  let bgClasses = 'bg-stone-100 text-stone-700 border-stone-300';
  let dotColor = 'bg-stone-400';

  if (score >= 75) {
    bgClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    dotColor = 'bg-emerald-500';
  } else if (score >= 50) {
    bgClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
  } else if (score >= 30) {
    bgClasses = 'bg-sky-50 text-sky-800 border-sky-300';
    dotColor = 'bg-sky-500';
  }

  const paddingClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm font-bold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border ${paddingClass} ${bgClasses} shadow-2xs`}
      >
        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
        <span>{score}% {t('matchScoreLabel')}</span>
      </div>

      {showWhyButton && onClickWhy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClickWhy();
          }}
          className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded-full transition-colors"
          title={t('whyThisMatch')}
          aria-label={t('whyThisMatch')}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
