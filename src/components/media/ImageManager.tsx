import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { MediaUploaderOrUrl, MediaPayload } from './MediaUploaderOrUrl';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MediaItem } from '../../types';
import { 
  ImageIcon, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Layout,
  ExternalLink,
  Edit2
} from 'lucide-react';

export const ImageManager: React.FC = () => {
  const { t, language } = useLanguage();
  const { settings, updateSettings } = useTheme();

  const [activeSlot, setActiveSlot] = useState<'hero' | 'about' | 'howItWorks' | 'gallery'>('hero');
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newImageTitleEn, setNewImageTitleEn] = useState('');
  const [newImageTitleAr, setNewImageTitleAr] = useState('');
  const [newImageDescEn, setNewImageDescEn] = useState('');
  const [newImageDescAr, setNewImageDescAr] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load gallery images from Firestore
  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const q = query(collection(db, 'media'));
      const snap = await getDocs(q);
      const list: MediaItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.type === 'image') {
          list.push({ id: d.id, ...data } as MediaItem);
        }
      });
      setGalleryImages(list);
    } catch (err) {
      console.warn('Could not load gallery images from firestore:', err);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  // Save specific core section images
  const handleSaveSectionImage = async (section: 'hero' | 'about' | 'howItWorks', payload: MediaPayload) => {
    try {
      if (section === 'hero') {
        await updateSettings({
          heroImageUrl: payload.url,
          heroImageType: payload.source
        });
      } else if (section === 'about') {
        await updateSettings({
          aboutImageUrl: payload.url,
          aboutImageType: payload.source
        });
      } else if (section === 'howItWorks') {
        await updateSettings({
          howItWorksImageUrl: payload.url,
          howItWorksImageType: payload.source
        });
      }

      setStatusMsg({
        type: 'success',
        text: t('uploadSuccessMsg')
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Error saving section image:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || t('errUploadFailed')
      });
    }
  };

  // Remove specific section image
  const handleRemoveSectionImage = async (section: 'hero' | 'about' | 'howItWorks') => {
    if (!window.confirm(t('confirmDeleteMedia'))) return;
    try {
      if (section === 'hero') {
        await updateSettings({ heroImageUrl: '', heroImageType: undefined });
      } else if (section === 'about') {
        await updateSettings({ aboutImageUrl: '', aboutImageType: undefined });
      } else if (section === 'howItWorks') {
        await updateSettings({ howItWorksImageUrl: '', howItWorksImageType: undefined });
      }
      setStatusMsg({ type: 'success', text: t('mediaDeletedSuccess') });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('Error deleting section image:', err);
    }
  };

  // Add custom gallery image item to Firestore
  const handleSaveGalleryImage = async (payload: MediaPayload) => {
    try {
      const newDoc: Omit<MediaItem, 'id'> = {
        titleEn: newImageTitleEn.trim() || payload.fileName || 'Homepage Image',
        titleAr: newImageTitleAr.trim() || newImageTitleEn.trim() || 'صورة الواجهة',
        type: 'image',
        source: payload.source,
        category: 'promotional',
        section: 'general',
        url: payload.url,
        storagePath: payload.storagePath,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        mimeType: payload.mimeType,
        descriptionEn: newImageDescEn.trim(),
        descriptionAr: newImageDescAr.trim() || newImageDescEn.trim(),
        visible: true,
        order: galleryImages.length + 1,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'media'), newDoc);
      setGalleryImages((prev) => [...prev, { id: docRef.id, ...newDoc }]);
      
      setShowAddModal(false);
      setNewImageTitleEn('');
      setNewImageTitleAr('');
      setNewImageDescEn('');
      setNewImageDescAr('');

      setStatusMsg({ type: 'success', text: t('mediaSavedSuccess') });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to save gallery image:', err);
      setStatusMsg({ type: 'error', text: err?.message || t('errUploadFailed') });
    }
  };

  // Delete gallery image
  const handleDeleteGalleryImage = async (id: string) => {
    if (!window.confirm(t('confirmDeleteMedia'))) return;
    try {
      await deleteDoc(doc(db, 'media', id));
      setGalleryImages((prev) => prev.filter((img) => img.id !== id));
      setStatusMsg({ type: 'success', text: t('mediaDeletedSuccess') });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('Failed to delete media:', err);
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (item: MediaItem) => {
    try {
      const nextVisible = item.visible === false ? true : false;
      await updateDoc(doc(db, 'media', item.id), {
        visible: nextVisible
      });
      setGalleryImages((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, visible: nextVisible } : i))
      );
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  return (
    <div id="section-image-manager" className="space-y-6 animate-in fade-in">
      
      {/* Top Slot Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600 no-scrollbar">
        <button
          onClick={() => setActiveSlot('hero')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeSlot === 'hero' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <span>{t('heroImageTitle')}</span>
        </button>

        <button
          onClick={() => setActiveSlot('about')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeSlot === 'about' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <span>{t('aboutImageTitle')}</span>
        </button>

        <button
          onClick={() => setActiveSlot('howItWorks')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeSlot === 'howItWorks' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <span>{t('howItWorksImageTitle')}</span>
        </button>

        <button
          onClick={() => setActiveSlot('gallery')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeSlot === 'gallery' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'hover:text-stone-900'
          }`}
        >
          <span>{language === 'ar' ? 'معرض صور المنصة' : 'Homepage Image Gallery'} ({galleryImages.length})</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* SLOT 1: HERO IMAGE */}
      {activeSlot === 'hero' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">{t('heroImageTitle')}</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {language === 'ar' ? 'الصورة المعروضة في خلفية أو بطاقة القسم العلوي بالصفحة الرئيسية.' : 'The background visual or side illustration for the top hero banner.'}
                </p>
              </div>

              {settings.heroImageUrl && (
                <button
                  onClick={() => handleRemoveSectionImage('hero')}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('delete')}</span>
                </button>
              )}
            </div>

            {settings.heroImageUrl && (
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-900 p-2 flex items-center justify-center">
                <img
                  src={settings.heroImageUrl}
                  alt="Hero Preview"
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>
            )}

            <MediaUploaderOrUrl
              mediaType="image"
              currentUrl={settings.heroImageUrl || ''}
              folder="homepage"
              label={settings.heroImageUrl ? t('replaceCurrentMedia') : t('uploadFromDevice')}
              onSave={(payload) => handleSaveSectionImage('hero', payload)}
            />
          </div>
        </div>
      )}

      {/* SLOT 2: ABOUT / PROBLEM SECTION IMAGE */}
      {activeSlot === 'about' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">{t('aboutImageTitle')}</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {language === 'ar' ? 'الرسم التوضيحي لقسم المشكلة البيئية وإعادة التدوير.' : 'The contextual diagram or illustration for the environmental challenge section.'}
                </p>
              </div>

              {settings.aboutImageUrl && (
                <button
                  onClick={() => handleRemoveSectionImage('about')}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('delete')}</span>
                </button>
              )}
            </div>

            {settings.aboutImageUrl && (
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50 p-2 flex items-center justify-center">
                <img
                  src={settings.aboutImageUrl}
                  alt="About Section Preview"
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>
            )}

            <MediaUploaderOrUrl
              mediaType="image"
              currentUrl={settings.aboutImageUrl || ''}
              folder="homepage"
              label={settings.aboutImageUrl ? t('replaceCurrentMedia') : t('uploadFromDevice')}
              onSave={(payload) => handleSaveSectionImage('about', payload)}
            />
          </div>
        </div>
      )}

      {/* SLOT 3: HOW IT WORKS IMAGE */}
      {activeSlot === 'howItWorks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">{t('howItWorksImageTitle')}</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {language === 'ar' ? 'الرسم البياني التوضيحي لمراحل التدوير الثلاثة.' : 'The visual flow diagram representing the 3-step circular lifecycle.'}
                </p>
              </div>

              {settings.howItWorksImageUrl && (
                <button
                  onClick={() => handleRemoveSectionImage('howItWorks')}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('delete')}</span>
                </button>
              )}
            </div>

            {settings.howItWorksImageUrl && (
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50 p-2 flex items-center justify-center">
                <img
                  src={settings.howItWorksImageUrl}
                  alt="How It Works Preview"
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>
            )}

            <MediaUploaderOrUrl
              mediaType="image"
              currentUrl={settings.howItWorksImageUrl || ''}
              folder="homepage"
              label={settings.howItWorksImageUrl ? t('replaceCurrentMedia') : t('uploadFromDevice')}
              onSave={(payload) => handleSaveSectionImage('howItWorks', payload)}
            />
          </div>
        </div>
      )}

      {/* SLOT 4: GALLERY / GENERAL IMAGES */}
      {activeSlot === 'gallery' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {language === 'ar' ? 'الصور الترويجية والمعرض' : 'Promotional & Gallery Images'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {language === 'ar' ? 'إضافة صور إضافية واستعراضية للمنصة.' : 'Manage additional image assets displayed throughout the public portal.'}
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(!showAddModal)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة صورة جديدة' : 'Add Image Asset'}</span>
              </button>
            </div>

            {/* Modal / Form to add new image */}
            {showAddModal && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminMediaTitle')} (EN)</label>
                    <input
                      type="text"
                      placeholder="e.g. PET Plastic Pellet Factory"
                      value={newImageTitleEn}
                      onChange={(e) => setNewImageTitleEn(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminMediaTitle')} (AR)</label>
                    <input
                      type="text"
                      placeholder="مثال: مصنع حبيبات البلاستيك"
                      value={newImageTitleAr}
                      onChange={(e) => setNewImageTitleAr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <MediaUploaderOrUrl
                  mediaType="image"
                  folder="images"
                  label={t('chooseSource')}
                  showCancel={true}
                  onCancel={() => setShowAddModal(false)}
                  onSave={handleSaveGalleryImage}
                />
              </div>
            )}

            {/* List of images */}
            {galleryImages.length === 0 && !loadingGallery ? (
              <div className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                {t('noMediaFound')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {galleryImages.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-stone-200">
                        <img
                          src={item.url}
                          alt={item.titleEn || item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {language === 'ar' ? item.titleAr || item.titleEn : item.titleEn || item.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 line-clamp-1">
                          {item.fileName || item.source}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                      <button
                        onClick={() => handleToggleVisibility(item)}
                        className={`inline-flex items-center gap-1 font-semibold ${
                          item.visible !== false ? 'text-emerald-700' : 'text-stone-400'
                        }`}
                      >
                        {item.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{item.visible !== false ? t('visibilityShow') : t('visibilityHide')}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGalleryImage(item.id)}
                        className="p-1 text-rose-600 hover:text-rose-700"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
