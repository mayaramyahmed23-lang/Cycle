import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { OrgType } from '../types';
import { getFirebaseErrorMessage } from '../lib/firebase';
import { uploadUserMedia, validateUserImageFile } from '../lib/userMedia';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Save, 
  Check, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Camera,
  Trash2,
  Upload
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, userRole, updateUserProfile, changePassword } = useAuth();
  const { t, language } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('Recycler');
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone((userProfile as any).phone || '');
      setLocation((userProfile as any).location || '');
      setDescription((userProfile as any).description || '');
      if ((userProfile as any).orgType) {
        setOrgType((userProfile as any).orgType);
      }
      setPhotoPreview((userProfile as any).photoURL || (userProfile as any).logoURL || '');
      setIsPhotoRemoved(false);
    }
  }, [userProfile]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateUserImageFile(file, language);
      if (!validation.valid) {
        setProfileError(validation.error || (language === 'ar' ? 'ملف غير صالح' : 'Invalid file'));
        return;
      }
      setProfileError('');
      setPhotoFile(file);
      setIsPhotoRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setIsPhotoRemoved(true);
    setProfileError('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    setUploadProgress('');

    try {
      let finalPhotoUrl = photoPreview;

      // Handle newly selected photo or logo upload to cycle-user-media/profiles
      if (photoFile) {
        setUploadProgress(
          language === 'ar'
            ? 'جاري رفع الصورة إلى مساحة cycle-user-media...'
            : 'Uploading image to cycle-user-media...'
        );

        const uploadRes = await uploadUserMedia({
          file: photoFile,
          folder: 'profiles',
          resourceId: currentUser?.uid,
          isNew: false,
          lang: language,
        });
        finalPhotoUrl = uploadRes.url;
      } else if (isPhotoRemoved) {
        finalPhotoUrl = '';
      }

      const updateData: any = {
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
      };

      if (userRole === 'organization') {
        updateData.description = description.trim();
        updateData.orgType = orgType;
        updateData.logoURL = finalPhotoUrl;
        updateData.photoURL = finalPhotoUrl;
      } else {
        updateData.photoURL = finalPhotoUrl;
      }

      await updateUserProfile(updateData);
      setProfileSuccess(t('profileUpdated'));
      setPhotoFile(null);
      setIsPhotoRemoved(false);
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileError(err?.message || getFirebaseErrorMessage(err, language));
    } finally {
      setSavingProfile(false);
      setUploadProgress('');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError(t('passwordLengthError'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordsDoNotMatch'));
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(newPassword, oldPassword);
      setPasswordSuccess(t('passwordUpdated'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordError(getFirebaseErrorMessage(err, language));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div id="page-profile" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <User className="w-7 h-7 text-emerald-700" />
            <span>{t('profileTitle')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {t('profileSubtitle')}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
          {userRole === 'admin' ? <ShieldCheck className="w-4 h-4" /> : userRole === 'organization' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
          <span>{userRole === 'admin' ? t('admin') : userRole === 'organization' ? t('organization') : t('individual')}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Card / Photo Section */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs text-center space-y-4">
          <div className="relative w-28 h-28 mx-auto">
            <div className="w-full h-full rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-3xl overflow-hidden border-2 border-emerald-500 shadow-sm">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt={name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              ) : (
                name?.charAt(0) || (userRole === 'organization' ? 'O' : 'U')
              )}
            </div>
            
            <label 
              htmlFor="upload-profile-avatar"
              className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full cursor-pointer shadow-md transition-transform hover:scale-110"
              title={userRole === 'organization' ? (language === 'ar' ? 'تغيير شعار الشركة' : 'Change Company Logo') : (language === 'ar' ? 'تغيير الصورة الشخصية' : 'Change Profile Picture')}
            >
              <Camera className="w-4 h-4" />
            </label>
            <input 
              id="upload-profile-avatar"
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
              onChange={handlePhotoSelect}
            />
          </div>

          <div>
            <h3 className="text-lg font-bold text-stone-900">{name || (userRole === 'organization' ? 'Organization' : 'User')}</h3>
            <p className="text-xs text-stone-500">{currentUser?.email}</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {userRole === 'organization'
                ? (language === 'ar' ? 'شعار الشركة المعتمد' : 'Company Logo')
                : (language === 'ar' ? 'صورة الحساب الشخصي' : 'Profile Picture')}
            </p>
          </div>

          {/* Photo Action Buttons */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <label
              htmlFor="upload-profile-avatar"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{userRole === 'organization' ? (language === 'ar' ? 'رفع شعار' : 'Upload Logo') : (language === 'ar' ? 'تغيير الصورة' : 'Change Photo')}</span>
            </label>

            {photoPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                title={language === 'ar' ? 'إزالة الصورة' : 'Remove Image'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إزالة' : 'Remove'}</span>
              </button>
            )}
          </div>

          {photoFile && (
            <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
              {language === 'ar'
                ? 'تم اختيار صورة جديدة. اضغط على "حفظ التغييرات" لتأكيد الرفع.'
                : 'New image selected. Click "Save Changes" below to upload.'}
            </div>
          )}

          {uploadProgress && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-2 border border-emerald-200 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="pt-3 border-t border-stone-100 text-xs text-stone-600 space-y-1.5 text-left rtl:text-right">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>{phone || (language === 'ar' ? 'لم يُحدد' : 'Not set')}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>{location || (language === 'ar' ? 'لم يُحدد' : 'Not set')}</span>
            </div>
          </div>
        </div>

        {/* Profile Edit Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* General Info Form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
              {language === 'ar' ? 'البيانات الشخصية وبيانات الاتصال' : 'General & Contact Information'}
            </h3>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {userRole === 'organization' ? t('orgName') : t('fullName')}
                </label>
                <input
                  id="profile-input-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('phone')}
                  </label>
                  <input
                    id="profile-input-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('location')}
                  </label>
                  <input
                    id="profile-input-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {userRole === 'organization' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('orgDesc')}
                  </label>
                  <textarea
                    id="profile-input-orgdesc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm resize-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  id="btn-save-profile"
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('saving')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t('saveChanges')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-stone-500" />
              <span>{t('changePassword')}</span>
            </h3>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {t('currentPassword')} <span className="text-stone-400 font-normal">({language === 'ar' ? 'اختياري إذا تم تسجيل الدخول مؤخراً' : 'optional if recently logged in'})</span>
                </label>
                <input
                  id="input-change-oldpass"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('newPassword')}
                  </label>
                  <input
                    id="input-change-newpass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('confirmPassword')}
                  </label>
                  <input
                    id="input-change-confirmpass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="btn-submit-change-password"
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('saving')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{t('changePassword')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
