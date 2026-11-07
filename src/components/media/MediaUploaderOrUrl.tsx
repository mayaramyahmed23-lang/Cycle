import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  uploadFileToStorageWithProgress, 
  validateMediaFile, 
  parseVideoUrl,
  UploadResult 
} from '../../lib/firebase';
import { RECOMMENDED_STORAGE_SQL } from '../../lib/supabase';
import { 
  UploadCloud, 
  Link2, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Check, 
  AlertCircle, 
  Loader2, 
  X, 
  Play, 
  FileCheck,
  RefreshCw,
  Eye,
  Copy,
  CheckCircle2,
  Code2,
  ExternalLink
} from 'lucide-react';

export interface MediaPayload {
  url: string;
  source: 'upload' | 'url';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storagePath?: string;
}

interface MediaUploaderOrUrlProps {
  mediaType: 'image' | 'video' | 'any';
  currentUrl?: string;
  folder?: 'logos' | 'images' | 'videos' | 'homepage' | 'reports' | 'avatars';
  label?: string;
  description?: string;
  maxSizeMB?: number;
  onSave: (payload: MediaPayload) => Promise<void> | void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export const MediaUploaderOrUrl: React.FC<MediaUploaderOrUrlProps> = ({
  mediaType,
  currentUrl = '',
  folder = 'images',
  label,
  description,
  maxSizeMB,
  onSave,
  onCancel,
  showCancel = false
}) => {
  const { t, language } = useLanguage();
  
  const [sourceMode, setSourceMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl);
  const [inputUrl, setInputUrl] = useState<string>(currentUrl);
  const [detectedVideoType, setDetectedVideoType] = useState<'youtube' | 'mp4' | 'vimeo' | 'webm' | 'direct'>('direct');
  
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedRlsSql, setCopiedRlsSql] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentUrl changes
  useEffect(() => {
    if (currentUrl && !selectedFile) {
      setPreviewUrl(currentUrl);
      setInputUrl(currentUrl);
      if (mediaType === 'video' || mediaType === 'any') {
        const parsed = parseVideoUrl(currentUrl);
        setDetectedVideoType(parsed.type);
      }
    }
  }, [currentUrl]);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateMediaFile(file, mediaType, maxSizeMB);
    if (!validation.valid) {
      setErrorMessage(validation.error || t('errUnsupportedFormat'));
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle manual URL typing
  const handleUrlChange = (val: string) => {
    setInputUrl(val);
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = val.trim();
    if (!trimmed) {
      setPreviewUrl('');
      return;
    }

    if (mediaType === 'video' || mediaType === 'any') {
      const parsed = parseVideoUrl(trimmed);
      setDetectedVideoType(parsed.type);
      setPreviewUrl(parsed.cleanUrl);
    } else {
      setPreviewUrl(trimmed);
    }
  };

  // Reset file selection
  const handleClearSelected = () => {
    setSelectedFile(null);
    setPreviewUrl(currentUrl || '');
    setInputUrl(currentUrl || '');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process & Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (sourceMode === 'upload') {
      if (!selectedFile) {
        if (currentUrl) {
          // Keep current
          return;
        }
        setErrorMessage(t('errNoFileSelected'));
        return;
      }

      setIsProcessing(true);
      setUploadProgress(0);

      try {
        const result: UploadResult = await uploadFileToStorageWithProgress(
          selectedFile,
          folder,
          (progress) => setUploadProgress(progress)
        );

        await onSave({
          url: result.url,
          source: 'upload',
          fileName: result.fileName,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          storagePath: result.storagePath
        });

        setSuccessMessage(t('uploadSuccessMsg'));
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        console.error('Upload failed:', err);
        setErrorMessage(err?.message || t('errUploadFailed'));
      } finally {
        setIsProcessing(false);
      }
    } else {
      // URL mode
      const trimmed = inputUrl.trim();
      if (!trimmed) {
        setErrorMessage(t('errInvalidUrl'));
        return;
      }

      let finalUrl = trimmed;
      let inferredType = 'direct';

      if (mediaType === 'video' || mediaType === 'any') {
        const parsed = parseVideoUrl(trimmed);
        finalUrl = parsed.cleanUrl;
        inferredType = parsed.type;
      }

      setIsProcessing(true);
      try {
        await onSave({
          url: finalUrl,
          source: 'url',
          fileName: trimmed.split('/').pop()?.split('?')[0] || 'remote_media',
          mimeType: mediaType === 'video' ? `video/${inferredType}` : 'image/jpeg'
        });

        setSuccessMessage(t('mediaSavedSuccess'));
      } catch (err: any) {
        console.error('URL save error:', err);
        setErrorMessage(err?.message || t('errUploadFailed'));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const isVideo = mediaType === 'video' || (mediaType === 'any' && (detectedVideoType === 'youtube' || detectedVideoType === 'vimeo' || (previewUrl || '').includes('.mp4') || (previewUrl || '').includes('.webm') || (selectedFile && (selectedFile.type || '').startsWith('video/'))));

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
      {/* Header Info */}
      {(label || description) && (
        <div className="space-y-0.5">
          {label && <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">{label}</h4>}
          {description && <p className="text-[11px] text-stone-500">{description}</p>}
        </div>
      )}

      {/* Source Selector Tabs */}
      <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setSourceMode('upload');
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
            sourceMode === 'upload'
              ? 'bg-white text-emerald-800 shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>{t('uploadFromDevice')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSourceMode('url');
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
            sourceMode === 'url'
              ? 'bg-white text-emerald-800 shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>{t('useUrl')}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* OPTION 1: Upload from Device */}
        {sourceMode === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={
                mediaType === 'image'
                  ? 'image/jpeg,image/png,image/webp,image/jpg,image/svg+xml'
                  : mediaType === 'video'
                  ? 'video/mp4,video/webm,video/quicktime,video/ogg,video/x-m4v'
                  : 'image/*,video/*'
              }
              onChange={handleFileChange}
              className="hidden"
              id={`file-input-${folder}-${mediaType}`}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-stone-300 hover:border-emerald-500 hover:bg-stone-50/60'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                  {mediaType === 'video' ? (
                    <VideoIcon className="w-5 h-5 text-purple-700" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-emerald-700" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-800">
                    {selectedFile ? selectedFile.name : t('dragOrClickToUpload')}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {mediaType === 'video' ? t('videoFormatsHint') : t('imageFormatsHint')}
                  </p>
                </div>

                {selectedFile && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <FileCheck className="w-3 h-3" />
                    <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar during upload */}
            {isProcessing && (
              <div className="space-y-2 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    <span>{t('uploadingFile')}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-800">{uploadProgress}%</span>
                </div>

                <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                {selectedFile && (
                  <div className="flex justify-between items-center text-[10px] text-stone-500">
                    <span>{selectedFile.name}</span>
                    <span>
                      {((selectedFile.size * (uploadProgress / 100)) / (1024 * 1024)).toFixed(2)} / {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* OPTION 2: Use Existing URL */}
        {sourceMode === 'url' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700">
              {t('pasteUrl')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={
                  mediaType === 'video'
                    ? 'https://www.youtube.com/watch?v=... or .mp4 URL'
                    : 'https://example.com/image.jpg'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {inputUrl && (
                <button
                  type="button"
                  onClick={() => handleUrlChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-500">
              {mediaType === 'video' ? t('urlFormatsHint') : 'Direct image link (JPG, PNG, WebP, SVG)'}
            </p>
          </div>
        )}

        {/* PREVIEW CONTAINER */}
        {previewUrl && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>{t('mediaPreview')}</span>
              </span>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleClearSelected}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                >
                  {t('cancel')}
                </button>
              )}
            </div>

            <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-950/5 flex items-center justify-center max-h-64">
              {isVideo ? (
                previewUrl.includes('youtube.com') || previewUrl.includes('vimeo.com') ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={previewUrl}
                      title="Video Preview"
                      className="w-full h-full rounded-xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-60 max-w-full rounded-xl"
                  >
                    Your browser does not support the video tag.
                  </video>
                )
              ) : (
                <img
                  src={previewUrl}
                  alt="Media Preview"
                  className="max-h-56 max-w-full object-contain p-2 rounded-xl"
                  onError={() => setErrorMessage(t('errUnsupportedFormat'))}
                />
              )}
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold text-rose-900">
                  {language === 'ar' ? 'فشل حفظ الوسائط' : 'Upload / Save Failed'}
                </p>
                <p className="text-xs leading-relaxed text-rose-800 break-words font-mono">
                  {errorMessage}
                </p>
              </div>
            </div>

            {/* If RLS policy is blocking upload, provide one-click SQL helper */}
            {typeof errorMessage === 'string' && (errorMessage.toLowerCase().includes('rls') || 
              errorMessage.toLowerCase().includes('security') || 
              errorMessage.toLowerCase().includes('policy')) && (
              <div className="mt-2 p-3 bg-white rounded-xl border border-rose-300 space-y-2 text-stone-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-stone-900">
                    <Code2 className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'ar' ? 'حل سريع: انسخ كود سياسة الأمان إلى Supabase SQL Editor' : 'Fix: Run this policy in Supabase SQL Editor'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(RECOMMENDED_STORAGE_SQL);
                      setCopiedRlsSql(true);
                      setTimeout(() => setCopiedRlsSql(false), 3000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors shadow-2xs"
                  >
                    {copiedRlsSql ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRlsSql ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ كود SQL' : 'Copy SQL')}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-stone-900 text-stone-100 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed max-h-32">
                  {RECOMMENDED_STORAGE_SQL}
                </pre>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {showCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              {t('cancel')}
            </button>
          )}

          <button
            type="submit"
            disabled={isProcessing || (!selectedFile && !inputUrl && !currentUrl)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('saving')}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{currentUrl ? t('replaceCurrentMedia') : t('saveChanges')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
