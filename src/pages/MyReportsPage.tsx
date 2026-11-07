import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlasticReport } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ReportCard } from '../components/ReportCard';
import { 
  FileText, 
  PlusCircle, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Package, 
  Archive 
} from 'lucide-react';

interface MyReportsPageProps {
  onOpenDetails: (report: PlasticReport) => void;
  onEditReport: (report: PlasticReport) => void;
  onDeleteReport: (report: PlasticReport) => void;
  onCreateReport: () => void;
}

export const MyReportsPage: React.FC<MyReportsPageProps> = ({
  onOpenDetails,
  onEditReport,
  onDeleteReport,
  onCreateReport
}) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const [myReports, setMyReports] = useState<PlasticReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'collected'>('all');

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const q = query(
      collection(db, 'reports'),
      where('creatorId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PlasticReport[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PlasticReport);
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setMyReports(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching personal reports:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const filteredReports = myReports.filter((r) => {
    if (statusTab === 'active') {
      return r.status === 'Available' || r.status === 'In discussion' || r.status === 'Reserved';
    }
    if (statusTab === 'collected') {
      return r.status === 'Collected' || r.status === 'Closed' || r.status === 'Cancelled';
    }
    return true;
  });

  const totalKg = myReports.reduce((acc, curr) => {
    const qty = curr.quantity || 0;
    if (curr.unit === 'tons') return acc + qty * 1000;
    return acc + qty;
  }, 0);

  return (
    <div id="page-my-reports" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-700" />
            <span>{t('myReportsTitle')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {t('myReportsSubtitle')}
          </p>
        </div>

        <button
          id="btn-my-reports-create"
          onClick={onCreateReport}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('createReport')}</span>
        </button>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs text-stone-500 font-medium">{t('adminTotalReports')}</span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{myReports.length}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs text-stone-500 font-medium">
            {language === 'ar' ? 'البلاغات النشطة' : 'Active Listings'}
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {myReports.filter((r) => r.status === 'Available' || r.status === 'In discussion').length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs text-stone-500 font-medium">
            {language === 'ar' ? 'إجمالي الحجم المرصود (كجم)' : 'Total Tracked Weight (kg)'}
          </span>
          <p className="text-2xl font-bold text-teal-700 mt-1">
            {totalKg.toLocaleString()} kg
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setStatusTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusTab === 'all'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {t('all')} ({myReports.length})
        </button>

        <button
          onClick={() => setStatusTab('active')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusTab === 'active'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {language === 'ar' ? 'النشطة والمحجوزة' : 'Active & Reserved'} ({myReports.filter((r) => r.status === 'Available' || r.status === 'In discussion' || r.status === 'Reserved').length})
        </button>

        <button
          onClick={() => setStatusTab('collected')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusTab === 'collected'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {language === 'ar' ? 'تم الجمع / مغلق / ملغي' : 'Collected / Closed / Cancelled'} ({myReports.filter((r) => r.status === 'Collected' || r.status === 'Closed' || r.status === 'Cancelled').length})
        </button>
      </div>

      {/* List / Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs font-medium">{t('loading')}</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-800">
            {t('noPersonalReports')}
          </h3>
          <p className="text-xs text-stone-500">
            {language === 'ar' 
              ? 'يمكنك إنشاء تقرير بلاستيكي جديد وتحديد نوعه وموقعه ليصل إلى جهات التدوير فوراً.' 
              : 'Post your plastic waste materials to connect with recycling facilities in your region.'}
          </p>
          <button
            onClick={onCreateReport}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('createNewReportNow')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpenDetails={onOpenDetails}
              onEdit={onEditReport}
              onDelete={onDeleteReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};
