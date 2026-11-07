import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlasticReport, PlasticType, QuantityUnit, AIScanResult, ReportStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { uploadUserMedia } from '../lib/userMedia';
import { AIScannerModal } from './AIScannerModal';
import { UserMediaUploader } from './media/UserMediaUploader';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Check, 
  MapPin, 
  Phone, 
  FileText,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (reportData: Partial<PlasticReport>) => Promise<void>;
  initialData?: PlasticReport | null;
  reportToEdit?: PlasticReport | null;
}

const plasticTypes: PlasticType[] = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'];
const quantityUnits: QuantityUnit[] = ['kg', 'tons', 'pieces'];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  reportToEdit
}) => {
  const activeInitial = reportToEdit !== undefined ? reportToEdit : initialData;
  const { t, language } = useLanguage();
  const { currentUser, userProfile, userRole } = useAuth();
  
  const [plasticType, setPlasticType] = useState<PlasticType>('PET');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<QuantityUnit>('kg');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [status, setStatus] = useState<ReportStatus>('Available');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [aiScanResult, setAiScanResult] = useState<AIScanResult | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeInitial) {
      setPlasticType(activeInitial.plasticType || 'PET');
      setQuantity(activeInitial.quantity ? String(activeInitial.quantity) : '');
      setUnit(activeInitial.unit || 'kg');
      setLocation(activeInitial.location || '');
      setDescription(activeInitial.description || '');
      setContactInfo(activeInitial.contactInfo || '');
      setImagePreview(activeInitial.imageURL || '');
      setStatus(activeInitial.status || 'Available');
      setAiScanResult(activeInitial.aiScanResult || null);
      setImageFile(null);
    } else {
      // Default initial states for new report
      setPlasticType('PET');
      setQuantity('');
      setUnit('kg');
      setLocation(userProfile?.location || '');
      setDescription('');
      setContactInfo(userProfile?.phone || '');
      setStatus('Available');
      setImagePreview('');
      setAiScanResult(null);
      setImageFile(null);
    }
    setError('');
  }, [activeInitial, isOpen, userProfile]);

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

  const handleApplyAiScan = (result: AIScanResult, imageBase64: string) => {
    if (result.plasticType && result.plasticType !== 'Other') {
      setPlasticType(result.plasticType as PlasticType);
    }
    setAiScanResult(result);
    setImagePreview(imageBase64);
    
    // Convert base64 to a File object for consistent backend upload
    try {
      const arr = imageBase64.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const scannedFile = new File([u8arr], `ai_scan_${Date.now()}.jpg`, { type: mime });
      setImageFile(scannedFile);
    } catch {
      // Keep preview if conversion fails
    }

    if (!description.trim()) {
      setDescription(
        language === 'ar'
          ? `${result.suggestedCategoryAr || ''} - ${result.tipsAr || ''}`
          : `${result.suggestedCategoryEn || ''} - ${result.tipsEn || ''}`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field validations
    const numQuantity = parseFloat(quantity);
    if (!plasticType || !quantity || isNaN(numQuantity) || numQuantity <= 0) {
      setError(language === 'ar' ? 'يرجى إدخال كمية صحيحة أكبر من الصفر' : 'Please enter a valid quantity greater than 0');
      return;
    }
    if (!location.trim()) {
      setError(language === 'ar' ? 'يرجى تحديد الموقع أو المدينة' : 'Please specify a location or city');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imagePreview;
      let finalImagePath = activeInitial?.imagePath || '';

      // Stable report ID for ownership-based cycle-user-media storage path
      const targetDocId = activeInitial?.id || doc(collection(db, 'reports')).id;

      if (imageFile) {
        setUploadProgress(
          language === 'ar'
            ? 'جاري رفع الصورة بأمان إلى مساحة cycle-user-media...'
            : 'Uploading image securely to cycle-user-media...'
        );
        const uploadRes = await uploadUserMedia({
          file: imageFile,
          folder: 'reports',
          resourceId: targetDocId,
          isNew: !activeInitial?.id,
          lang: language,
        });
        finalImageUrl = uploadRes.url;
        finalImagePath = uploadRes.storagePath;
      }

      const reportData: Partial<PlasticReport> = {
        plasticType,
        quantity: numQuantity,
        unit,
        location: location.trim(),
        description: description.trim(),
        contactInfo: contactInfo.trim(),
        imageURL: finalImageUrl,
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
        status: activeInitial?.id ? status : (activeInitial?.status || 'Available'),
        ...(aiScanResult ? { aiScanResult } : {})
      };

      if (onSubmit) {
        await onSubmit(reportData);
      } else {
        // Direct Firestore operation fallback
        if (activeInitial?.id) {
          const reportRef = doc(db, 'reports', activeInitial.id);
          await updateDoc(reportRef, {
            ...reportData,
            updatedAt: new Date().toISOString()
          });
        } else {
          const newDocRef = doc(db, 'reports', targetDocId);
          await setDoc(newDocRef, {
            ...reportData,
            creatorId: currentUser?.uid || 'guest',
            creatorName: userProfile?.name || currentUser?.displayName || 'Anonymous Contributor',
            creatorRole: userRole || 'individual',
            interestedOrgIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving plastic report:', err);
      setError(err?.message || (language === 'ar' ? 'فشل حفظ التقرير' : 'Failed to save report'));
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div 
      id="report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="report-modal-content"
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 text-stone-800 relative my-8 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {initialData ? t('editReport') : t('createReport')}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {language === 'ar' 
                ? 'أدخل بيانات البلاستيك بدقة لتسهيل تواصل جهات إعادة التدوير معك.' 
                : 'Provide accurate details to help recycling organizations collect your materials.'}
            </p>
          </div>
          <button
            id="btn-close-report-modal"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Organization notice if logged in as organization */}
        {userRole === 'organization' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">
                {language === 'ar' ? 'ملاحظة: أنت مسجل كجهة / منظمة' : 'Notice: You are signed in as an Organization'}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                {language === 'ar'
                  ? 'هذا النموذج مخصص للإبلاغ عن مخلفات بلاستيكية فردية. إذا كانت منشأتك ترغب في طلب خامات محددة أو توريدات من المجتمع، يرجى نشر "احتياج منظمة" من قسم طلبات المنظمات.'
                  : 'This form is for individual plastic waste listings. If your facility needs to procure specific plastic polymer volumes from the community, consider publishing an "Organization Need Post" instead.'}
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
          
          {/* AI Scanner Banner / Prompt */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  {t('aiScanner')}
                </p>
                <p className="text-[11px] text-emerald-700/90">
                  {language === 'ar'
                    ? 'التقط صورة وسيتعرف الذكاء الاصطناعي على نوع البلاستيك تلقائياً'
                    : 'Snap a photo to automatically identify polymer type and recyclability'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('scanWithAI')}</span>
            </button>
          </div>

          {/* AI Scan Verified Pill */}
          {aiScanResult && (
            <div className="p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-300 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                {language === 'ar' ? 'تم التعرف بواسطة الذكاء الاصطناعي:' : 'AI Classified:'}{' '}
                <span className="font-bold">{aiScanResult.plasticType}</span> ({aiScanResult.confidence}%)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {aiScanResult.recyclability}
              </span>
            </div>
          )}

          {/* Plastic Type & Unit/Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Plastic Type Select */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {t('plasticTypeLabel')} <span className="text-rose-500">*</span>
              </label>
              <select
                id="input-report-plastic-type"
                value={plasticType}
                onChange={(e) => setPlasticType(e.target.value as PlasticType)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                required
              >
                {plasticTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} {type === 'PET' ? '(1 - Bottles)' : type === 'HDPE' ? '(2 - Jugs/Containers)' : type === 'LDPE' ? '(4 - Bags/Films)' : type === 'PP' ? '(5 - Caps/Tubs)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity and Unit */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {t('quantityLabel')} & {t('quantityUnitLabel')} <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="input-report-quantity"
                  type="number"
                  step="any"
                  min="0.1"
                  placeholder="e.g. 50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  required
                />
                <select
                  id="input-report-unit"
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

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>{t('locationLabel')}</span> <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-report-location"
              type="text"
              placeholder={language === 'ar' ? 'مثال: حي الزهور، الرياض، أو عنوان التقاط' : 'e.g. Downtown District, Sector 4 or full address'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>{t('descriptionLabel')}</span>
            </label>
            <textarea
              id="input-report-description"
              rows={2}
              placeholder={language === 'ar' ? 'اذكر حالة البلاستيك (مغسول، مضغوط، معبأ في أكياس، إلخ)' : 'Describe condition, cleanliness, whether it is bagged or loose...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
            />
          </div>

          {/* Contact Information */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>{t('contactInfoLabel')}</span>
            </label>
            <input
              id="input-report-contact"
              type="text"
              placeholder={language === 'ar' ? 'رقم الهاتف أو الأوقات المناسبة للتسليم' : 'Phone number, WhatsApp, or preferred pickup times'}
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Status Selection when editing existing report */}
          {activeInitial?.id && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <span>{language === 'ar' ? 'حالة البلاغ' : 'Report Status'}</span>
              </label>
              <select
                id="select-edit-report-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                <option value="Available">{t('statusAvailable')}</option>
                <option value="In discussion">{t('statusInDiscussion')}</option>
                <option value="Reserved">{t('statusReserved')}</option>
                <option value="Collected">{t('statusCollected')}</option>
                <option value="Cancelled">{t('statusCancelled')}</option>
                <option value="Closed">{t('statusClosed')}</option>
              </select>
            </div>
          )}

          {/* User Media Photo Upload (cycle-user-media) */}
          <UserMediaUploader
            id="report-photo-uploader"
            folder="reports"
            resourceId={activeInitial?.id || 'new_report'}
            isNew={!activeInitial?.id}
            initialImageUrl={imagePreview}
            selectedFile={imageFile}
            onFileChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
              setError('');
            }}
            label={t('addPhoto')}
            hint={
              language === 'ar'
                ? 'التقط صورة للبلاستيك أو اخترها من جهازك لتأكيد النوع والحالة للجهات الراغبة في الجمع.'
                : 'Take or choose a photo of the plastic material to verify polymer type and physical condition.'
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
              id="btn-submit-report-form"
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
                  <span>{initialData ? t('saveChanges') : t('submit')}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Scanner Dialog */}
        <AIScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onApplyScan={handleApplyAiScan}
        />
      </div>
    </div>
  );
};
