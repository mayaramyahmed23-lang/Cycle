import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { MediaUploaderOrUrl, MediaPayload } from './MediaUploaderOrUrl';
import { 
  Recycle, 
  Sparkles, 
  Trash2, 
  Check, 
  AlertCircle, 
  Image as ImageIcon,
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';

export const LogoManager: React.FC = () => {
  const { t, language } = useLanguage();
  const { settings, updateSettings } = useTheme();

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveLogo = async (payload: MediaPayload) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateSettings({
        logoUrl: payload.url,
        logoType: payload.source,
        logoFileName: payload.fileName,
        logoFileSize: payload.fileSize
      });
      setStatusMsg({
        type: 'success',
        text: t('uploadSuccessMsg')
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update logo:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || t('errUploadFailed')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm(language === 'ar' ? 'هل تريد استعادة الشعار الافتراضي للنظام؟' : 'Reset to standard system logo?')) return;
    setSaving(true);
    try {
      await updateSettings({
        logoUrl: '',
        logoType: 'default',
        logoFileName: '',
        logoFileSize: 0
      });
      setStatusMsg({
        type: 'success',
        text: language === 'ar' ? 'تمت استعادة الشعار الافتراضي بنجاح.' : 'Reset to default logo successfully.'
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to reset logo:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to reset logo'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="section-logo-manager" className="space-y-6 animate-in fade-in">
      
      {/* Header & Explainer */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-stone-900">{t('mediaLogoTab')}</h3>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
          {t('logoReplaceDesc')}
        </p>
      </div>

      {/* Current Logo Status Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
            {t('currentLogo')}
          </span>
          {settings.logoUrl && (
            <button
              onClick={handleResetToDefault}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('removeCurrentMedia')}</span>
            </button>
          )}
        </div>

        {/* Dual Light & Dark Surface Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Theme Surface */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center space-y-3 min-h-[140px]">
            <span className="text-[11px] font-semibold text-stone-400">Light Surface Preview</span>
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.appName}
                className="max-h-16 max-w-full object-contain rounded-lg shadow-2xs"
              />
            ) : (
              <div className="flex items-center gap-2 text-stone-800 font-bold">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <Recycle className="w-6 h-6 text-emerald-100" />
                </div>
                <span className="text-lg tracking-tight">{settings.appName}</span>
              </div>
            )}
            <span className="text-[10px] text-stone-500">
              {settings.logoUrl ? (settings.logoFileName || 'Custom Brand Logo') : t('defaultLogoInUse')}
            </span>
          </div>

          {/* Dark Theme Surface */}
          <div className="p-4 rounded-xl border border-stone-800 bg-stone-900 flex flex-col items-center justify-center space-y-3 min-h-[140px] text-white">
            <span className="text-[11px] font-semibold text-stone-400">Dark Surface Preview</span>
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.appName}
                className="max-h-16 max-w-full object-contain rounded-lg shadow-2xs"
              />
            ) : (
              <div className="flex items-center gap-2 text-white font-bold">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Recycle className="w-6 h-6 text-emerald-100" />
                </div>
                <span className="text-lg tracking-tight">{settings.appName}</span>
              </div>
            )}
            <span className="text-[10px] text-stone-400">
              {settings.logoUrl ? (settings.logoFileName || 'Custom Brand Logo') : t('defaultLogoInUse')}
            </span>
          </div>
        </div>
      </div>

      {/* Notification status */}
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

      {/* Upload or URL Component */}
      <MediaUploaderOrUrl
        mediaType="image"
        currentUrl={settings.logoUrl || ''}
        folder="logos"
        label={t('uploadNewLogo')}
        description={language === 'ar' ? 'ارفع ملف الشعار من هاتفك (PNG مع خلفية شفافة أو JPG أو WebP) أو أدخل رابط صورة مباشر.' : 'Upload a brand logo file from your phone (PNG transparent, JPG, WebP, SVG) or provide an image URL.'}
        maxSizeMB={15}
        onSave={handleSaveLogo}
      />
    </div>
  );
};
