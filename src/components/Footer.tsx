import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Recycle, QrCode, Heart, Instagram, Facebook, Mail } from 'lucide-react';
import { OFFICIAL_CYCLE_CONTACT } from '../data/socialMedia';

interface FooterProps {
  setCurrentTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  openQRModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab, onNavigate, openQRModal }) => {
  const { t, language } = useLanguage();
  const { settings } = useTheme();

  const handleNav = (tab: string) => {
    if (onNavigate) onNavigate(tab);
    else if (setCurrentTab) setCurrentTab(tab);
  };

  const isArabic = language === 'ar';

  return (
    <footer id="app-footer" className="bg-stone-900 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Col 1 & 2: Brand, Official Taglines, Social Media & Email */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.appName || t('appName')}
                  className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Recycle className="w-4 h-4 text-emerald-100" />
                </div>
              )}
              <span className="text-xl font-bold text-white tracking-tight">
                {settings.appName || t('appName')}
              </span>
            </div>

            {/* Official Taglines */}
            <div className="space-y-1 text-sm font-medium">
              <p className="text-emerald-400 flex items-center gap-1.5">
                <span>♻️</span>
                <span>{isArabic ? OFFICIAL_CYCLE_CONTACT.taglineAr.rethink : OFFICIAL_CYCLE_CONTACT.tagline.rethink}</span>
              </p>
              <p className="text-stone-300 flex items-center gap-1.5 text-xs sm:text-sm">
                <span>🌍</span>
                <span>{isArabic ? OFFICIAL_CYCLE_CONTACT.taglineAr.betterCycle : OFFICIAL_CYCLE_CONTACT.tagline.betterCycle}</span>
              </p>
            </div>

            <p className="text-xs sm:text-sm text-stone-400 max-w-md leading-relaxed">
              {t('footerDesc')}
            </p>

            {/* Social Media Icons */}
            <div className="pt-2">
              <span className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5">
                {t('ourSocialMedia')}
              </span>
              <div className="flex items-center gap-2.5">
                {/* Instagram */}
                <a
                  id="footer-social-instagram"
                  href="https://www.instagram.com/cycle_initiative?igsi=MTNxemllNDBrMjVubQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-lg bg-stone-800 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 text-stone-300 hover:text-white flex items-center justify-center border border-stone-700 transition-all hover:scale-105 shadow-sm"
                  title="Instagram: @cycle_initiative"
                >
                  <Instagram className="w-4 h-4" />
                </a>

                {/* Facebook */}
                <a
                  id="footer-social-facebook"
                  href="https://www.facebook.com/share/19WESFUbtm/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-lg bg-stone-800 hover:bg-blue-600 text-stone-300 hover:text-white flex items-center justify-center border border-stone-700 transition-all hover:scale-105 shadow-sm"
                  title="Facebook: Cycle Initiative"
                >
                  <Facebook className="w-4 h-4" />
                </a>

                {/* TikTok */}
                <a
                  id="footer-social-tiktok"
                  href="https://www.tiktok.com/@cycle_initiative?lang=ar&is_from_webapp=1&sender_device=mobile&sender_web_id=7681076533565867541"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-lg bg-stone-800 hover:bg-black text-stone-300 hover:text-white flex items-center justify-center border border-stone-700 transition-all hover:scale-105 shadow-sm"
                  title="TikTok: @cycle_initiative"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.33a6.33 6.33 0 0 0-.86-.06C6 9.27 3.5 11.75 3.5 14.81c0 3.08 2.5 5.59 5.59 5.59 3.09 0 5.59-2.51 5.59-5.59V8.41a8.3 8.3 0 0 0 4.91 1.63v-3.35z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Official Clickable Email */}
            <div className="pt-2">
              <span className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                {t('officialEmail')}
              </span>
              <a
                id="footer-email-link"
                href={OFFICIAL_CYCLE_CONTACT.mailto}
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors group"
              >
                <Mail className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>{OFFICIAL_CYCLE_CONTACT.email}</span>
              </a>
            </div>

            {/* QR Scanner Trigger */}
            <div className="flex items-center gap-2 pt-2">
              <button
                id="footer-btn-qr"
                onClick={openQRModal}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('qrCode')}</span>
              </button>
            </div>
          </div>

          {/* Col 3: Navigation */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-3">
              {language === 'ar' ? 'روابط المنصة' : 'Platform Links'}
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <button
                  id="footer-link-home"
                  onClick={() => handleNav('home')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t('home')}
                </button>
              </li>
              <li>
                <button
                  id="footer-link-feed"
                  onClick={() => handleNav('feed')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t('reportsFeed')}
                </button>
              </li>
              <li>
                <button
                  id="footer-link-org-needs"
                  onClick={() => handleNav('org-needs')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t('orgNeeds')}
                </button>
              </li>
              <li>
                <button
                  id="footer-link-impact"
                  onClick={() => handleNav('impact')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t('impactMetrics')}
                </button>
              </li>
              <li>
                <button
                  id="footer-link-connect"
                  onClick={() => handleNav('contact')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t('connectWithUs')}
                </button>
              </li>
              <li>
                <button
                  id="footer-link-signup"
                  onClick={() => handleNav('auth-signup')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t('signup')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Supported Polymers */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-3">
              {language === 'ar' ? 'البوليمرات المدعومة' : 'Target Polymers'}
            </h4>
            <div className="flex flex-wrap gap-1.5 text-xs text-stone-300 mb-4">
              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">#1 PET</span>
              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">#2 HDPE</span>
              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">#3 PVC</span>
              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">#4 LDPE</span>
              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">#5 PP</span>
              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">#6 PS</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/60 text-xs text-stone-400 space-y-1">
              <p className="font-semibold text-stone-200">
                {isArabic ? 'مبادرة مجتمعية' : 'Community Initiative'}
              </p>
              <p className="text-[11px] leading-relaxed">
                {isArabic 
                  ? 'سايكل تدعم الاقتصاد الدائري وربط الأفراد بالمصانع لإعادة تدوير حقيقي.' 
                  : 'Cycle powers direct circular economy loops between community members and recyclers.'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>{t('copyright')}</p>
          <div className="flex items-center gap-1">
            <span>{language === 'ar' ? 'صُنعت من أجل كوكب أنظف' : 'Built for a cleaner planet'}</span>
            <Heart className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
