import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, getFirebaseErrorMessage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { OrgType } from '../types';
import { 
  User, 
  Building2, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Check, 
  ShieldCheck, 
  Recycle,
  Image as ImageIcon
} from 'lucide-react';

interface AuthPageProps {
  initialTab?: 'login' | 'signup-individual' | 'signup-org';
  onSuccess: () => void;
}

const orgTypesList: { id: OrgType; labelEn: string; labelAr: string }[] = [
  { id: 'Recycler', labelEn: 'Recycling Facility', labelAr: 'مصنع إعادة تدوير' },
  { id: 'Manufacturer', labelEn: 'Plastics Manufacturer', labelAr: 'مصنع منتجات بلاستيكية' },
  { id: 'Collector', labelEn: 'Waste Collector / Hauler', labelAr: 'متعهد جمع ونقل نفايات' },
  { id: 'NGO', labelEn: 'Environmental NGO', labelAr: 'جمعية بيئية غير ربحية' },
  { id: 'Government', labelEn: 'Municipal / Government', labelAr: 'هيئة حكومية / بلدية' },
  { id: 'Other', labelEn: 'Other Organization', labelAr: 'مؤسسة أخرى' }
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialTab = 'login',
  onSuccess
}) => {
  const { t, language } = useLanguage();
  const { login, loginWithGoogle, registerIndividual, registerOrganization } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'signup-individual' | 'signup-org'>(initialTab);
  
  // Common Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  
  // Individual Specific
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Organization Specific
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('Recycler');
  const [orgDesc, setOrgDesc] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const resetForm = () => {
    setError('');
    setResetNotice('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhone('');
    setLocation('');
    setFullName('');
    setOrgName('');
    setOrgDesc('');
    setAvatarFile(null);
    setLogoFile(null);
  };

  const handleTabChange = (tab: 'login' | 'signup-individual' | 'signup-org') => {
    resetForm();
    setActiveTab(tab);
  };

  // Password Reset Handler
  const handleForgotPassword = async () => {
    setError('');
    setResetNotice('');
    if (!email.trim()) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال بريدك الإلكتروني أولاً في حقل البريد لتلقي رابط إعادة تعيين كلمة المرور.'
          : 'Please enter your email address in the field to receive a password reset link.'
      );
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setResetNotice(
        language === 'ar'
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.'
          : 'A password reset link has been sent to your email address. Please check your inbox.'
      );
    } catch (resetErr: any) {
      console.warn('Password reset notice:', resetErr?.code || resetErr?.message);
      setError(getFirebaseErrorMessage(resetErr, language));
    } finally {
      setResetLoading(false);
    }
  };

  // Google Auth Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const preferredRole = activeTab === 'signup-org' ? 'organization' : 'individual';
      await loginWithGoogle(preferredRole);
      onSuccess();
    } catch (err: any) {
      console.warn('Google Sign In notice:', err?.code || err?.message);
      setError(getFirebaseErrorMessage(err, language));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic Validations
    if (!email || !password) {
      setError(t('fillRequiredFields'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        await login(email.trim(), password);
        onSuccess();
      } else if (activeTab === 'signup-individual') {
        if (!fullName.trim() || !phone.trim() || !location.trim()) {
          setError(t('fillRequiredFields'));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('passwordsDoNotMatch'));
          setLoading(false);
          return;
        }

        let photoURL = '';
        if (avatarFile) {
          try {
            photoURL = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string) || '');
              reader.onerror = () => resolve('');
              reader.readAsDataURL(avatarFile);
            });
          } catch (uploadErr) {
            console.warn('Avatar read error:', uploadErr);
          }
        }

        await registerIndividual({
          email: email.trim(),
          password,
          name: fullName.trim(),
          phone: phone.trim(),
          location: location.trim(),
          photoURL
        });
        onSuccess();
      } else if (activeTab === 'signup-org') {
        if (!orgName.trim() || !phone.trim() || !location.trim() || !orgDesc.trim()) {
          setError(t('fillRequiredFields'));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('passwordsDoNotMatch'));
          setLoading(false);
          return;
        }

        let logoURL = '';
        if (logoFile) {
          try {
            logoURL = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string) || '');
              reader.onerror = () => resolve('');
              reader.readAsDataURL(logoFile);
            });
          } catch (uploadErr) {
            console.warn('Logo read error:', uploadErr);
          }
        }

        await registerOrganization({
          email: email.trim(),
          password,
          name: orgName.trim(),
          orgType,
          phone: phone.trim(),
          location: location.trim(),
          description: orgDesc.trim(),
          logoURL
        });
        onSuccess();
      }
    } catch (err: any) {
      console.warn('Authentication attempt unsuccessful:', err?.code || err?.message);
      setError(getFirebaseErrorMessage(err, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="page-auth" className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-xs">
            <Recycle className="w-7 h-7 text-emerald-100" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            {t('authTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
            {t('authSubtitle')}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1 bg-stone-100 rounded-xl gap-1 text-xs font-semibold text-stone-600">
          <button
            id="tab-auth-login"
            type="button"
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            {t('loginTab')}
          </button>

          <button
            id="tab-auth-individual"
            type="button"
            onClick={() => handleTabChange('signup-individual')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'signup-individual'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            {t('signupIndividualTab')}
          </button>

          <button
            id="tab-auth-org"
            type="button"
            onClick={() => handleTabChange('signup-org')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'signup-org'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            {t('signupOrgTab')}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-700 text-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
            {error.includes('Google') && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{t('continueWithGoogle')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success / Notice Alert */}
        {resetNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs animate-in fade-in flex items-start gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{resetNotice}</span>
          </div>
        )}

        {/* Quick Google Sign In */}
        <div className="space-y-3">
          <button
            id="btn-auth-google"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 font-semibold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>{t('signingInWithGoogle')}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>
                  {activeTab === 'login'
                    ? t('continueWithGoogle')
                    : activeTab === 'signup-individual'
                    ? `${t('continueWithGoogle')} (${t('individual')})`
                    : `${t('continueWithGoogle')} (${t('organization')})`}
                </span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="shrink mx-3 text-[11px] font-medium text-stone-400">
              {t('orContinueWithEmail')}
            </span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Individual specific fields */}
          {activeTab === 'signup-individual' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('fullName')}</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-auth-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('phone')}</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-auth-phone"
                    type="tel"
                    placeholder="e.g. +1 555 0192"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('location')}</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-auth-location"
                    type="text"
                    placeholder="e.g. West District, City"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('profilePhoto')}</span> <span className="text-stone-400 font-normal">({t('optional')})</span>
                </label>
                <input
                  id="input-auth-avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </>
          )}

          {/* Organization specific fields */}
          {activeTab === 'signup-org' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('orgName')}</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-auth-orgname"
                    type="text"
                    placeholder="e.g. EcoRecycle Ltd."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('orgType')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="select-auth-orgtype"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as OrgType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm bg-white"
                  >
                    {orgTypesList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {language === 'ar' ? item.labelAr : item.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('phone')}</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-auth-orgphone"
                    type="tel"
                    placeholder="e.g. +1 800 555 0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('location')}</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-auth-orglocation"
                    type="text"
                    placeholder="e.g. Industrial Area 4, City"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('orgDesc')}</span> <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="input-auth-orgdesc"
                  rows={2}
                  placeholder={language === 'ar' ? 'اكتب نبذة عن قدرات التدوير والمواد المستهدفة...' : 'Describe what plastics you collect, processing capabilities...'}
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('orgLogo')}</span> <span className="text-stone-400 font-normal">({t('optional')})</span>
                </label>
                <input
                  id="input-auth-orglogo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </>
          )}

          {/* Email & Password (Required for all tabs) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <span>{t('email')}</span> <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={activeTab === 'login' ? 'sm:col-span-2' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('password')}</span> <span className="text-rose-500">*</span>
                </label>
                {activeTab === 'login' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                        <span>{language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...'}</span>
                      </span>
                    ) : (
                      language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'
                    )}
                  </button>
                )}
              </div>
              <input
                id="input-auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                required
              />
            </div>

            {activeTab !== 'login' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('confirmPassword')}</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-auth-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                  required
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('processing')}</span>
                </>
              ) : (
                <span>
                  {activeTab === 'login'
                    ? t('login')
                    : activeTab === 'signup-individual'
                    ? t('signupIndividualTab')
                    : t('signupOrgTab')}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Footer info switch */}
        <div className="text-center pt-2 text-xs text-stone-500 border-t border-stone-100">
          {activeTab === 'login' ? (
            <p>
              {t('dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => handleTabChange('signup-individual')}
                className="font-bold text-emerald-700 hover:underline"
              >
                {t('signup')}
              </button>
            </p>
          ) : (
            <p>
              {t('alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="font-bold text-emerald-700 hover:underline"
              >
                {t('login')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
