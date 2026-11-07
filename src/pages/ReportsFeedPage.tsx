import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlasticReport, PlasticType, ReportStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ReportCard } from '../components/ReportCard';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Layers, 
  MapPin, 
  Loader2, 
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  Package
} from 'lucide-react';

interface ReportsFeedPageProps {
  onOpenDetails: (report: PlasticReport) => void;
  onStartChat: (report: PlasticReport) => void;
  onEditReport: (report: PlasticReport) => void;
  onDeleteReport: (report: PlasticReport) => void;
  onCreateReport: () => void;
}

const plasticTypesList: (PlasticType | 'All')[] = ['All', 'PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'];
const statusList: (ReportStatus | 'All')[] = ['All', 'Available', 'In discussion', 'Collected', 'Closed'];

export const ReportsFeedPage: React.FC<ReportsFeedPageProps> = ({
  onOpenDetails,
  onStartChat,
  onEditReport,
  onDeleteReport,
  onCreateReport
}) => {
  const { t, language } = useLanguage();
  const { currentUser, isIndividual } = useAuth();

  const [reports, setReports] = useState<PlasticReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PlasticType | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'All'>('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'quantity'>('newest');

  // Real-time Firestore sync for all plastic reports
  useEffect(() => {
    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const list: PlasticReport[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PlasticReport);
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setReports(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching plastic reports:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered and Sorted list
  const filteredReports = reports.filter((r) => {
    // Type filter
    if (selectedType !== 'All' && r.plasticType !== selectedType) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'All' && r.status !== selectedStatus) {
      return false;
    }

    // Location filter
    if (locationFilter.trim() && !(r.location || '').toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }

    // Search keyword
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchLoc = r.location?.toLowerCase().includes(q);
      const matchName = r.creatorName?.toLowerCase().includes(q);
      const matchType = r.plasticType?.toLowerCase().includes(q);
      if (!matchDesc && !matchLoc && !matchName && !matchType) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'quantity') {
      return (b.quantity || 0) - (a.quantity || 0);
    }
    // Default newest
    return 0;
  });

  return (
    <div id="page-reports-feed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-1.5 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'السوق المباشر للبلاستيك' : 'Live Plastic Marketplace'}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('feedTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {t('feedSubtitle')}
          </p>
        </div>

        {(!currentUser || isIndividual) && (
          <button
            id="btn-feed-create-report"
            onClick={onCreateReport}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-bold shadow-md transition-transform hover:scale-[1.02] shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('reportPlasticBtn')}</span>
          </button>
        )}
      </div>

      {/* Search & Filtering Control Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-4">
        
        {/* Search Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Main Keyword Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-feed-search"
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm bg-stone-50/50"
            />
          </div>

          {/* Location Filter */}
          <div className="sm:col-span-3 relative">
            <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-feed-location-filter"
              type="text"
              placeholder={t('filterByLocation')}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm bg-stone-50/50"
            />
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-3">
            <select
              id="select-feed-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm bg-white"
            >
              <option value="All">{t('filterByStatus')}: {t('all')}</option>
              <option value="Available">{t('statusAvailable')}</option>
              <option value="In discussion">{t('statusInDiscussion')}</option>
              <option value="Reserved">{t('statusReserved')}</option>
              <option value="Collected">{t('statusCollected')}</option>
              <option value="Cancelled">{t('statusCancelled')}</option>
              <option value="Closed">{t('statusClosed')}</option>
            </select>
          </div>
        </div>

        {/* Plastic Polymer Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs font-semibold">
          <span className="text-stone-400 flex items-center gap-1 shrink-0 px-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('plasticTypeLabel')}:</span>
          </span>
          {plasticTypesList.map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                id={`filter-pill-${(type || 'all').toLowerCase()}`}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                {type === 'All' ? t('all') : type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <span>
          {language === 'ar' 
            ? `عرض ${filteredReports.length} من إجمالي ${reports.length} تقرير` 
            : `Showing ${filteredReports.length} of ${reports.length} reports`}
        </span>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <span>{language === 'ar' ? 'الترتيب حسب:' : 'Sort by:'}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-transparent border-none font-semibold text-stone-700 focus:outline-hidden cursor-pointer"
          >
            <option value="newest">{language === 'ar' ? 'الأحدث' : 'Newest'}</option>
            <option value="quantity">{language === 'ar' ? 'الأعلى كمية' : 'Highest Quantity'}</option>
          </select>
        </div>
      </div>

      {/* Feed Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">{t('loading')}</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-800">
            {t('noReportsFound')}
          </h3>
          <p className="text-xs text-stone-500">
            {language === 'ar' 
              ? 'جرّب تغيير خيارات التصفية أو ابحث بكلمات مختلفة.' 
              : 'Try clearing your search query or selecting another polymer filter.'}
          </p>
          {(!currentUser || isIndividual) && (
            <button
              onClick={onCreateReport}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('beTheFirstToReport')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpenDetails={onOpenDetails}
              onStartChat={onStartChat}
              onEdit={onEditReport}
              onDelete={onDeleteReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};
