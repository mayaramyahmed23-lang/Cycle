import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { AIScanResult, PlasticType } from '../types';
import { analyzePlasticImageWithAI } from '../lib/userMedia';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { PlasticTypeBadge } from './PlasticTypeBadge';

interface AIScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScan: (result: AIScanResult, imageBase64: string) => void;
}

export const AIScannerModal: React.FC<AIScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyScan,
}) => {
  const { t, language } = useLanguage();

  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setError(
        language === 'ar'
          ? 'حجم الصورة يتجاوز 12 ميجابايت. يرجى اختيار صورة أصغر.'
          : 'Image size exceeds 12MB. Please select a smaller file.'
      );
      return;
    }

    setError('');
    setScanResult(null);
    setSelectedFile(file);

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);

      // Auto trigger scan
      await runScan(base64);
    };
    reader.readAsDataURL(file);
  };

  const runScan = async (base64: string) => {
    setScanning(true);
    setError('');

    try {
      const result = await analyzePlasticImageWithAI(base64, language);
      setScanResult(result);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(
        err.message ||
          (language === 'ar'
            ? 'تعذر التعرف على المادة بالذكاء الاصطناعي. يمكنك تحديد النوع يدوياً.'
            : 'AI failed to classify image. You can specify polymer type manually.')
      );
    } finally {
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setImagePreview('');
    setSelectedFile(null);
    setScanResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleApply = () => {
    if (!scanResult) return;
    onApplyScan(scanResult, imagePreview);
    onClose();
    resetScanner();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-emerald-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {t('aiScannerModalTitle')}
              </h3>
              <p className="text-xs text-emerald-100/80">
                {language === 'ar' ? 'فحص فوري مدعوم بنماذج Gemini' : 'Powered by Gemini AI Vision'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Upload or Capture */}
          {!imagePreview && (
            <div className="space-y-4 text-center py-4">
              <div className="max-w-sm mx-auto">
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('aiScannerDesc')}
                </p>
              </div>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">{t('cameraCapture')}</span>
                  <span className="text-[10px] text-emerald-700/80">
                    {language === 'ar' ? 'تصوير مباشر بالهاتف' : 'Live mobile snapshot'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">{t('uploadPhotoFile')}</span>
                  <span className="text-[10px] text-stone-500">
                    {language === 'ar' ? 'اختيار صورة من المعرض' : 'JPG, PNG, or WEBP'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Image Preview & Analysis Results */}
          {imagePreview && (
            <div className="space-y-4">
              {/* Photo Box */}
              <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-900 aspect-video flex items-center justify-center shadow-inner">
                <img
                  src={imagePreview}
                  alt="Scanned plastic"
                  className="w-full h-full object-contain"
                />

                {scanning && (
                  <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-4">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-xs font-semibold animate-pulse text-center">
                      {t('scanningImage')}
                    </p>
                  </div>
                )}
              </div>

              {/* Error state */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={() => runScan(imagePreview)}
                      className="mt-1.5 font-bold text-red-800 underline hover:no-underline"
                    >
                      {language === 'ar' ? 'إعادة المحاولة' : 'Try again'}
                    </button>
                  </div>
                </div>
              )}

              {/* Scan Results Card */}
              {scanResult && !scanning && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">
                        {t('aiSuggestedType')}
                      </span>
                    </div>
                    <PlasticTypeBadge type={scanResult.plasticType as PlasticType} />
                  </div>

                  {/* Confidence Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">{t('scanConfidence')}:</span>
                      <span className="font-bold text-emerald-900">{scanResult.confidence}%</span>
                    </div>
                    <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${scanResult.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Recyclability Level */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                    <span className="text-stone-600">{t('recyclabilityLevel')}:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold text-[11px]">
                      {scanResult.recyclability}
                    </span>
                  </div>

                  {/* Polymer Description */}
                  <p className="text-xs text-stone-700 font-medium leading-relaxed">
                    {language === 'ar'
                      ? scanResult.suggestedCategoryAr
                      : scanResult.suggestedCategoryEn}
                  </p>

                  {/* Tips */}
                  {(scanResult.tipsEn || scanResult.tipsAr) && (
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80 text-[11px] text-stone-600 space-y-1">
                      <span className="font-bold text-emerald-900 block">
                        {t('aiTipsTitle')}:
                      </span>
                      <p>{language === 'ar' ? scanResult.tipsAr : scanResult.tipsEn}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          {imagePreview ? (
            <button
              type="button"
              onClick={resetScanner}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('retakeOrChange')}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/60 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>

            {scanResult && !scanning && (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('applyToReportBtn')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
