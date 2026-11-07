import React from 'react';
import { ReportStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, Clock, Check, XCircle, BookmarkCheck, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status?: ReportStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useLanguage();

  const config: Record<
    string,
    { labelKey: any; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    Available: {
      labelKey: 'statusAvailable',
      bg: 'bg-emerald-50 text-emerald-700',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    'In discussion': {
      labelKey: 'statusInDiscussion',
      bg: 'bg-amber-50 text-amber-700',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    Reserved: {
      labelKey: 'statusReserved',
      bg: 'bg-purple-50 text-purple-700',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <BookmarkCheck className="w-3.5 h-3.5" />
    },
    Collected: {
      labelKey: 'statusCollected',
      bg: 'bg-blue-50 text-blue-700',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Check className="w-3.5 h-3.5" />
    },
    Cancelled: {
      labelKey: 'statusCancelled',
      bg: 'bg-rose-50 text-rose-700',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <Ban className="w-3.5 h-3.5" />
    },
    Closed: {
      labelKey: 'statusClosed',
      bg: 'bg-stone-100 text-stone-600',
      text: 'text-stone-600',
      border: 'border-stone-200',
      icon: <XCircle className="w-3.5 h-3.5" />
    }
  };

  const safeStatus = (status || 'Available') as ReportStatus;
  const item = config[safeStatus] || config.Available;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const safeSlug = (safeStatus || 'available').toString().toLowerCase().replace(/\s+/g, '-');

  return (
    <span
      id={`badge-status-${safeSlug}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${item.bg} ${item.border} ${sizeClasses}`}
    >
      {item.icon}
      <span>{t(item.labelKey)}</span>
    </span>
  );
};
