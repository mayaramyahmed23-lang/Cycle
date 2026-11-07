import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore 
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with local persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase persistence warning:', err);
});

// Initialize Firestore (with specific databaseId if provided)
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Export Supabase Storage functions as primary storage engine
export { 
  uploadFileToSupabaseWithProgress as uploadFileToStorageWithProgress,
  uploadFileOrImage,
  validateMediaFile,
  parseVideoUrl,
  checkSupabaseStorageHealth,
  getSupabaseErrorMessage
} from './supabase';
export type { UploadResult, SupabaseHealthResult } from './supabase';

/**
 * Format Firebase Auth and Firestore errors into human-friendly bilingual text
 */
export function getFirebaseErrorMessage(error: any, lang: 'en' | 'ar' = 'en'): string {
  const code = error?.code || '';
  const msg = error?.message || '';

  const errorMap: Record<string, { en: string; ar: string }> = {
    'auth/operation-not-allowed': {
      en: 'Email/Password sign-in is not enabled for this project. Please use "Continue with Google", or enable Email/Password provider in the Firebase Authentication Console.',
      ar: 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في هذا المشروع. يرجى استخدام "المتابعة باستخدام Google" أو تفعيل مزود البريد في لوحة تحكم Firebase.'
    },
    'auth/popup-closed-by-user': {
      en: 'Sign-in popup was closed before completing. Please try again.',
      ar: 'تم إغلاق نافذة تسجيل الدخول قبل الإكمال. يرجى المحاولة مرة أخرى.'
    },
    'auth/cancelled-popup-request': {
      en: 'Sign-in request was cancelled. Please try again.',
      ar: 'تم إلغاء طلب تسجيل الدخول. يرجى المحاولة مرة أخرى.'
    },
    'auth/popup-blocked': {
      en: 'Sign-in popup was blocked by browser. Please allow popups for this page.',
      ar: 'تم حظر النافذة المنبثقة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة.'
    },
    'auth/email-already-in-use': {
      en: 'This email is already registered. Please log in instead.',
      ar: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.'
    },
    'auth/invalid-email': {
      en: 'Please enter a valid email address.',
      ar: 'يرجى إدخال عنوان بريد إلكتروني صالح.'
    },
    'auth/user-not-found': {
      en: 'No account found with this email address.',
      ar: 'لم يتم العثور على حساب بهذا البريد الإلكتروني.'
    },
    'auth/wrong-password': {
      en: 'Incorrect password. If you originally signed up with Google, please use "Continue with Google".',
      ar: 'كلمة المرور غير صحيحة. إذا قمت بالتسجيل عبر Google، يرجى استخدام "المتابعة باستخدام Google".'
    },
    'auth/invalid-credential': {
      en: 'Invalid credentials. Please verify your email and password, or use "Continue with Google".',
      ar: 'بيانات الاعتماد غير صالحة. يرجى التحقق من بريدك الإلكتروني وكلمة المرور، أو استخدام "المتابعة باستخدام Google".'
    },
    'auth/weak-password': {
      en: 'Password should be at least 6 characters.',
      ar: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'
    },
    'auth/network-request-failed': {
      en: 'Network connection issue. Please check your internet connection.',
      ar: 'مشكلة في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.'
    },
    'auth/too-many-requests': {
      en: 'Too many unsuccessful attempts. Please try again later.',
      ar: 'محاولات كثيرة غير ناجحة. يرجى المحاولة مرة أخرى لاحقاً.'
    },
    'permission-denied': {
      en: 'You do not have permission to perform this action.',
      ar: 'ليس لديك الإذن للقيام بهذا الإجراء.'
    }
  };

  if (errorMap[code]) {
    return errorMap[code][lang];
  }

  return lang === 'ar' 
    ? (msg || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.') 
    : (msg || 'An unexpected error occurred. Please try again.');
}
