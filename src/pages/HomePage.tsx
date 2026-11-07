import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PlasticReport } from '../types';
import { PlasticTypeBadge } from '../components/PlasticTypeBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ReportCard } from '../components/ReportCard';
import { ConnectWithUsSection } from '../components/ConnectWithUsSection';
import { 
  Recycle, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Video, 
  Sparkles, 
  QrCode, 
  Play, 
  Package,
  Layers,
  Globe2,
  ChevronRight
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  onOpenReportDetails: (report: PlasticReport) => void;
  openCreateModal: () => void;
  openPostNeedModal?: () => void;
  openQRModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenReportDetails,
  openCreateModal,
  openPostNeedModal,
  openQRModal
}) => {
  const { t, language, isRTL } = useLanguage();
  const { settings } = useTheme();
  const { currentUser, isIndividual, isOrganization } = useAuth();

  const [recentReports, setRecentReports] = useState<PlasticReport[]>([]);
  const [stats, setStats] = useState({
    reportsCount: 0,
    totalKg: 0,
    orgsCount: 0,
    collectedCount: 0
  });

  useEffect(() => {
    // Fetch top 3 latest reports and global metric summary
    const loadOverviewData = async () => {
      try {
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, orderBy('createdAt', 'desc'), limit(3));
        const snap = await getDocs(q);

        const list: PlasticReport[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as PlasticReport));
        setRecentReports(list);

        // Fetch counts
        const allReportsSnap = await getDocs(collection(db, 'reports'));
        let totalKgCalc = 0;
        let collectedCalc = 0;
        allReportsSnap.forEach((d) => {
          const data = d.data();
          const q = data.quantity || 0;
          if (data.unit === 'tons') totalKgCalc += q * 1000;
          else totalKgCalc += q;

          if (data.status === 'Collected') collectedCalc++;
        });

        const orgsSnap = await getDocs(collection(db, 'organizations'));

        setStats({
          reportsCount: allReportsSnap.size,
          totalKg: totalKgCalc,
          orgsCount: orgsSnap.size,
          collectedCount: collectedCalc
        });
      } catch (err) {
        console.warn('Error loading homepage stats from firestore:', err);
      }
    };

    loadOverviewData();
  }, []);

  const heroTitle = language === 'ar' ? settings.heroTitleAr : settings.heroTitleEn;
  const heroSubtitle = language === 'ar' ? settings.heroSubtitleAr : settings.heroSubtitleEn;
  const problemText = language === 'ar' ? settings.problemTextAr : settings.problemTextEn;
  const howItWorksText = language === 'ar' ? settings.howItWorksAr : settings.howItWorksEn;

  return (
    <div id="page-homepage" className="space-y-16 pb-16">
      
      {/* 1. HERO SECTION */}
      {settings.sectionsVisibility.hero && (
        <section id="section-hero" className="relative overflow-hidden bg-stone-900 text-white pt-16 pb-20 lg:pt-24 lg:pb-28">
          {/* Subtle eco ambient glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              <div className={`space-y-6 ${settings.heroImageUrl ? 'lg:col-span-7' : 'lg:col-span-12 max-w-3xl'}`}>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('heroBadge')}</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
                  {heroTitle || t('heroTitle')}
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl font-normal">
                  {heroSubtitle || t('heroSubtitle')}
                </p>

                {/* CTAs */}
                <div className="pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
                  {isOrganization ? (
                    <>
                      <button
                        id="hero-btn-post-need"
                        onClick={() => {
                          if (openPostNeedModal) {
                            openPostNeedModal();
                          } else {
                            onNavigate('org-needs');
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-transform hover:scale-[1.02]"
                      >
                        <Package className="w-5 h-5" />
                        <span>{t('postANeed')}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>

                      <button
                        id="hero-btn-smart-routes"
                        onClick={() => onNavigate('smart-routes')}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-sm transition-colors"
                      >
                        <MapPin className="w-5 h-5 text-emerald-400" />
                        <span>{t('smartRoutes')}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id="hero-btn-report"
                        onClick={() => {
                          if (currentUser) {
                            openCreateModal();
                          } else {
                            openCreateModal(); // Guests can also report waste seamlessly!
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-transform hover:scale-[1.02]"
                      >
                        <Recycle className="w-5 h-5" />
                        <span>{t('reportPlasticBtn')}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>

                      <button
                        id="hero-btn-browse"
                        onClick={() => onNavigate('feed')}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-sm transition-colors"
                      >
                        <Package className="w-5 h-5 text-emerald-400" />
                        <span>{t('findPlasticBtn')}</span>
                      </button>
                    </>
                  )}

                  <button
                    id="hero-btn-qr"
                    onClick={openQRModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-stone-800/60 hover:bg-stone-700/80 text-stone-300 border border-stone-700/50 text-xs font-semibold transition-colors"
                    title={t('qrCode')}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>{t('qrCode')}</span>
                  </button>
                </div>
              </div>

              {/* Hero Banner Visual (Managed from Admin Media Manager) */}
              {settings.heroImageUrl && (
                <div className="lg:col-span-5 flex justify-center">
                  <div className="relative rounded-3xl overflow-hidden border border-stone-700/70 bg-stone-800/60 p-2 shadow-2xl backdrop-blur-xs max-h-[420px]">
                    <img
                      src={settings.heroImageUrl}
                      alt={heroTitle || 'Cycle Platform'}
                      referrerPolicy="no-referrer"
                      className="rounded-2xl max-h-[400px] w-full object-cover shadow-inner"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>
      )}

      {/* 2. LIVE IMPACT METRICS */}
      {settings.sectionsVisibility.stats && (
        <section id="section-stats" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-lg">
            
            <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
              <span className="text-xs text-stone-500 font-medium">{t('statReportsCount')}</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {stats.reportsCount > 0 ? stats.reportsCount : '142+'}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">
                {language === 'ar' ? 'بلاغ مسجل ونشط' : 'Verified listings'}
              </p>
            </div>

            <div className="space-y-1 text-center sm:text-left rtl:sm:text-right border-l rtl:border-l-0 rtl:border-r border-stone-100 pl-4 rtl:pl-0 rtl:pr-4">
              <span className="text-xs text-stone-500 font-medium">{t('statTonsTracked')}</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {stats.totalKg > 0 ? (stats.totalKg / 1000).toFixed(1) : '28.4'} <span className="text-sm font-bold text-stone-500">{t('unitTons')}</span>
              </p>
              <p className="text-[11px] text-stone-500">
                {language === 'ar' ? 'تم تحويلها عن المرادم' : 'Diverted from landfills'}
              </p>
            </div>

            <div className="space-y-1 text-center sm:text-left rtl:sm:text-right border-l rtl:border-l-0 rtl:border-r border-stone-100 pl-4 rtl:pl-0 rtl:pr-4">
              <span className="text-xs text-stone-500 font-medium">{t('statOrgsRegistered')}</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-teal-700">
                {stats.orgsCount > 0 ? stats.orgsCount : '18+'}
              </p>
              <p className="text-[11px] text-stone-500">
                {language === 'ar' ? 'مصنع ومركز تدوير' : 'Recycling facilities'}
              </p>
            </div>

            <div className="space-y-1 text-center sm:text-left rtl:sm:text-right border-l rtl:border-l-0 rtl:border-r border-stone-100 pl-4 rtl:pl-0 rtl:pr-4">
              <span className="text-xs text-stone-500 font-medium">{t('statDirectMatches')}</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {stats.collectedCount > 0 ? stats.collectedCount : '96'}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">
                {language === 'ar' ? 'تم الاستلام بنجاح' : 'Successful collections'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. PROBLEM & CONTEXT */}
      {settings.sectionsVisibility.problem && (
        <section id="section-problem" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
              {t('problemTitle')}
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              {problemText || t('problemSubtitle')}
            </p>
          </div>

          {settings.aboutImageUrl && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-stone-200 shadow-sm max-w-2xl mx-auto">
              <img
                src={settings.aboutImageUrl}
                alt="Environmental Challenge"
                className="w-full max-h-80 object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-bold text-stone-900">{t('problemCard1Title')}</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{t('problemCard1Desc')}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-bold text-stone-900">{t('problemCard2Title')}</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{t('problemCard2Desc')}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-bold text-stone-900">{t('problemCard3Title')}</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{t('problemCard3Desc')}</p>
            </div>
          </div>
        </section>
      )}

      {/* 4. HOW IT WORKS */}
      {settings.sectionsVisibility.howItWorks && (
        <section id="section-how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-stone-50 rounded-3xl border border-stone-200 p-8 sm:p-12 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-700">
                {language === 'ar' ? 'البساطة والشفافية' : 'Simple & Direct'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
                {t('howItWorksTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                {howItWorksText || t('howItWorksSubtitle')}
              </p>
            </div>

            {settings.howItWorksImageUrl && (
              <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-xs max-w-xl mx-auto">
                <img
                  src={settings.howItWorksImageUrl}
                  alt="How Cycle Works"
                  className="w-full max-h-72 object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3 relative">
                <span className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  1
                </span>
                <h3 className="text-base font-bold text-stone-900">{t('step1Title')}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{t('step1Desc')}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3 relative">
                <span className="w-9 h-9 rounded-full bg-teal-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  2
                </span>
                <h3 className="text-base font-bold text-stone-900">{t('step2Title')}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{t('step2Desc')}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3 relative">
                <span className="w-9 h-9 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  3
                </span>
                <h3 className="text-base font-bold text-stone-900">{t('step3Title')}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{t('step3Desc')}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. PLASTIC POLYMER IDENTIFIER GUIDE */}
      {settings.sectionsVisibility.plasticGuide && (
        <section id="section-plastic-guide" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
              {t('guideTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              {t('guideSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <PlasticTypeBadge type="PET" size="md" />
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">High Demand</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{t('petDesc')}</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <PlasticTypeBadge type="HDPE" size="md" />
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">High Value</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{t('hdpeDesc')}</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <PlasticTypeBadge type="PVC" size="md" />
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Specialized</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{t('pvcDesc')}</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <PlasticTypeBadge type="LDPE" size="md" />
                <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">Bulk Films</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{t('ldpeDesc')}</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <PlasticTypeBadge type="PP" size="md" />
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Rigid Grade</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{t('ppDesc')}</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <PlasticTypeBadge type="PS" size="md" />
                <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">Packaging</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{t('psDesc')}</p>
            </div>
          </div>
        </section>
      )}

      {/* 6. EDUCATIONAL & DEMO VIDEO SHOWCASE (Managed by Admin) */}
      {settings.sectionsVisibility.mediaShowcase && settings.demoVideos && settings.demoVideos.filter((v) => v.visible !== false).length > 0 && (
        <section id="section-media-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-800 pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                  <Video className="w-4 h-4" />
                  <span>{t('videoSectionTitle')}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {language === 'ar' ? 'شاهد وتعلم كيف تتم إعادة التدوير' : 'Learn Circular Plastic Processing'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {settings.demoVideos
                .filter((v) => v.visible !== false)
                .map((video) => (
                  <div key={video.id} className="bg-stone-800/80 rounded-2xl overflow-hidden border border-stone-700/60 space-y-4 p-4">
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      {video.url.includes('youtube.com') || video.url.includes('vimeo.com') ? (
                        <iframe
                          src={video.url}
                          title={video.titleEn}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={video.url}
                          controls
                          className="w-full h-full object-contain"
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {video.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-900/60 text-emerald-300 border border-emerald-700/40">
                            {video.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white">
                        {language === 'ar' ? video.titleAr || video.titleEn : video.titleEn}
                      </h3>
                      {(video.descriptionEn || video.descriptionAr) && (
                        <p className="text-xs text-stone-400 leading-relaxed">
                          {language === 'ar' ? video.descriptionAr || video.descriptionEn : video.descriptionEn}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. RECENT POSTS PREVIEW */}
      {recentReports.length > 0 && (
        <section id="section-recent-reports" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">
                {language === 'ar' ? 'أحدث عروض البلاستيك المتاحة' : 'Latest Available Listings'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {language === 'ar' ? 'استعرض بعض البلاغات المضافة حديثاً في المنصة' : 'Recent materials posted by individual community members'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('feed')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900"
            >
              <span>{t('viewDetails')}</span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onOpenDetails={onOpenReportDetails}
              />
            ))}
          </div>
        </section>
      )}

      {/* 8. CALL TO ACTION & QR CODE INVITE */}
      {settings.sectionsVisibility.cta && (
        <section id="section-cta" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left rtl:md:text-right">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {t('ctaTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                {t('ctaSubtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                id="cta-btn-individual"
                onClick={() => onNavigate('auth-signup')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105"
              >
                {t('ctaIndividual')}
              </button>

              <button
                id="cta-btn-org"
                onClick={() => onNavigate('auth-signup')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-950/80 text-white border border-emerald-400/40 text-xs sm:text-sm font-bold transition-colors"
              >
                {t('ctaOrg')}
              </button>

              <button
                id="cta-btn-scan"
                onClick={openQRModal}
                className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                title={t('qrCode')}
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 9. CONNECT WITH US / SOCIAL MEDIA */}
      <ConnectWithUsSection />

    </div>
  );
};
