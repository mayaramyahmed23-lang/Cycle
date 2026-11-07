import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OrganizationNeedPost, PlasticReport, PlasticType, NeedPostStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { OrganizationPostCard } from '../components/OrganizationPostCard';
import { OrganizationPostDetailModal } from '../components/OrganizationPostDetailModal';
import { PostNeedModal } from '../components/PostNeedModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { deleteNeedPostPermanently } from '../lib/deletion';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Building2, 
  Layers, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface OrganizationNeedsPageProps {
  allReports: PlasticReport[];
  onStartChatWithReporter?: (report: PlasticReport) => void;
  onPlanRouteWithReports?: (reports: PlasticReport[]) => void;
  onRequestAuth?: () => void;
}

const plasticTypes: Array<PlasticType | 'ALL'> = ['ALL', 'PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'];

export const OrganizationNeedsPage: React.FC<OrganizationNeedsPageProps> = ({
  allReports,
  onStartChatWithReporter,
  onPlanRouteWithReports,
  onRequestAuth,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, isOrganization, isAdmin } = useAuth();

  const [posts, setPosts] = useState<OrganizationNeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [selectedType, setSelectedType] = useState<PlasticType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<NeedPostStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<OrganizationNeedPost | null>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<OrganizationNeedPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<OrganizationNeedPost | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, 'organizationPosts'),
      (snapshot) => {
        const list: OrganizationNeedPost[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) } as OrganizationNeedPost);
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to organizationPosts:', err);
        setError(language === 'ar' ? 'تعذر جلب طلبات المنظمات' : 'Failed to load organization needs');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [language]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Tab filter
      if (activeTab === 'my') {
        if (!currentUser || post.organizationId !== currentUser.uid) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'ALL' && post.plasticType !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && post.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = post.organizationName?.toLowerCase().includes(q);
        const matchesLoc = post.location?.toLowerCase().includes(q);
        const matchesDesc = post.description?.toLowerCase().includes(q);
        const matchesType = post.plasticType?.toLowerCase().includes(q);
        if (!matchesName && !matchesLoc && !matchesDesc && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [posts, activeTab, selectedType, selectedStatus, searchQuery, currentUser]);

  const handleToggleStatus = async (post: OrganizationNeedPost) => {
    try {
      const newStatus = post.status === 'Active' ? 'Fulfilled' : 'Active';
      await updateDoc(doc(db, 'organizationPosts', post.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to toggle post status:', err);
    }
  };

  const handleDeletePost = (post: OrganizationNeedPost) => {
    setPostToDelete(post);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await deleteNeedPostPermanently(postToDelete.id);
      if (!res.success) {
        setDeleteError(res.error || (language === 'ar' ? 'فشل حذف المنشور من قاعدة البيانات' : 'Failed to delete need post from database.'));
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      if (selectedPostDetail?.id === postToDelete.id) {
        setSelectedPostDetail(null);
      }
      setIsDeleteModalOpen(false);
      setPostToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setDeleteError(err?.message || 'Error occurred during deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateClick = () => {
    if (!currentUser && onRequestAuth) {
      onRequestAuth();
      return;
    }
    setPostToEdit(null);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-800 text-white shadow-lg relative overflow-hidden">
        <div className="space-y-1.5 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200">
            <Package className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'سوق الاحتياجات الصناعية' : 'Industrial Demand Marketplace'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('orgNeeds')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
            {t('orgNeedsSubtitle')}
          </p>
        </div>

        {/* Call to action button */}
        <div className="z-10 shrink-0">
          {(isOrganization || isAdmin) ? (
            <button
              type="button"
              onClick={handleCreateClick}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-sm font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('postANeed')}</span>
            </button>
          ) : (
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs text-xs text-emerald-100 max-w-xs text-center">
              {language === 'ar'
                ? 'هل أنت مؤسسة أو مصنع تدوير؟ سجل حساب مؤسسة لنشر طلبات الخامات الخاصة بك.'
                : 'Are you a recycler or plant? Register an organization account to publish material needs.'}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs (All vs My Needs) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t('allNeedPosts')} ({posts.length})
          </button>
          {isOrganization && (
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('myNeedPosts')} (
              {posts.filter((p) => currentUser && p.organizationId === currentUser.uid).length})
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث بالاسم، الموقع، الخامة...' : 'Search by org, location, type...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Polymer Types */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500 mr-1 rtl:mr-0 rtl:ml-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>{t('filterByType')}:</span>
          </span>
          {plasticTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedType === type
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              {type === 'ALL' ? t('all') : type}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500">{t('filterByStatus')}:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">{t('all')}</option>
            <option value="Active">{t('needStatusActive')}</option>
            <option value="Fulfilled">{t('needStatusFulfilled')}</option>
            <option value="Closed">{t('needStatusClosed')}</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">{t('loading')}</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-stone-300 bg-stone-50/50 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-800">
              {t('noNeedPostsFound')}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {isOrganization
                ? t('postFirstNeed')
                : language === 'ar'
                ? 'جرب ضبط معايير التصفية أو قم بزيارة الصفحة لاحقاً.'
                : 'Try adjusting filters or check back shortly for updated industry requests.'}
            </p>
          </div>
          {isOrganization && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('postANeed')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <OrganizationPostCard
              key={post.id}
              post={post}
              allReports={allReports}
              onViewDetails={(p) => setSelectedPostDetail(p)}
              onEdit={(p) => {
                setPostToEdit(p);
                setIsCreateModalOpen(true);
              }}
              onDelete={handleDeletePost}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Post Need Modal (Create & Edit) */}
      <PostNeedModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPostToEdit(null);
        }}
        postToEdit={postToEdit}
      />

      {/* Detail & Potential Matching Reports Modal */}
      <OrganizationPostDetailModal
        isOpen={!!selectedPostDetail}
        onClose={() => setSelectedPostDetail(null)}
        post={selectedPostDetail}
        allReports={allReports}
        onStartChatWithReporter={onStartChatWithReporter}
        onPlanRouteWithReports={onPlanRouteWithReports}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title={postToDelete ? `${postToDelete.organizationName || 'Organization'}: ${postToDelete.plasticType}` : t('deleteNeed')}
        message={t('deleteNeedConfirm')}
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDeletePost}
        onCancel={() => {
          if (!deleteLoading) {
            setIsDeleteModalOpen(false);
            setPostToDelete(null);
            setDeleteError('');
          }
        }}
      />
    </div>
  );
};
