import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OrganizationNeedPost, PlasticType, QuantityUnit, NeedPostStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { uploadUserMedia } from '../lib/userMedia';
import { UserMediaUploader } from './media/UserMediaUploader';
import { 
  X, 
  Upload, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Check, 
  MapPin, 
  FileText,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';

interface PostNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: OrganizationNeedPost | null;
  onSuccess?: () => void;
}

const plasticTypes: PlasticType[] = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'];
const quantityUnits: QuantityUnit[] = ['kg', 'tons'];

export const PostNeedModal: React.FC<PostNeedModalProps> = ({
  isOpen,
  onClose,
  postToEdit,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, userProfile, userRole, isAdmin } = useAuth();

  const [plasticType, setPlasticType] = useState<PlasticType>('PET');
  const [requiredQuantity, setRequiredQuantity] = useState<string>('');
  const [unit, setUnit] = useState<QuantityUnit>('kg');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<NeedPostStatus>('Active');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (postToEdit) {
      setPlasticType(postToEdit.plasticType || 'PET');
      setRequiredQuantity(postToEdit.requiredQuantity ? String(postToEdit.requiredQuantity) : '');
      setUnit(postToEdit.unit || 'kg');
      setLocation(postToEdit.location || '');
      setDescription(postToEdit.description || '');
      setStatus(postToEdit.status || 'Active');
      setImagePreview(postToEdit.imageURL || '');
      setImageFile(null);
    } else {
      setPlasticType('PET');
      setRequiredQuantity('');
      setUnit('kg');
      setLocation(userProfile?.location || '');
      setDescription('');
      setStatus('Active');
      setImagePreview('');
      setImageFile(null);
    }
    setError('');
  }, [postToEdit, isOpen, userProfile]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        setError(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 12 ميجابايت' : 'Image size must be under 12MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError(
        language === 'ar'
          ? 'يجب تسجيل الدخول بحساب مؤسسة أو مصنع لنشر متطلبات الخامات.'
          : 'You must be signed in with an organization account to publish material requirements.'
      );
      return;
    }

    if (userRole === 'individual' && !isAdmin) {
      setError(
        language === 'ar'
          ? 'حسابك الحالي مسجل كفرد. نشر طلبات الخامات مخصص للمصانع والمنظمات فقط. يمكنك استخدام "إبلاغ عن بلاستيك" لعرض المواد المتوفرة لديك.'
          : 'Your account is registered as an Individual. Need posts are reserved for recycling facilities and manufacturing plants. Please use Report Plastic to list your materials instead.'
      );
      return;
    }

    const numQuantity = parseFloat(requiredQuantity);
    if (!plasticType || !requiredQuantity || isNaN(numQuantity) || numQuantity <= 0) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال كمية مطلوبة صحيحة أكبر من الصفر'
          : 'Please enter a valid required quantity greater than 0'
      );
      return;
    }

    if (!location.trim()) {
      setError(language === 'ar' ? 'يرجى تحديد الموقع أو المدينة' : 'Please specify a location or city');
      return;
    }

    if (!description.trim()) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال وصف لمواصفات المادة المطلوبة'
          : 'Please enter specifications for the required plastic'
      );
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imagePreview;
      let finalImagePath = postToEdit?.imagePath || '';

      const targetDocId = postToEdit?.id || doc(collection(db, 'organizationPosts')).id;

      if (imageFile) {
        setUploadProgress(
          language === 'ar'
            ? 'جاري رفع الصورة بأمان إلى مساحة cycle-user-media...'
            : 'Uploading image securely to cycle-user-media...'
        );
        const uploadRes = await uploadUserMedia({
          file: imageFile,
          folder: 'organization-posts',
          resourceId: targetDocId,
          isNew: !postToEdit?.id,
          lang: language,
        });
        finalImageUrl = uploadRes.url;
        finalImagePath = uploadRes.storagePath;
      }

      const postData: Partial<OrganizationNeedPost> = {
        organizationId: currentUser?.uid || 'guest_org',
        organizationName: userProfile?.name || currentUser?.displayName || 'Recycling Organization',
        organizationLocation: userProfile?.location || location.trim(),
        organizationPhone: userProfile?.phone || '',
        organizationEmail: currentUser?.email || '',
        organizationLogoURL: userProfile?.photoURL || '',
        plasticType,
        requiredQuantity: numQuantity,
        unit,
        location: location.trim(),
        description: description.trim(),
        imageURL: finalImageUrl,
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
        status,
        updatedAt: new Date().toISOString(),
      };

      if (postToEdit?.id) {
        const postRef = doc(db, 'organizationPosts', postToEdit.id);
        await updateDoc(postRef, postData);
      } else {
        const newDocRef = doc(db, 'organizationPosts', targetDocId);
        await setDoc(newDocRef, {
          ...postData,
          createdAt: new Date().toISOString(),
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving need post:', err);
      setError(
        err?.message ||
          (language === 'ar' ? 'فشل حفظ طلب الخامات' : 'Failed to save material requirement post')
      );
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 text-stone-800 relative my-8 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {postToEdit ? t('editNeedPost') : t('createNeedPost')}
              </h2>
              <p className="text-xs text-stone-500">
                {language === 'ar'
                  ? 'أعلن عن نوع وكمية البلاستيك التي تحتاجها مصانعك للتنسيق المباشر مع الأفراد.'
                  : 'Announce materials your organization needs to connect with local individual suppliers.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Notice if Individual */}
        {userRole === 'individual' && !isAdmin && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">
                {language === 'ar' ? 'تنبيه: أنت مسجل بحساب فرد' : 'Notice: You are signed in as an Individual'}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                {language === 'ar'
                  ? 'طلبات الاحتياج مخصصة لمنشآت إعادة التدوير والمصانع لطلب خامات بلاستيكية. إذا كان لديك بلاستيك تريد عرضه أو الإبلاغ عنه، يرجى استخدام زر "إبلاغ عن بلاستيك".'
                  : 'Need posts are reserved for recycling factories and commercial processors requesting material supply. If you have plastic items to report or contribute, please use "Report Plastic" instead.'}
              </p>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Plastic Type & Required Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plastic Type Select */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('plasticTypeLabel')}</span> <span className="text-rose-500">*</span>
              </label>
              <select
                value={plasticType}
                onChange={(e) => setPlasticType(e.target.value as PlasticType)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                required
              >
                {plasticTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} {type === 'PET' ? '(1 - Bottles)' : type === 'HDPE' ? '(2 - Jugs/Drums)' : type === 'LDPE' ? '(4 - Films)' : type === 'PP' ? '(5 - Crates/Tubs)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Required Quantity & Unit */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {t('requiredQuantityLabel')} <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  placeholder="e.g. 500"
                  value={requiredQuantity}
                  onChange={(e) => setRequiredQuantity(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  required
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                  className="w-24 px-2 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  {quantityUnits.map((u) => (
                    <option key={u} value={u}>
                      {t(`unit${u.charAt(0).toUpperCase() + u.slice(1)}` as any) || u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{t('locationLabel')}</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder={language === 'ar' ? 'المدينة / المنطقة / مقر المصنع' : 'City, Industrial Zone, or Depot address'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {language === 'ar' ? 'حالة الطلب' : 'Requirement Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NeedPostStatus)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                <option value="Active">{t('needStatusActive')}</option>
                <option value="Fulfilled">{t('needStatusFulfilled')}</option>
                <option value="Closed">{t('needStatusClosed')}</option>
              </select>
            </div>
          </div>

          {/* Material Specifications & Requirements */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>{t('materialDescriptionLabel')}</span> <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder={
                language === 'ar'
                  ? 'حدد الشروط (مثلاً: مفروز ونظيف، بالات مضغوطة، خالي من الزيوت، قابل للاستلام الفوري من موقعكم...)'
                  : 'Specify condition criteria (e.g. sorted and washed, baled or shredded, minimum batch size, pickup terms...)'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
              required
            />
          </div>

          {/* User Media Photo Upload (cycle-user-media) */}
          <UserMediaUploader
            id="post-need-photo-uploader"
            folder="organization-posts"
            resourceId={postToEdit?.id || 'new_need_post'}
            isNew={!postToEdit?.id}
            initialImageUrl={imagePreview}
            selectedFile={imageFile}
            onFileChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
              setError('');
            }}
            label={language === 'ar' ? 'صورة توضيحية للمواصفات المطلوبة' : 'Sample or Reference Material Photo'}
            hint={
              language === 'ar'
                ? 'ارفع صورة نموذجية للخامة المطلوبة لمساعدة الأفراد على مطابقة العبوات والمواد بدقة.'
                : 'Upload a reference photo to help individuals match polymer condition and packaging accurately.'
            }
          />

          {/* Form Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploadProgress || t('saving')}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{postToEdit ? t('saveChanges') : t('submit')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
