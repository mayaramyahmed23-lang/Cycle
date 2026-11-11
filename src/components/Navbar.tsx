import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Recycle, 
  Globe2, 
  QrCode, 
  Menu, 
  X, 
  User, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  MessageSquare, 
  FileText, 
  Layers,
  Building2
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate?: (tab: string) => void;
  setCurrentTab?: (tab: string) => void;
  openCreateModal?: () => void;
  openPostNeedModal?: () => void;
  openQRModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  setCurrentTab,
  openCreateModal,
  openPostNeedModal,
  openQRModal
}) => {
  const { currentUser, userProfile, userRole, isAdmin, isIndividual, isOrganization, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { settings } = useTheme();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navigate = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (setCurrentTab) {
      setCurrentTab(tab);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleNavClick = (tab: string) => {
    navigate(tab);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('home');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header 
      id="main-app-header" 
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="btn-nav-brand"
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.appName || t('appName')} 
                  className="w-8 h-8 rounded-lg object-contain"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <Recycle className="w-5 h-5 text-emerald-100" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-stone-900">
                  {settings.appName || t('appName')}
                </span>
                <span className="text-[11px] font-medium text-emerald-800 hidden sm:inline-block leading-none">
                  {language === 'ar' ? 'منصة تدوير البلاستيك' : 'Plastic Waste Network'}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-stone-600">
            <button
              id="nav-link-home"
              onClick={() => handleNavClick('home')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                currentTab === 'home'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {t('home')}
            </button>

            <button
              id="nav-link-feed"
              onClick={() => handleNavClick('feed')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                currentTab === 'feed'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {t('reportsFeed')}
            </button>

            <button
              id="nav-link-org-needs"
              onClick={() => handleNavClick('org-needs')}
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'org-needs'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>{t('orgNeeds')}</span>
            </button>

            {currentUser && (isOrganization || isAdmin) && (
              <button
                id="nav-link-smart-routes"
                onClick={() => handleNavClick('smart-routes')}
                className={`px-3.5 py-2 rounded-lg transition-colors ${
                  currentTab === 'smart-routes'
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {t('smartRoutes')}
              </button>
            )}

            <button
              id="nav-link-impact"
              onClick={() => handleNavClick('impact')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                currentTab === 'impact'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {t('impactMetrics')}
            </button>

            <button
              id="nav-link-earth-intelligence"
              onClick={() => handleNavClick('earth-intelligence')}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                currentTab === 'earth-intelligence'
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-semibold shadow-2xs'
                  : 'border-cyan-200/90 bg-cyan-50/60 text-cyan-800 hover:bg-cyan-100/70 font-medium'
              }`}
            >
              <Globe2 className="w-4 h-4 text-cyan-700" />
              <span>{t('earthIntelligence')}</span>
              <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-200 text-cyan-950">NASA</span>
            </button>

            <button
              id="nav-link-connect"
              onClick={() => handleNavClick('contact')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                currentTab === 'contact'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {t('connectWithUs')}
            </button>

            {currentUser && isIndividual && (
              <button
                id="nav-link-my-reports"
                onClick={() => handleNavClick('my-reports')}
                className={`px-3.5 py-2 rounded-lg transition-colors ${
                  currentTab === 'my-reports'
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {t('myReports')}
              </button>
            )}

            {currentUser && (
              <button
                id="nav-link-messages"
                onClick={() => handleNavClick('chat')}
                className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'chat'
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('messages')}</span>
              </button>
            )}

            {/* Admin link strictly visible to Admin users only */}
            {currentUser && isAdmin && (
              <button
                id="nav-link-admin"
                onClick={() => handleNavClick('admin')}
                className={`px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 font-semibold flex items-center gap-1.5 hover:bg-purple-100 transition-colors`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>{t('adminDashboard')}</span>
              </button>
            )}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Report Button (Individuals & Guests) */}
            {openCreateModal && (!currentUser || isIndividual) && (
              <button
                id="btn-quick-create-report"
                onClick={openCreateModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('reportPlasticBtn')}</span>
              </button>
            )}

            {/* Quick Post Need Button (Organizations) */}
            {openPostNeedModal && isOrganization && (
              <button
                id="btn-quick-post-need"
                onClick={openPostNeedModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('postANeed')}</span>
              </button>
            )}

            {/* QR Code Mobile Trigger */}
            <button
              id="btn-nav-qrcode"
              onClick={openQRModal}
              title={t('qrCode')}
              aria-label={t('qrCode')}
              className="p-2 text-stone-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-stone-200"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <button
              id="btn-nav-language-toggle"
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-200 transition-colors"
              title={language === 'en' ? 'Switch to Arabic' : 'التحويل للإنجليزية'}
            >
              <Globe2 className="w-3.5 h-3.5 text-stone-500" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Auth Dropdown / Buttons */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="btn-user-profile-menu"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-100 border border-stone-200 transition-colors focus:outline-hidden"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                    {userProfile?.photoURL || (userProfile as any)?.logoURL ? (
                      <img 
                        src={userProfile?.photoURL || (userProfile as any)?.logoURL} 
                        alt={userProfile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      userProfile?.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <span className="text-xs font-semibold text-stone-800 max-w-[100px] truncate hidden sm:inline-block">
                    {userProfile?.name || currentUser.email?.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div 
                    id="user-profile-dropdown"
                    className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {userProfile?.name || 'User'}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {currentUser.email}
                      </p>
                      <div className="mt-1">
                        <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {userRole === 'admin' ? t('admin') : userRole === 'organization' ? t('organization') : t('individual')}
                        </span>
                      </div>
                    </div>

                    <button
                      id="dropdown-link-profile"
                      onClick={() => handleNavClick('profile')}
                      className="w-full text-left rtl:text-right px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      <span>{t('profile')}</span>
                    </button>

                    {isIndividual && (
                      <button
                        id="dropdown-link-myreports"
                        onClick={() => handleNavClick('my-reports')}
                        className="w-full text-left rtl:text-right px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-stone-400" />
                        <span>{t('myReports')}</span>
                      </button>
                    )}

                    <button
                      id="dropdown-link-chat"
                      onClick={() => handleNavClick('chat')}
                      className="w-full text-left rtl:text-right px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-stone-400" />
                      <span>{t('messages')}</span>
                    </button>

                    {isAdmin && (
                      <button
                        id="dropdown-link-admin"
                        onClick={() => handleNavClick('admin')}
                        className="w-full text-left rtl:text-right px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>{t('adminDashboard')}</span>
                      </button>
                    )}

                    <div className="border-t border-stone-100 my-1"></div>

                    <button
                      id="dropdown-btn-logout"
                      onClick={handleLogout}
                      className="w-full text-left rtl:text-right px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-nav-login"
                  onClick={() => handleNavClick('auth-login')}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  {t('login')}
                </button>
                <button
                  id="btn-nav-signup"
                  onClick={() => handleNavClick('auth-signup')}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs"
                >
                  {t('signup')}
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-drawer"
          className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md"
        >
          <button
            id="mobile-link-home"
            onClick={() => handleNavClick('home')}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentTab === 'home' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {t('home')}
          </button>

          <button
            id="mobile-link-feed"
            onClick={() => handleNavClick('feed')}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentTab === 'feed' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {t('reportsFeed')}
          </button>

          <button
            id="mobile-link-org-needs"
            onClick={() => handleNavClick('org-needs')}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
              currentTab === 'org-needs' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span>{t('orgNeeds')}</span>
            <Building2 className="w-4 h-4 text-emerald-700" />
          </button>

          {currentUser && (isOrganization || isAdmin) && (
            <button
              id="mobile-link-smart-routes"
              onClick={() => handleNavClick('smart-routes')}
              className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentTab === 'smart-routes' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              {t('smartRoutes')}
            </button>
          )}

          <button
            id="mobile-link-impact"
            onClick={() => handleNavClick('impact')}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentTab === 'impact' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {t('impactMetrics')}
          </button>

          <button
            id="mobile-link-earth-intelligence"
            onClick={() => handleNavClick('earth-intelligence')}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between border border-cyan-200 ${
              currentTab === 'earth-intelligence' ? 'bg-cyan-50 text-cyan-900 font-semibold' : 'text-cyan-800 bg-cyan-50/50 hover:bg-cyan-100/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyan-700" />
              <span>{t('earthIntelligence')}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-cyan-200 text-cyan-900">NASA</span>
          </button>

          <button
            id="mobile-link-connect"
            onClick={() => handleNavClick('contact')}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentTab === 'contact' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {t('connectWithUs')}
          </button>

          {currentUser && isIndividual && (
            <button
              id="mobile-link-my-reports"
              onClick={() => handleNavClick('my-reports')}
              className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentTab === 'my-reports' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              {t('myReports')}
            </button>
          )}

          {currentUser && (
            <button
              id="mobile-link-chat"
              onClick={() => handleNavClick('chat')}
              className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                currentTab === 'chat' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{t('messages')}</span>
              <MessageSquare className="w-4 h-4 text-stone-400" />
            </button>
          )}

          {currentUser && (
            <button
              id="mobile-link-profile"
              onClick={() => handleNavClick('profile')}
              className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                currentTab === 'profile' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{t('profile')}</span>
              <User className="w-4 h-4 text-stone-400" />
            </button>
          )}

          {currentUser && isAdmin && (
            <button
              id="mobile-link-admin"
              onClick={() => handleNavClick('admin')}
              className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm font-semibold text-purple-800 bg-purple-50 border border-purple-200 flex items-center justify-between`}
            >
              <span>{t('adminDashboard')}</span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </button>
          )}

          {openCreateModal && (!currentUser || isIndividual) && (
            <div className="pt-2">
              <button
                id="mobile-btn-create-report"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCreateModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold text-sm shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('reportPlasticBtn')}</span>
              </button>
            </div>
          )}

          {openPostNeedModal && isOrganization && (
            <div className="pt-2">
              <button
                id="mobile-btn-post-need"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openPostNeedModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold text-sm shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('postANeed')}</span>
              </button>
            </div>
          )}

          {currentUser && (
            <div className="pt-2 border-t border-stone-100">
              <button
                id="mobile-btn-logout"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-rose-600 text-sm font-semibold hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('logout')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
