import React, { useState, useMemo } from 'react';
import { OrganizationNeedPost, PlasticReport, MatchFactorBreakdown } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PlasticTypeBadge } from './PlasticTypeBadge';
import { MatchScoreBadge } from './MatchScoreBadge';
import { MatchExplanationModal } from './MatchExplanationModal';
import { findMatchingReportsForNeed } from '../lib/matching';
import { 
  X, 
  Building2, 
  MapPin, 
  Package, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Phone,
  Mail,
  Share2,
  ExternalLink
} from 'lucide-react';

interface OrganizationPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: OrganizationNeedPost | null;
  allReports: PlasticReport[];
  onStartChatWithReporter?: (report: PlasticReport) => void;
  onPlanRouteWithReports?: (reports: PlasticReport[]) => void;
}

export const OrganizationPostDetailModal: React.FC<OrganizationPostDetailModalProps> = ({
  isOpen,
  onClose,
  post,
  allReports,
  onStartChatWithReporter,
  onPlanRouteWithReports,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, userRole, isAdmin } = useAuth();

  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [explainingMatch, setExplainingMatch] = useState<{
    score: number;
    breakdown: MatchFactorBreakdown;
    title: string;
  } | null>(null);

  const isOwner = currentUser && post && (post.organizationId === currentUser.uid || isAdmin);

  // Compute matches
  const matches = useMemo(() => {
    if (!post) return [];
    return findMatchingReportsForNeed(post, allReports, 20);
  }, [post, allReports]);

  if (!isOpen || !post) return null;

  const toggleSelectReport = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const handleCreateRouteWithSelected = () => {
    if (!onPlanRouteWithReports) return;
    const selected = allReports.filter((r) => selectedReportIds.includes(r.id));
    if (selected.length > 0) {
      onPlanRouteWithReports(selected);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 text-stone-800 relative my-8 animate-in zoom-in-95 duration-150 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-6 border-b border-stone-100 bg-stone-50/80 flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border border-emerald-200 shadow-2xs">
              {post.organizationLogoURL ? (
                <img
                  src={post.organizationLogoURL}
                  alt={post.organizationName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-stone-900 truncate">
                  {post.organizationName}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    post.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                >
                  {post.status === 'Active' ? t('needStatusActive') : post.status}
                </span>
              </div>
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{post.location}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Requirement Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 block">
                  {t('requiredQuantityLabel')}
                </span>
                <span className="text-base font-extrabold text-stone-900">
                  {post.requiredQuantity}{' '}
                  {t(`unit${post.unit.charAt(0).toUpperCase() + post.unit.slice(1)}` as any) || post.unit}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center gap-3">
              <div className="shrink-0">
                <PlasticTypeBadge type={post.plasticType} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 block">
                  {t('plasticTypeLabel')}
                </span>
                <span className="text-xs text-stone-600 font-medium">
                  {language === 'ar' ? 'بوليمر مستهدف لإعادة التدوير' : 'Target Recycled Polymer'}
                </span>
              </div>
            </div>
          </div>

          {/* Description & Specifications */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              {t('materialDescriptionLabel')}
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 whitespace-pre-line">
              {post.description}
            </p>
          </div>

          {/* Reference Image if any */}
          {(post.imageURL || post.imageUrl) && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                {language === 'ar' ? 'صورة مرجعية للخامة' : 'Reference Material Photo'}
              </h4>
              <div className="rounded-xl overflow-hidden border border-stone-200 max-h-56 bg-stone-100">
                <img
                  src={post.imageURL || post.imageUrl}
                  alt="Reference material"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* SECTION: POTENTIAL MATCHING REPORTS */}
          <div className="pt-3 border-t border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-stone-900">
                    {t('potentialMatches')} ({matches.length})
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('cycleFoundMatches')}
                </p>
              </div>

              {/* Multi-select route action if owner */}
              {isOwner && selectedReportIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleCreateRouteWithSelected}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>
                    {language === 'ar'
                      ? `تخطيط مسار (${selectedReportIds.length})`
                      : `Plan Route (${selectedReportIds.length})`}
                  </span>
                </button>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-stone-50 border border-stone-200 text-stone-500 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs font-semibold text-stone-700">
                  {t('noMatchesYet')}
                </p>
                <p className="text-[11px] max-w-sm mx-auto">
                  {t('noMatchesYetDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map(({ report, score, breakdown }) => {
                  const isSelected = selectedReportIds.includes(report.id);
                  return (
                    <div
                      key={report.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-stone-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {isOwner && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectReport(report.id)}
                              className="mt-1 w-4 h-4 rounded-sm border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              title={language === 'ar' ? 'تحديد للمسار اللوجستي' : 'Select for collection route'}
                            />
                          )}

                          {(report.imageURL || report.imageUrl) && (
                            <img
                              src={report.imageURL || report.imageUrl}
                              alt="Report material"
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0"
                            />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-stone-900 truncate">
                                {report.creatorName}
                              </span>
                              <PlasticTypeBadge type={report.plasticType} />
                              <span className="text-xs font-bold text-stone-700">
                                {report.quantity} {report.unit}
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-1 truncate">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{report.location}</span>
                              <span className="mx-1">•</span>
                              <span
                                className={`font-semibold ${
                                  report.status === 'Available'
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {report.status}
                              </span>
                            </p>

                            {report.description && (
                              <p className="text-[11px] text-stone-600 line-clamp-1 mt-1">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Match Score & Actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <MatchScoreBadge
                            score={score}
                            breakdown={breakdown}
                            showWhyButton
                            onClickWhy={() =>
                              setExplainingMatch({
                                score,
                                breakdown,
                                title: `${report.creatorName} • ${report.plasticType} (${report.quantity} ${report.unit})`,
                              })
                            }
                          />

                          {onStartChatWithReporter && (
                            <button
                              type="button"
                              onClick={() => {
                                onStartChatWithReporter(report);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{t('contact')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            {post.organizationPhone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>{post.organizationPhone}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            {t('close')}
          </button>
        </div>

        {/* Detailed "Why this match?" Explanation Modal */}
        {explainingMatch && (
          <MatchExplanationModal
            isOpen={true}
            onClose={() => setExplainingMatch(null)}
            score={explainingMatch.score}
            breakdown={explainingMatch.breakdown}
            targetTitle={explainingMatch.title}
          />
        )}
      </div>
    </div>
  );
};
