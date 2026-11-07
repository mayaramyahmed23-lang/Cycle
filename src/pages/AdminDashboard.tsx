import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  UserProfile, 
  OrganizationProfile, 
  PlasticReport, 
  ReportStatus, 
  AppSettings, 
  MediaItem,
  OrganizationNeedPost 
} from '../types';
import { PlasticTypeBadge } from '../components/PlasticTypeBadge';
import { StatusBadge } from '../components/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { HomepageMediaManager } from '../components/media/HomepageMediaManager';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { deleteReportPermanently, deleteNeedPostPermanently } from '../lib/deletion';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  Palette, 
  Video, 
  QrCode, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Plus, 
  ExternalLink, 
  Eye, 
  Save, 
  Sparkles,
  RefreshCw,
  Search,
  Package
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenReportDetails: (report: PlasticReport) => void;
  openQRModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenReportDetails,
  openQRModal
}) => {
  const { currentUser, isAdmin, loading } = useAuth();
  const { t, language } = useLanguage();
  const { settings, updateSettings } = useTheme();

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'needs' | 'users' | 'orgs' | 'homepage' | 'media' | 'settings'>('overview');

  // Admin Data states
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [orgsList, setOrgsList] = useState<OrganizationProfile[]>([]);
  const [reportsList, setReportsList] = useState<PlasticReport[]>([]);
  const [needsList, setNeedsList] = useState<OrganizationNeedPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [needSearch, setNeedSearch] = useState('');

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'report' | 'need';
    id: string;
    title: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Homepage Settings form state
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Fetch all collections manually when refresh button is clicked
  const loadAdminData = async () => {
    setLoadingData(true);
    try {
      const [usersSnap, orgsSnap, reportsSnap, needsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'organizations')),
        getDocs(collection(db, 'reports')),
        getDocs(collection(db, 'organizationPosts')),
      ]);
      const uList: UserProfile[] = [];
      usersSnap.forEach((d) => uList.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsersList(uList);

      const oList: OrganizationProfile[] = [];
      orgsSnap.forEach((d) => oList.push({ uid: d.id, ...d.data() } as OrganizationProfile));
      setOrgsList(oList);

      const rList: PlasticReport[] = [];
      reportsSnap.forEach((d) => rList.push({ id: d.id, ...d.data() } as PlasticReport));
      rList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setReportsList(rList);

      const nList: OrganizationNeedPost[] = [];
      needsSnap.forEach((d) => nList.push({ id: d.id, ...d.data() } as OrganizationNeedPost));
      nList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNeedsList(nList);
    } catch (err) {
      console.error('Error loading admin data manually:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Real-time synchronization for Admin collections
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingData(true);

    // 1. Subscribe to Reports in real-time
    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const rList: PlasticReport[] = [];
        snap.forEach((d) => rList.push({ id: d.id, ...d.data() } as PlasticReport));
        rList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setReportsList(rList);
        setLoadingData(false);
      },
      (err) => console.error('Error in admin reports snapshot:', err)
    );

    // 2. Subscribe to Users in real-time
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => uList.push({ uid: d.id, ...d.data() } as UserProfile));
        setUsersList(uList);
      },
      (err) => console.error('Error in admin users snapshot:', err)
    );

    // 3. Subscribe to Organizations in real-time
    const unsubOrgs = onSnapshot(
      collection(db, 'organizations'),
      (snap) => {
        const oList: OrganizationProfile[] = [];
        snap.forEach((d) => oList.push({ uid: d.id, ...d.data() } as OrganizationProfile));
        setOrgsList(oList);
      },
      (err) => console.error('Error in admin orgs snapshot:', err)
    );

    // 4. Subscribe to Organization Need Posts in real-time
    const unsubNeeds = onSnapshot(
      collection(db, 'organizationPosts'),
      (snap) => {
        const nList: OrganizationNeedPost[] = [];
        snap.forEach((d) => nList.push({ id: d.id, ...d.data() } as OrganizationNeedPost));
        nList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setNeedsList(nList);
      },
      (err) => console.error('Error in admin needs snapshot:', err)
    );

    return () => {
      unsubReports();
      unsubUsers();
      unsubOrgs();
      unsubNeeds();
    };
  }, [isAdmin]);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Wait for auth verification to complete
  if (loading) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-stone-500">
          {language === 'ar' ? 'جارٍ التحقق من الصلاحيات...' : 'Verifying administrator access...'}
        </p>
      </div>
    );
  }

  // If user is not admin, deny access immediately
  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-2xl border border-rose-200 text-center shadow-lg space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">{t('adminAccessDenied')}</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          {language === 'ar' 
            ? 'هذه الصفحة مخصصة لمديري النظام فقط. يرجى تسجيل الدخول بحساب مسؤول للوصول إلى لوحة التحكم.' 
            : 'This command center is restricted to administrators. Please log in with an admin account.'}
        </p>
      </div>
    );
  }

  // Update Report Status
  const handleUpdateReportStatus = async (reportId: string, status: ReportStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status,
        updatedAt: new Date().toISOString()
      });
      setReportsList((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    } catch (err) {
      console.error('Failed to change report status:', err);
    }
  };

  // Update Need Post Status
  const handleUpdateNeedStatus = async (postId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Fulfilled' : 'Active';
      await updateDoc(doc(db, 'organizationPosts', postId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setNeedsList((prev) => prev.map((n) => (n.id === postId ? { ...n, status: newStatus as any } : n)));
    } catch (err) {
      console.error('Failed to toggle need post status:', err);
    }
  };

  // Prompt delete for Report
  const promptDeleteReport = (report: PlasticReport) => {
    setItemToDelete({
      type: 'report',
      id: report.id,
      title: `${report.plasticType} (${report.quantity} ${report.unit}) - ${report.creatorName || report.creatorEmail || 'Reporter'}`
    });
    setDeleteError('');
  };

  // Prompt delete for Need Post
  const promptDeleteNeedPost = (post: OrganizationNeedPost) => {
    setItemToDelete({
      type: 'need',
      id: post.id,
      title: `${post.organizationName || 'Organization'}: ${post.plasticType} (${post.requiredQuantity} ${post.unit})`
    });
    setDeleteError('');
  };

  // Confirm and execute permanent deletion
  const handleConfirmAdminDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      if (itemToDelete.type === 'report') {
        const res = await deleteReportPermanently(itemToDelete.id);
        if (!res.success) {
          setDeleteError(res.error || (language === 'ar' ? 'فشل حذف التقرير من قاعدة البيانات' : 'Failed to delete report from database.'));
          return;
        }
        setReportsList((prev) => prev.filter((r) => r.id !== itemToDelete.id));
        setActionFeedback({
          type: 'success',
          message: language === 'ar' ? 'تم حذف التقرير والوسائط المرتبطة به نهائياً من قاعدة البيانات.' : 'Report and associated media permanently deleted from Firestore.'
        });
      } else {
        const res = await deleteNeedPostPermanently(itemToDelete.id);
        if (!res.success) {
          setDeleteError(res.error || (language === 'ar' ? 'فشل حذف طلب المنظمة من قاعدة البيانات' : 'Failed to delete need post from database.'));
          return;
        }
        setNeedsList((prev) => prev.filter((n) => n.id !== itemToDelete.id));
        setActionFeedback({
          type: 'success',
          message: language === 'ar' ? 'تم حذف منشور الاحتياج والوسائط المرتبطة به نهائياً من قاعدة البيانات.' : 'Organization need post and media permanently deleted from Firestore.'
        });
      }

      setItemToDelete(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Admin deletion execution failed:', err);
      setDeleteError(err?.message || 'Unexpected deletion error occurred.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings(formSettings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Computed metrics
  const totalVolumeKg = reportsList.reduce((acc, curr) => {
    const q = curr.quantity || 0;
    if (curr.unit === 'tons') return acc + q * 1000;
    return acc + q;
  }, 0);

  const availableReportsCount = reportsList.filter((r) => r.status === 'Available').length;
  const inDiscussionCount = reportsList.filter((r) => r.status === 'In discussion').length;
  const reservedCount = reportsList.filter((r) => r.status === 'Reserved').length;
  const collectedCount = reportsList.filter((r) => r.status === 'Collected').length;
  const cancelledCount = reportsList.filter((r) => r.status === 'Cancelled').length;
  const closedCount = reportsList.filter((r) => r.status === 'Closed').length;

  return (
    <div id="page-admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-stone-900 text-white p-6 rounded-2xl shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('adminDashboard')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('adminWelcome')}</h1>
          <p className="text-xs text-stone-400">
            {language === 'ar' ? 'إدارة المستخدمين والمؤسسات والتقارير ومحتوى الواجهة العامة.' : 'Manage registered accounts, plastic reports, and live homepage settings.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="p-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openQRModal}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-white text-xs font-bold transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>{t('qrCode')}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)} 
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600 no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-emerald-700" />
          <span>{t('adminOverview')}</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'reports' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-700" />
          <span>{t('adminReports')} ({reportsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('needs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'needs' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-700" />
          <span>{language === 'ar' ? 'طلبات المنظمات' : 'Org Needs'} ({needsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'users' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-700" />
          <span>{t('adminUsers')} ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orgs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'orgs' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-700" />
          <span>{t('adminOrgs')} ({orgsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('homepage')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'homepage' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-700" />
          <span>{t('adminHomepage')}</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'media' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <Video className="w-4 h-4 text-rose-700" />
          <span>{t('adminMedia')}</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold">{t('adminTotalReports')}</span>
              <p className="text-3xl font-extrabold text-stone-900">{reportsList.length}</p>
              <div className="flex gap-2 text-[11px] text-stone-500 pt-1">
                <span className="text-emerald-700 font-bold">{availableReportsCount} {t('statusAvailable')}</span>
                <span>•</span>
                <span className="text-blue-700 font-bold">{collectedCount} {t('statusCollected')}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold">{t('adminRecycledWeight')}</span>
              <p className="text-3xl font-extrabold text-emerald-700">
                {(totalVolumeKg / 1000).toFixed(1)} <span className="text-sm text-stone-500">{t('unitTons')}</span>
              </p>
              <p className="text-[11px] text-stone-400">{totalVolumeKg.toLocaleString()} kg reported</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold">{t('adminTotalUsers')}</span>
              <p className="text-3xl font-extrabold text-stone-900">{usersList.length}</p>
              <p className="text-[11px] text-stone-400">Individuals & Community</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold">{t('adminTotalOrgs')}</span>
              <p className="text-3xl font-extrabold text-teal-700">{orgsList.length}</p>
              <p className="text-[11px] text-stone-400">Recyclers & Collectors</p>
            </div>
          </div>

          {/* Status Breakdown & Quick Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'توزيع حالات بلاغات البلاستيك' : 'Plastic Report Status Breakdown'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t('statusAvailable')}</span>
                    <span className="text-emerald-700">{availableReportsCount}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 rounded-full" 
                      style={{ width: `${reportsList.length ? (availableReportsCount / reportsList.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t('statusInDiscussion')}</span>
                    <span className="text-amber-700">{inDiscussionCount}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${reportsList.length ? (inDiscussionCount / reportsList.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t('statusReserved')}</span>
                    <span className="text-purple-700">{reservedCount}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full" 
                      style={{ width: `${reportsList.length ? (reservedCount / reportsList.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t('statusCollected')}</span>
                    <span className="text-blue-700">{collectedCount}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${reportsList.length ? (collectedCount / reportsList.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t('statusCancelled')}</span>
                    <span className="text-rose-600">{cancelledCount}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full" 
                      style={{ width: `${reportsList.length ? (cancelledCount / reportsList.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t('statusClosed')}</span>
                    <span className="text-stone-500">{closedCount}</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-stone-400 rounded-full" 
                      style={{ width: `${reportsList.length ? (closedCount / reportsList.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Live Verification */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'إجراءات الإدارة السريعة' : 'Admin Shortcuts & Verification'}
              </h3>
              
              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveTab('homepage')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-700" />
                    <span>{language === 'ar' ? 'تعديل نصوص وألوان وهوية الموقع' : 'Customize Branding & Homepage Text'}</span>
                  </span>
                  <Edit3 className="w-4 h-4 text-stone-400" />
                </button>

                <button
                  onClick={() => setActiveTab('media')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-700" />
                    <span>{language === 'ar' ? 'إضافة وسائط وفيديوهات توعوية' : 'Add Educational & Demo Videos'}</span>
                  </span>
                  <Plus className="w-4 h-4 text-stone-400" />
                </button>

                <button
                  onClick={openQRModal}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>{t('qrTitle')}</span>
                  </span>
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORTS MANAGEMENT */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-stone-900">
              {t('adminReports')} ({reportsList.length})
            </h3>
            
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase">
                  <th className="p-3">ID / Polymer</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {reportsList
                  .filter((r) => {
                    const q = reportSearch.toLowerCase();
                    return (
                      r.plasticType?.toLowerCase().includes(q) ||
                      r.location?.toLowerCase().includes(q) ||
                      r.creatorName?.toLowerCase().includes(q)
                    );
                  })
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <PlasticTypeBadge type={r.plasticType} size="sm" />
                          <span className="font-mono text-[10px] text-stone-400">{r.id.slice(0, 6)}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-stone-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="p-3 max-w-[140px] truncate">{r.location}</td>
                      <td className="p-3 font-medium">{r.creatorName}</td>
                      <td className="p-3">
                        <select
                          value={r.status}
                          onChange={(e) => handleUpdateReportStatus(r.id, e.target.value as ReportStatus)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold border border-stone-200 bg-white"
                        >
                          <option value="Available">{t('statusAvailable')}</option>
                          <option value="In discussion">{t('statusInDiscussion')}</option>
                          <option value="Reserved">{t('statusReserved')}</option>
                          <option value="Collected">{t('statusCollected')}</option>
                          <option value="Cancelled">{t('statusCancelled')}</option>
                          <option value="Closed">{t('statusClosed')}</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenReportDetails(r)}
                            className="p-1 text-stone-500 hover:text-stone-900 rounded"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => promptDeleteReport(r)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title={language === 'ar' ? 'حذف التقرير نهائياً' : 'Permanently Delete Report'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ORGANIZATION NEEDS MANAGEMENT */}
      {activeTab === 'needs' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-stone-900">
              {language === 'ar' ? 'طلبات المنظمات' : 'Organization Needs'} ({needsList.length})
            </h3>
            
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={needSearch}
                onChange={(e) => setNeedSearch(e.target.value)}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase">
                  <th className="p-3">{language === 'ar' ? 'المنظمة' : 'Organization'}</th>
                  <th className="p-3">{language === 'ar' ? 'نوع البوليمر والكمية' : 'Polymer & Quantity'}</th>
                  <th className="p-3">{language === 'ar' ? 'الموقع' : 'Location'}</th>
                  <th className="p-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {needsList
                  .filter((n) => {
                    const q = needSearch.toLowerCase();
                    return (
                      n.plasticType?.toLowerCase().includes(q) ||
                      n.location?.toLowerCase().includes(q) ||
                      n.organizationName?.toLowerCase().includes(q) ||
                      n.description?.toLowerCase().includes(q)
                    );
                  })
                  .map((n) => (
                    <tr key={n.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {n.organizationLogoURL ? (
                            <img
                              src={n.organizationLogoURL}
                              alt={n.organizationName || ''}
                              className="w-7 h-7 rounded-full object-cover border border-stone-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                              {n.organizationName?.slice(0, 1) || 'O'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-stone-900">{n.organizationName || 'Organization'}</p>
                            <p className="text-[10px] text-stone-400 font-mono">{n.id.slice(0, 6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <PlasticTypeBadge type={n.plasticType} size="sm" />
                          <span className="font-bold text-stone-900">
                            {n.requiredQuantity} {n.unit}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 max-w-[140px] truncate text-stone-600">{n.location || '—'}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleUpdateNeedStatus(n.id, n.status)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                            n.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {n.status === 'Active' 
                            ? (language === 'ar' ? 'نشط' : 'Active') 
                            : (language === 'ar' ? 'مكتمل' : 'Fulfilled')}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => promptDeleteNeedPost(n)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title={language === 'ar' ? 'حذف طلب المنظمة نهائياً' : 'Permanently Delete Need Post'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {needsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400 text-xs">
                      {language === 'ar' ? 'لا توجد طلبات احتياج للمنظمات حالياً.' : 'No organization need posts recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-stone-900">
              {t('adminUsers')} ({usersList.length})
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search')}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase">
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {usersList
                  .filter((u) => {
                    const q = userSearch.toLowerCase();
                    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                  })
                  .map((u) => (
                    <tr key={u.uid} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3 font-semibold text-stone-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-3 text-stone-600">{u.email}</td>
                      <td className="p-3">{u.phone || '—'}</td>
                      <td className="p-3">{u.location || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ORGANIZATIONS */}
      {activeTab === 'orgs' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-stone-900">
              {t('adminOrgs')} ({orgsList.length})
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search')}
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase">
                  <th className="p-3">Organization</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {orgsList
                  .filter((o) => {
                    const q = orgSearch.toLowerCase();
                    return o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q);
                  })
                  .map((o) => (
                    <tr key={o.uid} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3 font-semibold text-stone-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span>{o.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                          {o.orgType}
                        </span>
                      </td>
                      <td className="p-3 text-stone-600">{o.email}</td>
                      <td className="p-3">{o.phone || '—'}</td>
                      <td className="p-3">{o.location || '—'}</td>
                      <td className="p-3 max-w-[200px] truncate text-stone-500">{o.description || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HOMEPAGE CONTENT & BRANDING */}
      {activeTab === 'homepage' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">{t('adminHomepage')} & {t('adminSettings')}</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {language === 'ar' ? 'تغيير اسم التطبيق وألوان الهوية ونصوص الواجهة الرئيسية في الوقت الفعلي.' : 'Control application brand name, theme colors, and public copy in real-time.'}
              </p>
            </div>

            <button
              id="btn-admin-save-settings"
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{t('adminSaveSettings')}</span>
            </button>
          </div>

          {settingsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{t('adminSettingsSaved')}</span>
            </div>
          )}

          {/* Basic App Branding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminAppNameLabel')}</label>
              <input
                type="text"
                value={formSettings.appName}
                onChange={(e) => setFormSettings({ ...formSettings, appName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminLogoUrlLabel')}</label>
              <input
                type="text"
                placeholder="https://.../logo.png"
                value={formSettings.logoUrl || ''}
                onChange={(e) => setFormSettings({ ...formSettings, logoUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminPrimaryColor')}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formSettings.primaryColor}
                  onChange={(e) => setFormSettings({ ...formSettings, primaryColor: e.target.value })}
                  className="w-10 h-9 p-0.5 rounded border border-stone-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formSettings.primaryColor}
                  onChange={(e) => setFormSettings({ ...formSettings, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminSecondaryColor')}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formSettings.secondaryColor}
                  onChange={(e) => setFormSettings({ ...formSettings, secondaryColor: e.target.value })}
                  className="w-10 h-9 p-0.5 rounded border border-stone-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formSettings.secondaryColor}
                  onChange={(e) => setFormSettings({ ...formSettings, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section Visibility Toggles */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">{t('adminSectionsVisibility')}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-stone-700">
              {Object.keys(formSettings.sectionsVisibility).map((secKey) => (
                <label key={secKey} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formSettings.sectionsVisibility as any)[secKey]}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        sectionsVisibility: {
                          ...formSettings.sectionsVisibility,
                          [secKey]: e.target.checked
                        }
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="capitalize">{secKey}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bilingual Hero Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminHeroTitleEn')}</label>
              <input
                type="text"
                value={formSettings.heroTitleEn}
                onChange={(e) => setFormSettings({ ...formSettings, heroTitleEn: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminHeroTitleAr')}</label>
              <input
                type="text"
                value={formSettings.heroTitleAr}
                onChange={(e) => setFormSettings({ ...formSettings, heroTitleAr: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminHeroSubtitleEn')}</label>
              <textarea
                rows={2}
                value={formSettings.heroSubtitleEn}
                onChange={(e) => setFormSettings({ ...formSettings, heroSubtitleEn: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminHeroSubtitleAr')}</label>
              <textarea
                rows={2}
                value={formSettings.heroSubtitleAr}
                onChange={(e) => setFormSettings({ ...formSettings, heroSubtitleAr: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs resize-none"
              />
            </div>
          </div>

          {/* Problem Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminProblemTextEn')}</label>
              <textarea
                rows={2}
                value={formSettings.problemTextEn}
                onChange={(e) => setFormSettings({ ...formSettings, problemTextEn: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminProblemTextAr')}</label>
              <textarea
                rows={2}
                value={formSettings.problemTextAr}
                onChange={(e) => setFormSettings({ ...formSettings, problemTextAr: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs resize-none"
              />
            </div>
          </div>

          {/* How It Works Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminHowItWorksEn')}</label>
              <textarea
                rows={2}
                value={formSettings.howItWorksEn}
                onChange={(e) => setFormSettings({ ...formSettings, howItWorksEn: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminHowItWorksAr')}</label>
              <textarea
                rows={2}
                value={formSettings.howItWorksAr}
                onChange={(e) => setFormSettings({ ...formSettings, howItWorksAr: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs resize-none"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 6: MEDIA MANAGER (VIDEOS, IMAGES, LOGOS, & HOMEPAGE CMS) */}
      {activeTab === 'media' && (
        <HomepageMediaManager />
      )}

      {/* Admin Permanent Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        title={itemToDelete?.title}
        message={itemToDelete?.type === 'report' ? t('deleteReportConfirm') : t('deleteNeedConfirm')}
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmAdminDelete}
        onCancel={() => {
          if (!deleteLoading) {
            setItemToDelete(null);
            setDeleteError('');
          }
        }}
      />

    </div>
  );
};
