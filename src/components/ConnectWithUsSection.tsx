import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { OFFICIAL_CYCLE_CONTACT } from '../data/socialMedia';
import { 
  Instagram, 
  Facebook, 
  Mail, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles,
  Share2,
  ArrowUpRight
} from 'lucide-react';

interface ConnectWithUsSectionProps {
  className?: string;
  compact?: boolean;
}

export const ConnectWithUsSection: React.FC<ConnectWithUsSectionProps> = ({ 
  className = '',
  compact = false 
}) => {
  const { t, language, isRTL } = useLanguage();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(OFFICIAL_CYCLE_CONTACT.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const isArabic = language === 'ar';

  return (
    <section 
      id="section-connect" 
      aria-label={t('connectWithUs')}
      className={`relative scroll-mt-20 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Container Card */}
        <div className="rounded-3xl bg-white border border-stone-200/90 shadow-sm p-6 sm:p-10 lg:p-12 overflow-hidden relative">
          
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none opacity-70" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-teal-50 rounded-full blur-3xl pointer-events-none opacity-60" />

          {/* Section Header */}
          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('joinTheMovement')}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight">
              {t('connectWithUs')}
            </h2>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal">
              {t('ourSocialMedia')}
            </p>

            {/* Official Tagline Highlight */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-stone-700">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-100/90 font-medium text-stone-800 border border-stone-200/60">
                <span className="text-base" role="img" aria-label="recycle">♻️</span>
                <span>{isArabic ? OFFICIAL_CYCLE_CONTACT.taglineAr.rethink : OFFICIAL_CYCLE_CONTACT.tagline.rethink}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 font-medium text-emerald-900 border border-emerald-200/70">
                <span className="text-base" role="img" aria-label="globe">🌍</span>
                <span>{isArabic ? OFFICIAL_CYCLE_CONTACT.taglineAr.betterCycle : OFFICIAL_CYCLE_CONTACT.tagline.betterCycle}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 font-medium text-teal-900 border border-teal-200/70">
                <span className="text-base" role="img" aria-label="phone">📲</span>
                <span>{isArabic ? OFFICIAL_CYCLE_CONTACT.taglineAr.joinMovement : OFFICIAL_CYCLE_CONTACT.tagline.joinMovement}</span>
              </span>
            </div>
          </div>

          {/* Social Channels & Email Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* 1. Instagram */}
            <a
              id="connect-card-instagram"
              href="https://www.instagram.com/cycle_initiative?igsi=MTNxemllNDBrMjVubQ=="
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between p-5 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-gradient-to-b hover:from-pink-50/60 hover:to-white hover:border-pink-300 hover:shadow-md transition-all duration-200 text-stone-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-100/80 text-pink-700 flex items-center justify-center border border-pink-200/60 group-hover:scale-105 group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:via-pink-500 group-hover:to-purple-600 group-hover:text-white transition-all shadow-sm">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <span className="p-1.5 rounded-lg text-stone-400 group-hover:text-pink-600 group-hover:bg-pink-50 transition-colors">
                    <ArrowUpRight className="w-4 h-4 rtl:rotate-90" />
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-700">
                    {isArabic ? 'إنستغرام' : 'Instagram'}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-pink-700 transition-colors">
                    @cycle_initiative
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed pt-1">
                    {isArabic 
                      ? 'محتوى توعوي وفيديوهات قصيرة حول تدوير البلاستيك.'
                      : 'Educational visual reels, initiatives, and community highlights.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-200/70 flex items-center justify-between text-xs font-semibold text-pink-700">
                <span>{t('visitProfile')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* 2. Facebook */}
            <a
              id="connect-card-facebook"
              href="https://www.facebook.com/share/19WESFUbtm/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between p-5 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-gradient-to-b hover:from-blue-50/60 hover:to-white hover:border-blue-300 hover:shadow-md transition-all duration-200 text-stone-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center border border-blue-200/60 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <Facebook className="w-6 h-6" />
                  </div>
                  <span className="p-1.5 rounded-lg text-stone-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                    <ArrowUpRight className="w-4 h-4 rtl:rotate-90" />
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    {isArabic ? 'فيسبوك' : 'Facebook'}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-blue-700 transition-colors">
                    Cycle Initiative
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed pt-1">
                    {isArabic 
                      ? 'الصفحة الرسمية لمبادرة سايكل وأخبار الشراكات والمجتمع.'
                      : 'Official Cycle community updates, articles, and discussions.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-200/70 flex items-center justify-between text-xs font-semibold text-blue-700">
                <span>{t('visitProfile')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* 3. TikTok */}
            <a
              id="connect-card-tiktok"
              href="https://www.tiktok.com/@cycle_initiative?lang=ar&is_from_webapp=1&sender_device=mobile&sender_web_id=7681076533565867541"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between p-5 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-gradient-to-b hover:from-stone-100 hover:to-white hover:border-stone-400 hover:shadow-md transition-all duration-200 text-stone-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center border border-stone-700 group-hover:scale-105 group-hover:bg-black transition-all shadow-sm">
                    {/* Recognizable TikTok glyph */}
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.33a6.33 6.33 0 0 0-.86-.06C6 9.27 3.5 11.75 3.5 14.81c0 3.08 2.5 5.59 5.59 5.59 3.09 0 5.59-2.51 5.59-5.59V8.41a8.3 8.3 0 0 0 4.91 1.63v-3.35z" />
                    </svg>
                  </div>
                  <span className="p-1.5 rounded-lg text-stone-400 group-hover:text-stone-900 group-hover:bg-stone-200 transition-colors">
                    <ArrowUpRight className="w-4 h-4 rtl:rotate-90" />
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                    {isArabic ? 'تيك توك' : 'TikTok'}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-stone-800 transition-colors">
                    @cycle_initiative
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed pt-1">
                    {isArabic 
                      ? 'مقاطع وتحديات سريعة ملهمة عن فرز وتدوير البلاستيك.'
                      : 'Short-form videos, recycling tips, and sustainable living habits.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-200/70 flex items-center justify-between text-xs font-semibold text-stone-900">
                <span>{t('visitProfile')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* 4. Official Email */}
            <div
              id="connect-card-email"
              className="group flex flex-col justify-between p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-300 hover:shadow-md transition-all duration-200 text-stone-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:scale-105 group-hover:bg-emerald-700 group-hover:text-white transition-all shadow-sm">
                    <Mail className="w-6 h-6" />
                  </div>
                  
                  {/* Quick Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                      copiedEmail 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-stone-600 hover:text-emerald-700 border-stone-200 hover:border-emerald-300'
                    }`}
                    title={t('copiedEmail')}
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'تم النسخ' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'نسخ' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    {t('officialEmail')}
                  </span>
                  <a
                    id="link-official-email"
                    href={OFFICIAL_CYCLE_CONTACT.mailto}
                    className="block text-sm sm:text-base font-bold text-emerald-900 hover:underline break-all transition-colors"
                  >
                    {OFFICIAL_CYCLE_CONTACT.email}
                  </a>
                  <p className="text-xs text-stone-500 leading-relaxed pt-1">
                    {t('emailDescription')}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-emerald-200/80 flex items-center justify-between">
                <a
                  id="btn-send-email-direct"
                  href={OFFICIAL_CYCLE_CONTACT.mailto}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t('openEmailClient')}</span>
                </a>
              </div>
            </div>

          </div>

          {/* Verification Badge Footer */}
          <div className="relative z-10 mt-8 pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t('officialAccountsNotice')}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-700">Cycle Initiative</span>
              <span>•</span>
              <span className="text-stone-500">Cairo, Egypt</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
