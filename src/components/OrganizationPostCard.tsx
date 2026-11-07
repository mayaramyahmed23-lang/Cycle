import React, { useMemo } from 'react';
import { OrganizationNeedPost, PlasticReport, MatchFactorBreakdown } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PlasticTypeBadge } from './PlasticTypeBadge';
import { findMatchingReportsForNeed } from '../lib/matching';
import { 
  Building2, 
  MapPin, 
  Package, 
  Sparkles, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Send,
  Info
} from 'lucide-react';

interface OrganizationPostCardProps {
  post: OrganizationNeedPost;
  allReports?: PlasticReport[];
  onViewDetails: (post: OrganizationNeedPost) => void;
  onEdit?: (post: OrganizationNeedPost) => void;
  onDelete?: (post: OrganizationNeedPost) => void;
  onToggleStatus?: (post: OrganizationNeedPost) => void;
  onOfferMaterial?: (post: OrganizationNeedPost) => void;
}

export const OrganizationPostCard: React.FC<OrganizationPostCardProps> = ({
  post,
  allReports = [],
  onViewDetails,
  onEdit,
  onDelete,
  onToggleStatus,
  onOfferMaterial,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, userRole, isAdmin } = useAuth();

  const isOwner =
    (currentUser && post.organizationId === currentUser.uid) ||
    isAdmin;

  // Calculate matching individual reports dynamically
  const matches = useMemo(() => {
    return findMatchingReportsForNeed(post, allReports, 30);
  }, [post, allReports]);

  // Highest match score among reports
  const topMatch = matches.length > 0 ? matches[0] : null;

  return (
    <div
      onClick={() => onViewDetails(post)}
      className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group"
    >
      {/* Top Banner / Org Header */}
      <div className="p-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-emerald-200">
            {post.organizationLogoURL ? (
              <img
                src={post.organizationLogoURL}
                alt={post.organizationName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-stone-900 truncate">
              {post.organizationName}
            </h4>
            <p className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{post.location}</span>
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {post.status === 'Active' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {t('needStatusActive')}
            </span>
          ) : post.status === 'Fulfilled' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {t('needStatusFulfilled')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {t('needStatusClosed')}
            </span>
          )}
        </div>
      </div>

      {/* Material Reference Photo if present */}
      {(post.imageURL || post.imageUrl) && (
        <div className="relative w-full h-36 bg-stone-100 overflow-hidden border-b border-stone-100">
          <img
            src={post.imageURL || post.imageUrl}
            alt={`${post.plasticType} needed`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Main Card Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Badges: Polymer & Quantity */}
          <div className="flex flex-wrap items-center gap-2">
            <PlasticTypeBadge type={post.plasticType} />
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-stone-500" />
              <span>
                {post.requiredQuantity || 0} {post.unit ? (t(`unit${post.unit.charAt(0).toUpperCase() + post.unit.slice(1)}` as any) || post.unit) : 'kg'} {language === 'ar' ? 'مطلوب' : 'Needed'}
              </span>
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {post.description}
          </p>
        </div>

        {/* Dynamic Match Indicator */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          {matches.length > 0 ? (
            <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {matches.length} {language === 'ar' ? 'تقارير أفراد مطابقة' : 'matching reports'}
                </span>
              </div>
              {topMatch && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950 font-bold text-[10px]">
                  {language === 'ar' ? 'أعلى توافق:' : 'Top:'} {topMatch.score}%
                </span>
              )}
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ar' ? 'بانتظار بلاغات جديدة مطابقة' : 'Awaiting new matching listings'}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1">
              <span>{t('viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
            </span>

            {/* Owner action buttons */}
            {isOwner && (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {onToggleStatus && (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(post)}
                    className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded-md transition-colors"
                    title={post.status === 'Active' ? t('markFulfilled') : t('markActive')}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(post)}
                    className="p-1 text-stone-500 hover:text-blue-700 hover:bg-stone-100 rounded-md transition-colors"
                    title={t('edit')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(post)}
                    className="p-1 text-stone-500 hover:text-rose-700 hover:bg-stone-100 rounded-md transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
