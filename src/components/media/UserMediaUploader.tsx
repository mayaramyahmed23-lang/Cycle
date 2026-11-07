import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  FileWarning, 
  Loader2 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { validateUserImageFile, uploadUserMedia, UserMediaUploadResponse } from '../../lib/userMedia';

export interface UserMediaUploaderProps {
  id?: string;
  folder: 'reports' | 'organization-posts';
  resourceId: string;
  isNew?: boolean;
  initialImageUrl?: string;
  selectedFile: File | null;
  onFileChange: (file: File | null, previewUrl: string) => void;
  label?: string;
  hint?: string;
}

export const UserMediaUploader: React.FC<UserMediaUploaderProps> = ({
  id = 'user-media-uploader',
  folder,
  resourceId,
  isNew = false,
  initialImageUrl = '',
  selectedFile,
  onFileChange,
  label,
  hint,
}) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string>(initialImageUrl || '');
  const [error, setError] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Keep preview in sync if initialImageUrl changes externally
  useEffect(() => {
    if (initialImageUrl && !selectedFile) {
      setPreviewUrl(initialImageUrl);
    }
  }, [initialImageUrl, selectedFile]);

  const processFile = (file: File) => {
    setError('');
    const validation = validateUserImageFile(file, language);
    if (!validation.valid) {
      setError(validation.error || (language === 'ar' ? 'ملف غير صالح' : 'Invalid file'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadStatus('idle');
    setStatusMessage('');
    onFileChange(file, objectUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input so same file can be re-selected if replaced
    e.target.value = '';
  };

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setError('');
    setUploadStatus('idle');
    setStatusMessage('');
    onFileChange(null, '');
  };

  const handleRetry = async () => {
    if (!selectedFile) return;
    if (!currentUser) {
      setError(t('needLoginToUpload'));
      return;
    }

    setUploadStatus('uploading');
    setError('');
    setStatusMessage(t('uploadingPhoto'));

    try {
      const res = await uploadUserMedia({
        file: selectedFile,
        folder,
        resourceId,
        isNew,
        lang: language,
      });

      setUploadStatus('success');
      setStatusMessage(t('uploadComplete'));
      setPreviewUrl(res.url);
    } catch (err: any) {
      setUploadStatus('error');
      setError(err?.message || t('uploadFailed'));
    }
  };

  return (
    <div id={id} className="space-y-2">
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
          <span>{label || t('addPhoto')}</span>
          <span className="text-stone-400 font-normal">({t('optional')})</span>
        </label>
        
        {/* Bucket badge indicator */}
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200">
          cycle-user-media
        </span>
      </div>

      {/* Validation or Upload Error Message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <p className="text-[11px] text-rose-600/90 mt-0.5">
              {language === 'ar'
                ? 'الصيغ المعتمدة: JPG, JPEG, PNG, WEBP (بحد أقصى 12 ميجابايت).'
                : 'Accepted: JPG, JPEG, PNG, WEBP (up to 12MB).'}
            </p>
          </div>
          {selectedFile && uploadStatus === 'error' && (
            <button
              type="button"
              onClick={handleRetry}
              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t('tryAgain')}</span>
            </button>
          )}
        </div>
      )}

      {/* Upload Success State */}
      {uploadStatus === 'success' && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{statusMessage || t('uploadComplete')}</span>
        </div>
      )}

      {/* Preview View or Upload Picker */}
      {previewUrl ? (
        <div className="relative w-full rounded-2xl overflow-hidden border border-stone-200/90 bg-stone-900/5 shadow-2xs group">
          <img
            src={previewUrl}
            alt="User uploaded preview"
            referrerPolicy="no-referrer"
            className="w-full max-h-56 sm:max-h-64 object-cover rounded-2xl transition-all"
          />

          {/* Uploading Overlay */}
          {uploadStatus === 'uploading' && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
              <p className="text-xs font-bold">{statusMessage || t('uploadingPhoto')}</p>
            </div>
          )}

          {/* Actions Bar (Replace / Remove) */}
          <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-xl bg-stone-900/70 backdrop-blur-md flex items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-1.5 overflow-hidden text-xs px-2 text-stone-200">
              <ImageIcon className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="truncate text-[11px]">
                {selectedFile ? selectedFile.name : (language === 'ar' ? 'الصورة المحفوظة' : 'Current photo')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Replace Button */}
              <button
                type="button"
                id="btn-replace-user-photo"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus === 'uploading'}
                className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
                title={t('replaceImage')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('replaceImage')}</span>
              </button>

              {/* Remove Button */}
              <button
                type="button"
                id="btn-remove-user-photo"
                onClick={handleRemove}
                disabled={uploadStatus === 'uploading'}
                className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
                title={t('removeImage')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('removeImage')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Zone */
        <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500/80 rounded-2xl p-5 text-center transition-colors bg-stone-50/70 hover:bg-emerald-50/40">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-stone-200 flex items-center justify-center mx-auto mb-3 text-emerald-700">
            <Upload className="w-6 h-6" />
          </div>

          <p className="text-xs font-bold text-stone-800">
            {language === 'ar' ? 'إضافة صورة من جهازك' : 'Upload an image from your device'}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
            {hint || (language === 'ar' 
              ? 'تدعم الصيغ: JPG, JPEG, PNG, WEBP (الحد الأقصى 12 ميجابايت). تحفظ بأمان في cycle-user-media.'
              : 'Supports JPG, JPEG, PNG, WEBP up to 12MB. Stored securely in cycle-user-media.')}
          </p>

          {/* Action Buttons for Mobile & Desktop */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {/* Standard File Picker */}
            <button
              type="button"
              id="btn-choose-user-image"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-sm active:scale-98 flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>{t('chooseImage')}</span>
            </button>

            {/* Mobile Camera Direct Capture */}
            <button
              type="button"
              id="btn-camera-user-image"
              onClick={() => cameraInputRef.current?.click()}
              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold transition-all hover:bg-stone-50 active:scale-98 flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-stone-500" />
              <span>{language === 'ar' ? 'التقاط بالكاميرا' : 'Take Photo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden native input for file browser */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Hidden native input with direct camera capture for mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
};
