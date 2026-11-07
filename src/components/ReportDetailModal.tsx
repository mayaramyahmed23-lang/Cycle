import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlasticReport, ReportStatus, OrganizationNeedPost, MatchFactorBreakdown } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PlasticTypeBadge } from './PlasticTypeBadge';
import { StatusBadge } from './StatusBadge';
import { MatchScoreBadge } from './MatchScoreBadge';
import { MatchExplanationModal } from './MatchExplanationModal';
import { findMatchingNeedsForReport } from '../lib/matching';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  MessageSquare, 
  Building2, 
  Phone, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Loader2,
  FileText,
  Sparkles,
  ShieldCheck,
  Package
} from 'lucide-react';

interface ReportDetailModalProps {
  report: PlasticReport | null;
  isOpen: boolean;
  onClose: () => void;
  organizationPosts?: OrganizationNeedPost[];
  onStartChat?: (report: PlasticReport) => void;
  onContactOrganization?: (needPost: OrganizationNeedPost) => void;
  onUpdateStatus?: (reportId: string, status: ReportStatus) => Promise<void>;
  onStatusChange?: (reportId: string, status: ReportStatus) => Promise<void>;
  onEdit?: (report: PlasticReport) => void;
  onDelete?: (report: PlasticReport) => void;
}

const statusOptions: ReportStatus[] = ['Available', 'In discussion', 'Reserved', 'Collected', 'Cancelled', 'Closed'];

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  organizationPosts = [],
  onStartChat,
  onContactOrganization,
  onUpdateStatus,
  onStatusChange,
  onEdit,
  onDelete
}) => {
  const { t, language } = useLanguage();
  const { currentUser, isOrganization, isAdmin } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<ReportStatus>(report?.status || 'Available');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [explainingMatch, setExplainingMatch] = useState<{
    score: number;
    breakdown: MatchFactorBreakdown;
    title: string;
  } | null>(null);

  // Synchronize internal status state whenever active report changes or updates
  useEffect(() => {
    if (report?.status) {
      setCurrentStatus(report.status);
      setImageError(false);
    }
  }, [report?.id, report?.status]);

  // Compute matching organization requests
  const matchingNeeds = useMemo(() => {
    if (!report || organizationPosts.length === 0) return [];
    return findMatchingNeedsForReport(report, organizationPosts, 25);
  }, [report, organizationPosts]);

  if (!isOpen || !report) return null;

  const isOwner = currentUser?.uid === report.creatorId;
  const canManage = isOwner || isAdmin;

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
      const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const handleStatusUpdate = async (newStatus: ReportStatus) => {
    if (!report) return;
    if (newStatus === currentStatus) return;

    // 1. Optimistic UI update
    setCurrentStatus(newStatus);
    setUpdatingStatus(true);

    try {
      const statusFn = onStatusChange || onUpdateStatus;
      if (statusFn) {
        await statusFn(report.id, newStatus);
      } else {
        await updateDoc(doc(db, 'reports', report.id), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      // Revert if write fails
      setCurrentStatus(report.status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div 
      id="report-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="report-detail-modal-content"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 text-stone-800 relative my-8 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-3">
            <PlasticTypeBadge type={report.plasticType} size="lg" />
            <StatusBadge status={currentStatus} size="md" />
            {report.aiScanResult && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Verified</span>
              </span>
            )}
          </div>
          <button
            id="btn-close-detail-modal"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Main Photo if available */}
          {(report.imageURL || report.imageUrl) && !imageError && (
            <div className="w-full h-64 sm:h-72 bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
              <img 
                src={report.imageURL || report.imageUrl} 
                alt={`${report.plasticType} waste detail`}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Title and Key Details */}
          <div>
            <h2 className="text-2xl font-bold text-stone-900">
              {report.quantity} {report.unit} {report.plasticType}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 mt-2">
              <span className="flex items-center gap-1.5 font-medium text-stone-700">
                <User className="w-4 h-4 text-stone-400" />
                {report.creatorName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-stone-400" />
                {report.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-stone-400" />
                {formatDate(report.createdAt)}
              </span>
            </div>
          </div>

          {/* AI Scan Inspection Card if available */}
          {report.aiScanResult && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{t('aiScanner')}: {report.aiScanResult.plasticType}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-800">
                  {report.aiScanResult.confidence}% {t('scanConfidence')}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                {language === 'ar'
                  ? report.aiScanResult.suggestedCategoryAr
                  : report.aiScanResult.suggestedCategoryEn}
              </p>
            </div>
          )}

          {/* Description */}
          {report.description && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                {t('descriptionLabel')}
              </h4>
              <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
                {report.description}
              </p>
            </div>
          )}

          {/* Contact Information (If available) */}
          {report.contactInfo && (
            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                <span>{t('contactInfoLabel')}</span>
              </h4>
              <p className="text-sm font-medium text-emerald-900">
                {report.contactInfo}
              </p>
            </div>
          )}

          {/* SECTION: MATCHING ORGANIZATIONS */}
          {matchingNeeds.length > 0 && (
            <div className="pt-3 border-t border-stone-200 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  {t('matchingOrgsForReport')} ({matchingNeeds.length})
                </h4>
              </div>
              <p className="text-xs text-stone-500">
                {t('matchingOrgsForReportDesc')}
              </p>

              <div className="space-y-2.5">
                {matchingNeeds.slice(0, 4).map(({ needPost, score, breakdown }) => (
                  <div
                    key={needPost.id}
                    className="p-3 rounded-xl border border-stone-200 hover:border-emerald-300 bg-stone-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {needPost.organizationName}
                        </p>
                        <p className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                          <span>{needPost.location}</span>
                          <span>•</span>
                          <span>
                            {language === 'ar' ? 'يحتاج:' : 'Needs:'} {needPost.requiredQuantity} {needPost.unit}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <MatchScoreBadge
                        score={score}
                        breakdown={breakdown}
                        showWhyButton
                        onClickWhy={() =>
                          setExplainingMatch({
                            score,
                            breakdown,
                            title: `${needPost.organizationName} • ${needPost.plasticType} (${needPost.requiredQuantity} ${needPost.unit})`,
                          })
                        }
                      />

                      {onContactOrganization && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onContactOrganization(needPost);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{t('contact')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Management for Owner or Admin */}
          {canManage && (
            <div className="pt-4 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                {language === 'ar' ? 'تحديث حالة التقرير' : 'Update Report Status'}
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    id={`btn-status-${(opt || '').toLowerCase().replace(/\s+/g, '-')}`}
                    disabled={updatingStatus}
                    onClick={() => handleStatusUpdate(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border active:scale-95 ${
                      currentStatus === opt
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {updatingStatus && currentStatus === opt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <StatusBadge status={opt} size="sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canManage && onEdit && (
              <button
                id="btn-modal-edit-report"
                onClick={() => {
                  onClose();
                  onEdit(report);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-white transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('edit')}</span>
              </button>
            )}
            {canManage && onDelete && (
              <button
                id="btn-modal-delete-report"
                onClick={() => {
                  onClose();
                  onDelete(report);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('delete')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Start Chat Button for Organization */}
            {isOrganization && !isOwner && onStartChat && (
              <button
                id="btn-modal-start-chat"
                onClick={() => {
                  onClose();
                  onStartChat(report);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('startChatBtn')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              {t('close')}
            </button>
          </div>
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

