import React from 'react';
import { PlasticType } from '../types';

interface PlasticTypeBadgeProps {
  type?: PlasticType | string;
  showCode?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const plasticDetails: Record<
  string, 
  { code: number; name: string; bg: string; text: string; border: string }
> = {
  PET: { code: 1, name: 'PETE / PET', bg: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-700', border: 'border-emerald-200' },
  HDPE: { code: 2, name: 'HDPE', bg: 'bg-teal-50 text-teal-800', text: 'text-teal-700', border: 'border-teal-200' },
  PVC: { code: 3, name: 'PVC', bg: 'bg-amber-50 text-amber-800', text: 'text-amber-700', border: 'border-amber-200' },
  LDPE: { code: 4, name: 'LDPE', bg: 'bg-cyan-50 text-cyan-800', text: 'text-cyan-700', border: 'border-cyan-200' },
  PP: { code: 5, name: 'PP', bg: 'bg-blue-50 text-blue-800', text: 'text-blue-700', border: 'border-blue-200' },
  PS: { code: 6, name: 'PS', bg: 'bg-orange-50 text-orange-800', text: 'text-orange-700', border: 'border-orange-200' },
  Other: { code: 7, name: 'OTHER (7)', bg: 'bg-purple-50 text-purple-800', text: 'text-purple-700', border: 'border-purple-200' }
};

export const PlasticTypeBadge: React.FC<PlasticTypeBadgeProps> = ({ 
  type, 
  showCode = true,
  size = 'md' 
}) => {
  const safeType = (type || 'Other') as PlasticType;
  const details = plasticDetails[safeType] || plasticDetails.Other;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-semibold'
  };

  const safeSlug = (safeType || 'other').toString().toLowerCase();

  return (
    <span 
      id={`badge-plastic-${safeSlug}`}
      className={`inline-flex items-center gap-1.5 rounded-md border ${details.bg} ${details.border} ${sizeClasses[size]}`}
    >
      {showCode && (
        <span className="flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-white/80 border border-current">
          {details.code}
        </span>
      )}
      <span>{safeType}</span>
    </span>
  );
};
