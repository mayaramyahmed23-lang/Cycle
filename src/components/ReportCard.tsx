import React from 'react';
import { PlasticReport } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PlasticTypeBadge } from './PlasticTypeBadge';
import { StatusBadge } from './StatusBadge';
import { 
  MapPin, 
  Calendar, 
  User, 
  MessageSquare, 
  Eye, 
  Building2, 
  Trash2, 
  Edit3, 
  Phone,
  Package
} from 'lucide-react';

interface ReportCardProps {
  report: PlasticReport;
  onOpenDetails: (report: PlasticReport) => void;
  onStartChat?: (report: PlasticReport) => void;
  onEdit?: (report: PlasticReport) => void;
  onDelete?: (report: PlasticReport) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onOpenDetails,
  onStartChat,
  onEdit,
  onDelete
}) => {
  const { t, language } = useLanguage();
  const { currentUser, isOrganization, isAdmin } = useAuth();

  const isOwner = currentUser?.uid === report.creatorId;
  const canManage = isOwner || isAdmin;

  // Format date nicely
  const formatDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
      const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div 
      id={`report-card-${report.id}`}
      className="bg-white rounded-xl border border-stone-200 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
    >
      {/* Image Banner if present */}
      {(report.imageURL || report.imageUrl) ? (
        <div 
          className="relative w-full h-44 bg-stone-100 overflow-hidden cursor-pointer"
          onClick={() => onOpenDetails(report)}
        >
          <img
            src={report.imageURL || report.imageUrl}
            alt={`${report.plasticType || 'Plastic'} waste`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5">
            <StatusBadge status={report.status} size="sm" />
          </div>
          <div className="absolute bottom-2.5 left-2.5 rtl:left-auto rtl:right-2.5">
            <PlasticTypeBadge type={report.plasticType} size="sm" />
          </div>
        </div>
      ) : (
        <div 
          className="w-full h-24 bg-stone-50 border-b border-stone-100 flex items-center justify-between px-4 cursor-pointer"
          onClick={() => onOpenDetails(report)}
        >
          <PlasticTypeBadge type={report.plasticType} size="md" />
          <StatusBadge status={report.status} size="sm" />
        </div>
      )}

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Header Info */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 
              onClick={() => onOpenDetails(report)}
              className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition-colors cursor-pointer line-clamp-1"
            >
              {report.quantity || 0} {report.unit || 'kg'} {report.plasticType || 'Plastic'}
            </h3>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{report.location || '—'}</span>
          </div>

          {/* Description snippet */}
          {report.description && (
            <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed">
              {report.description}
            </p>
          )}
        </div>

        {/* Footer Meta info */}
        <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-medium text-stone-700 truncate max-w-[120px]">
                {report.creatorName}
              </span>
            </span>

            <span className="flex items-center gap-1 text-stone-400">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(report.createdAt)}</span>
            </span>
          </div>

          {/* Interested Organizations Tag */}
          {report.interestedOrgIds && report.interestedOrgIds.length > 0 && (
            <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium">
              <Building2 className="w-3 h-3" />
              <span>
                {report.interestedOrgIds.length} {t('interestedOrgs')}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            id={`btn-view-report-${report.id}`}
            onClick={() => onOpenDetails(report)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('viewDetails')}</span>
          </button>

          {/* Organization Contact Button */}
          {isOrganization && !isOwner && onStartChat && (
            <button
              id={`btn-chat-report-${report.id}`}
              onClick={() => onStartChat(report)}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('contact')}</span>
            </button>
          )}

          {/* Owner/Admin Management Controls */}
          {canManage && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  id={`btn-edit-report-${report.id}`}
                  onClick={() => onEdit(report)}
                  className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  title={t('edit')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  id={`btn-delete-report-${report.id}`}
                  onClick={() => onDelete(report)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
