import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  checkSupabaseStorageHealth, 
  SupabaseHealthResult, 
  BUCKET_NAME,
  signInSupabaseAdmin,
  ensureSupabaseAdminAuth 
} from '../../lib/supabase';
import { LogoManager } from './LogoManager';
import { ImageManager } from './ImageManager';
import { VideoManager } from './VideoManager';
import { 
  Palette, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Layout, 
  Sparkles,
  ShieldCheck,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Database,
  HardDrive,
  Code2,
  Copy,
  KeyRound,
  LogIn
} from 'lucide-react';

export const HomepageMediaManager: React.FC = () => {
  const { t, language } = useLanguage();
  const { settings } = useTheme();
  const { user } = useAuth();

  const [activeMediaSubTab, setActiveMediaSubTab] = useState<'logo' | 'images' | 'videos'>('logo');
  const [storageHealth, setStorageHealth] = useState<SupabaseHealthResult | null>(null);
  const [checkingStorage, setCheckingStorage] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Admin Auth connection form state
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [authenticatingSupabase, setAuthenticatingSupabase] = useState<boolean>(false);
  const [authMsg, setAuthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const runStorageCheck = async () => {
    setCheckingStorage(true);
    try {
      const res = await checkSupabaseStorageHealth();
      setStorageHealth(res);
      // Auto-expand if unprovisioned or missing config
      if (!res.isReady || !res.isAdminAuthenticated) {
        setShowDiagnostics(true);
      }
    } catch (e) {
      console.error('Supabase Storage health check failed:', e);
    } finally {
      setCheckingStorage(false);
    }
  };

  useEffect(() => {
    runStorageCheck();
  }, []);

  const handleAdminSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticatingSupabase(true);
    setAuthMsg(null);
    try {
      const res = await signInSupabaseAdmin(adminPasswordInput);
      if (res.success) {
        setAuthMsg({
          type: 'success',
          text: language === 'ar' ? 'تم تسجيل دخول المشرف في Supabase بنجاح' : 'Supabase Admin identity authenticated successfully!'
        });
        setAdminPasswordInput('');
        await runStorageCheck();
      } else {
        setAuthMsg({
          type: 'error',
          text: res.error || (language === 'ar' ? 'فشل تسجيل دخول المشرف' : 'Authentication failed')
        });
      }
    } catch (err: any) {
      setAuthMsg({
        type: 'error',
        text: err?.message || 'Authentication error'
      });
    } finally {
      setAuthenticatingSupabase(false);
    }
  };

  const copySqlToClipboard = () => {
    if (storageHealth?.setupGuideSql) {
      navigator.clipboard.writeText(storageHealth.setupGuideSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  return (
    <div id="media-manager-hub" className="space-y-6 animate-in fade-in">
      
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-emerald-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-700 text-emerald-300 text-[11px] font-semibold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'متوافق مع الهواتف والأجهزة اللوحية والحاسوب' : 'Mobile, Tablet & Desktop Optimized'}</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">{t('mediaManagerTitle')}</h2>
          <p className="text-xs text-stone-300 leading-relaxed">
            {t('mediaManagerSubtitle')}
          </p>
        </div>

        {/* Quick status badges */}
        <div className="flex items-center gap-3 shrink-0 bg-stone-900/60 p-3 rounded-xl border border-stone-800 text-xs">
          <div className="text-center px-2">
            <span className="text-[10px] text-stone-400 block">{t('currentLogo')}</span>
            <span className="font-bold text-emerald-400">{settings.logoUrl ? 'Custom' : 'Default'}</span>
          </div>
          <div className="w-px h-6 bg-stone-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-stone-400 block">{t('activeVideosCount')}</span>
            <span className="font-bold text-emerald-400">{(settings.demoVideos || []).length}</span>
          </div>
        </div>
      </div>

      {/* Supabase Storage Diagnostics & Status */}
      {storageHealth && (
        <div className={`rounded-2xl border p-4 transition-all ${
          storageHealth.isReady
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                storageHealth.isReady
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}>
                {storageHealth.isReady ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold">
                    {storageHealth.isReady
                      ? (language === 'ar' ? 'مساحة تخزين Supabase Storage جاهزة ومتصلة (cycle-media)' : 'Supabase Storage is Active & Connected (cycle-media)')
                      : (language === 'ar' ? 'تنبيه: يلزم إعداد مساحة Supabase Storage' : 'Supabase Storage Configuration Required')}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                    storageHealth.isReady
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {storageHealth.status}
                  </span>
                  {storageHealth.isAdminAuthenticated && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-700 text-white">
                      ADMIN AUTH: {storageHealth.adminEmail}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600">
                  {language === 'ar' ? storageHealth.messageAr : storageHealth.messageEn}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={runStorageCheck}
                disabled={checkingStorage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStorage ? 'animate-spin' : ''}`} />
                <span>{language === 'ar' ? 'فحص الاتصال' : 'Test Connection'}</span>
              </button>

              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>{showDiagnostics ? (language === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details') : (language === 'ar' ? 'عرض التفاصيل' : 'View Details')}</span>
              </button>
            </div>
          </div>

          {/* Expandable Diagnostic Details */}
          {showDiagnostics && (
            <div className="mt-4 pt-4 border-t border-stone-200/80 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">Storage Provider</span>
                  <span className="font-bold text-emerald-800">Supabase Storage</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">Target Bucket</span>
                  <span className="font-bold text-stone-800 break-all">{storageHealth.bucket}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">Supabase Endpoint</span>
                  <span className="font-bold text-stone-800 truncate block">{storageHealth.supabaseUrl}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">Storage Security RLS</span>
                  <span className="font-bold text-emerald-700">Public Read, Admin Write (JWT)</span>
                </div>
              </div>

              {/* Supabase Admin Auth Bridge Panel */}
              {!storageHealth.isAdminAuthenticated && (
                <div className="p-4 bg-amber-100/70 border border-amber-300 rounded-xl space-y-2.5 text-stone-900">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>{language === 'ar' ? 'ربط هوية المشرف في Supabase Auth للمصادقة على الرفع:' : 'Supabase Admin Auth Connection (for RLS Storage Authorization):'}</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    {language === 'ar'
                      ? 'لتمكين صلاحية رفع الوسائط وفق قواعد الأمان المشددة (RLS)، أدخل كلمة مرور المشرف لحساب Supabase Auth (contact.cycle.eg@gmail.com):'
                      : 'To authenticate upload requests with Supabase Storage RLS rules, sign in the Admin Supabase Auth identity (contact.cycle.eg@gmail.com):'}
                  </p>
                  <form onSubmit={handleAdminSupabaseSignIn} className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="password"
                      placeholder={language === 'ar' ? 'كلمة مرور حساب المشرف في Supabase...' : 'Supabase admin account password...'}
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full sm:w-80 px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={authenticatingSupabase || !adminPasswordInput.trim()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{authenticatingSupabase ? (language === 'ar' ? 'جارٍ التحقق...' : 'Connecting...') : (language === 'ar' ? 'تأكيد هوية المشرف' : 'Connect Admin Auth')}</span>
                    </button>
                  </form>
                  {authMsg && (
                    <div className={`text-[11px] font-semibold ${authMsg.type === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {authMsg.text}
                    </div>
                  )}
                </div>
              )}

              {storageHealth.setupGuideSql && (
                <div className="p-4 bg-white rounded-xl border border-stone-300 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-emerald-600" />
                      <span>{language === 'ar' ? 'سياسات الأمان لمساحة cycle-media (Supabase SQL Editor):' : 'Recommended Supabase Storage Policies (cycle-media):'}</span>
                    </h5>
                    <button
                      onClick={copySqlToClipboard}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ SQL' : 'Copy SQL')}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
                    {storageHealth.setupGuideSql}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subtabs Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveMediaSubTab('logo')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeMediaSubTab === 'logo'
              ? 'bg-white text-emerald-900 shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>{t('mediaLogoTab')}</span>
        </button>

        <button
          onClick={() => setActiveMediaSubTab('images')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeMediaSubTab === 'images'
              ? 'bg-white text-emerald-900 shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-teal-700" />
          <span>{t('mediaImagesTab')}</span>
        </button>

        <button
          onClick={() => setActiveMediaSubTab('videos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeMediaSubTab === 'videos'
              ? 'bg-white text-emerald-900 shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <VideoIcon className="w-4 h-4 text-purple-700" />
          <span>{t('mediaVideosTab')}</span>
        </button>
      </div>

      {/* Content based on sub-tab */}
      {activeMediaSubTab === 'logo' && <LogoManager />}
      {activeMediaSubTab === 'images' && <ImageManager />}
      {activeMediaSubTab === 'videos' && <VideoManager />}

    </div>
  );
};
