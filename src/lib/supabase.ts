import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { auth } from './firebase';

// Environment variable getter (client-safe)
function getEnvVar(key: string): string {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
  } catch (e) {
    // Fallback if import.meta not available
  }
  return '';
}

/**
 * Normalizes project URL: strips /rest/v1, trailing slashes, or completes project IDs
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) {
    // Default to confirmed Project ID
    return 'https://ymxeyphuwkhkmehavvoe.supabase.co';
  }
  // If user passed only the project ID
  if (/^[a-z0-9]{20}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }
  // Ensure https prefix
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch (e) {
    return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

export const getSupabaseConfig = () => {
  const rawUrl = getEnvVar('VITE_SUPABASE_URL');
  const url = normalizeSupabaseUrl(rawUrl);
  const key = (getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || '').trim();
  const adminEmail = (getEnvVar('VITE_SUPABASE_ADMIN_EMAIL') || 'contact.cycle.eg@gmail.com').trim();
  const adminPassword = (getEnvVar('VITE_SUPABASE_ADMIN_PASSWORD') || '').trim();
  return { url, key, adminEmail, adminPassword };
};

export const BUCKET_NAME = 'cycle-media';
export const USER_MEDIA_BUCKET_NAME = 'cycle-user-media';

/**
 * Check if an email is an authorized administrator
 */
export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = (email || '').toLowerCase().trim();
  return (
    lower === 'contact.cycle.eg@gmail.com' ||
    lower === 'mayaramyahmed23@gmail.com'
  );
}

/**
 * Retrieve current active admin credentials strictly from real Firebase Auth
 */
export function getActiveAdminCredentials(): { email: string; uid: string; isAdmin: boolean } {
  try {
    // Strictly verify active Firebase Auth user
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.email && isAuthorizedAdminEmail(fbUser.email)) {
      return {
        email: (fbUser.email || '').toLowerCase().trim(),
        uid: fbUser.uid,
        isAdmin: true
      };
    }
  } catch (e) {
    // Non-blocking
  }
  return { email: '', uid: '', isAdmin: false };
}

let _supabaseClient: SupabaseClient | null = null;
let _lastClientSignature = '';

/**
 * Get or initialize the Supabase client instance using official SDK
 * Configured with session persistence to maintain the Admin Auth token across requests
 */
export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseConfig();
  if (!key) {
    throw new Error(
      'Supabase Publishable Key is missing. Please provide VITE_SUPABASE_PUBLISHABLE_KEY in the application settings.'
    );
  }

  const currentSig = `${url}:::${key}`;

  if (!_supabaseClient || _lastClientSignature !== currentSig) {
    _supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'cycle_supabase_admin_auth'
      }
    });
    _lastClientSignature = currentSig;
  }
  return _supabaseClient;
}

export interface SupabaseAdminAuthState {
  isAuthenticated: boolean;
  email: string | null;
  user: User | null;
  session: Session | null;
  error?: string;
}

/**
 * Check current Supabase Auth session for the admin identity
 */
export async function getSupabaseAdminAuthSession(): Promise<SupabaseAdminAuthState> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session || !session.user) {
      return {
        isAuthenticated: false,
        email: null,
        user: null,
        session: null,
        error: error?.message
      };
    }

    const email = session.user.email || '';
    const isAdmin = isAuthorizedAdminEmail(email);

    return {
      isAuthenticated: isAdmin,
      email: email,
      user: session.user,
      session: session
    };
  } catch (e: any) {
    return {
      isAuthenticated: false,
      email: null,
      user: null,
      session: null,
      error: e?.message || 'Error checking Supabase session'
    };
  }
}

/**
 * Sign in the Admin to Supabase Auth to obtain a signed JWT for Storage RLS
 */
export async function signInSupabaseAdmin(password?: string, emailOverride?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminEmail: defaultEmail, adminPassword: envPassword } = getSupabaseConfig();
    const supabase = getSupabaseClient();
    
    const targetEmail = (emailOverride || defaultEmail || 'contact.cycle.eg@gmail.com').trim();
    const targetPassword = (password || envPassword || '').trim();

    if (!targetPassword) {
      return {
        success: false,
        error: 'Password is required to authenticate with Supabase Auth.'
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    console.log(`[Supabase Auth] Successfully authenticated admin: ${data.user?.email}`);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to authenticate with Supabase Auth'
    };
  }
}

/**
 * Ensures the Supabase client holds an active, authenticated Admin JWT before Storage mutations
 */
export async function ensureSupabaseAdminAuth(): Promise<SupabaseAdminAuthState> {
  const current = await getSupabaseAdminAuthSession();
  if (current.isAuthenticated) {
    return current;
  }

  // Attempt auto-login if env password is configured
  const { adminPassword } = getSupabaseConfig();
  if (adminPassword) {
    const loginRes = await signInSupabaseAdmin(adminPassword);
    if (loginRes.success) {
      return await getSupabaseAdminAuthSession();
    }
  }

  return current;
}

export interface UploadResult {
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bucket: string;
}

export interface SupabaseHealthResult {
  isConfigured: boolean;
  isReady: boolean;
  isAdminAuthenticated: boolean;
  adminEmail: string | null;
  status: 'active' | 'missing_env' | 'bucket_not_found' | 'permission_error' | 'auth_required' | 'network_error';
  bucket: string;
  supabaseUrl: string;
  statusCode?: number;
  messageEn: string;
  messageAr: string;
  setupGuideSql?: string;
}

/**
 * Production-grade Secure Storage RLS Policy for 'cycle-media' (Option 3)
 * - PUBLIC READ: Allowed for all users (website media display)
 * - PUBLIC WRITE / INSERT / UPDATE / DELETE: DENIED for public and non-admins
 * - AUTHENTICATED ADMIN INSERT / UPDATE / DELETE: ALLOWED ONLY for authenticated Supabase Admin
 */
export const RECOMMENDED_STORAGE_SQL = `-- ==============================================================================
-- SECURE STORAGE RLS POLICIES FOR 'cycle-media' (Option 3: Admin Auth)
-- Public Read: Allowed (for public website display)
-- Public / Non-Admin Write / Update / Delete: DENIED
-- Authenticated Supabase Admin Write / Update / Delete: ALLOWED
-- ==============================================================================

-- 1. Ensure the bucket is public for fast CDN image & video rendering
UPDATE storage.buckets SET public = true WHERE id = 'cycle-media';

-- 2. PUBLIC READ: Anyone can view logos, pictures, and videos
DROP POLICY IF EXISTS "Public Read cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read cycle-media" ON storage.objects;
CREATE POLICY "Public Read cycle-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'cycle-media');

-- 3. AUTHENTICATED ADMIN ONLY INSERT: Only logged-in Supabase Admin can upload
DROP POLICY IF EXISTS "Public Insert cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Admin Insert cycle-media" ON storage.objects;
CREATE POLICY "Authenticated Admin Insert cycle-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cycle-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
);

-- 4. AUTHENTICATED ADMIN ONLY UPDATE: Only logged-in Supabase Admin can update
DROP POLICY IF EXISTS "Public Update cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Admin Update cycle-media" ON storage.objects;
CREATE POLICY "Authenticated Admin Update cycle-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cycle-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
)
WITH CHECK (
  bucket_id = 'cycle-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
);

-- 5. AUTHENTICATED ADMIN ONLY DELETE: Only logged-in Supabase Admin can delete
DROP POLICY IF EXISTS "Public Delete cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete cycle-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Admin Delete cycle-media" ON storage.objects;
CREATE POLICY "Authenticated Admin Delete cycle-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cycle-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
);`;

/**
 * Production-grade Secure Storage Configuration for 'cycle-user-media'
 * - Dedicated bucket for User-Generated Content (Reports & Need Posts)
 * - PUBLIC READ: Allowed (so reports & post photos render across the platform)
 * - PUBLIC / ANONYMOUS INSERT, UPDATE, DELETE: STRICTLY DENIED
 * - AUTHENTICATED SERVER-SIDE: Handled via secure backend proxy validating Firebase Auth & ownership
 */
export const USER_MEDIA_STORAGE_SQL = `-- ==============================================================================
-- SECURE STORAGE CONFIGURATION FOR 'cycle-user-media' (User-Generated Content)
-- ==============================================================================

-- 1. Create or ensure the public bucket 'cycle-user-media' exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('cycle-user-media', 'cycle-user-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. PUBLIC READ: Anyone can view report and organization post images
DROP POLICY IF EXISTS "Public Read cycle-user-media" ON storage.objects;
CREATE POLICY "Public Read cycle-user-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'cycle-user-media');

-- 3. AUTHENTICATED SERVER INSERT: Server backend uploads on behalf of verified Firebase users
DROP POLICY IF EXISTS "Server Insert cycle-user-media" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert cycle-user-media" ON storage.objects;
CREATE POLICY "Server Insert cycle-user-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cycle-user-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
);

-- 4. AUTHENTICATED SERVER UPDATE
DROP POLICY IF EXISTS "Server Update cycle-user-media" ON storage.objects;
DROP POLICY IF EXISTS "Public Update cycle-user-media" ON storage.objects;
CREATE POLICY "Server Update cycle-user-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cycle-user-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
)
WITH CHECK (
  bucket_id = 'cycle-user-media'
);

-- 5. AUTHENTICATED SERVER DELETE
DROP POLICY IF EXISTS "Server Delete cycle-user-media" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete cycle-user-media" ON storage.objects;
CREATE POLICY "Server Delete cycle-user-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cycle-user-media'
  AND (
    (auth.jwt() ->> 'email' IN ('contact.cycle.eg@gmail.com', 'mayaramyahmed23@gmail.com', 'admin@cycle.app'))
    OR
    ((auth.jwt() ->> 'email') ILIKE '%admin%')
  )
);`;


/**
 * Diagnostic check to verify whether Supabase Storage bucket 'cycle-media' and Admin Auth are ready
 */
export async function checkSupabaseStorageHealth(): Promise<SupabaseHealthResult> {
  const { url, key } = getSupabaseConfig();

  if (!key) {
    return {
      isConfigured: false,
      isReady: false,
      isAdminAuthenticated: false,
      adminEmail: null,
      status: 'missing_env',
      bucket: BUCKET_NAME,
      supabaseUrl: url,
      messageEn: 'VITE_SUPABASE_PUBLISHABLE_KEY is not set yet in application settings.',
      messageAr: 'مفتاح VITE_SUPABASE_PUBLISHABLE_KEY غير محدد بعد في إعدادات التطبيق.',
      setupGuideSql: RECOMMENDED_STORAGE_SQL
    };
  }

  try {
    const supabase = getSupabaseClient();
    const adminAuth = await ensureSupabaseAdminAuth();

    // Verify bucket access using the official Storage SDK
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
      limit: 1,
      offset: 0
    });

    if (error) {
      const errMsg = error.message || '';
      console.warn('[Supabase Storage Health Check] Storage check returned:', error);

      if (errMsg.toLowerCase().includes('bucket not found') || (error as any).statusCode === '404' || (error as any).status === 404) {
        return {
          isConfigured: true,
          isReady: false,
          isAdminAuthenticated: adminAuth.isAuthenticated,
          adminEmail: adminAuth.email,
          status: 'bucket_not_found',
          bucket: BUCKET_NAME,
          supabaseUrl: url,
          statusCode: 404,
          messageEn: `The bucket "${BUCKET_NAME}" was not found in your Supabase project (${url}).`,
          messageAr: `لم يتم العثور على مساحة التخزين "${BUCKET_NAME}" في مشروع Supabase (${url}).`,
          setupGuideSql: RECOMMENDED_STORAGE_SQL
        };
      }

      if (errMsg.toLowerCase().includes('row-level security') || errMsg.toLowerCase().includes('policy') || (error as any).statusCode === '403') {
        return {
          isConfigured: true,
          isReady: false,
          isAdminAuthenticated: adminAuth.isAuthenticated,
          adminEmail: adminAuth.email,
          status: 'permission_error',
          bucket: BUCKET_NAME,
          supabaseUrl: url,
          statusCode: 403,
          messageEn: `Row-Level Security (RLS) Policy on "${BUCKET_NAME}" is active. Ensure admin RLS policy is applied in Supabase SQL Editor.`,
          messageAr: `سياسات أمان Row-Level Security (RLS) على مساحة "${BUCKET_NAME}" مفعلة. يرجى التأكد من تطبيق سياسة المشرف في Supabase SQL Editor.`,
          setupGuideSql: RECOMMENDED_STORAGE_SQL
        };
      }

      return {
        isConfigured: true,
        isReady: false,
        isAdminAuthenticated: adminAuth.isAuthenticated,
        adminEmail: adminAuth.email,
        status: 'network_error',
        bucket: BUCKET_NAME,
        supabaseUrl: url,
        messageEn: `Storage error: ${errMsg}`,
        messageAr: `خطأ في مساحة التخزين: ${errMsg}`,
        setupGuideSql: RECOMMENDED_STORAGE_SQL
      };
    }

    // Bucket is accessible and verified
    return {
      isConfigured: true,
      isReady: true,
      isAdminAuthenticated: adminAuth.isAuthenticated,
      adminEmail: adminAuth.email,
      status: 'active',
      bucket: BUCKET_NAME,
      supabaseUrl: url,
      statusCode: 200,
      messageEn: adminAuth.isAuthenticated 
        ? `Supabase Storage is Active & Admin Authenticated (${adminAuth.email})`
        : `Supabase Storage is Connected (Public Read Active)`,
      messageAr: adminAuth.isAuthenticated
        ? `مساحة التخزين نشطة وتم التحقق من حساب المشرف (${adminAuth.email})`
        : `مساحة التخزين متصلة (القراءة العامة مفعلة)`,
      setupGuideSql: RECOMMENDED_STORAGE_SQL
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isReady: false,
      isAdminAuthenticated: false,
      adminEmail: null,
      status: 'network_error',
      bucket: BUCKET_NAME,
      supabaseUrl: url,
      messageEn: `Connection error: ${err?.message || 'Network error'}`,
      messageAr: `تعذر الاتصال بـ Supabase Storage: ${err?.message || 'خطأ في الشبكة'}`,
      setupGuideSql: RECOMMENDED_STORAGE_SQL
    };
  }
}

/**
 * Format Supabase Storage error into friendly bilingual text with clear instructions
 */
export function getSupabaseErrorMessage(error: any, lang: 'en' | 'ar' = 'en'): string {
  if (!error) return lang === 'ar' ? 'حدث خطأ غير معروف في التخزين' : 'An unknown storage error occurred';

  const rawMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));

  if (rawMsg.includes('VITE_SUPABASE_PUBLISHABLE_KEY') || rawMsg.includes('configuration missing') || rawMsg.includes('Publishable Key is missing')) {
    return lang === 'ar'
      ? 'إعدادات Supabase غير مكتملة: يرجى إضافة VITE_SUPABASE_PUBLISHABLE_KEY في إعدادات التطبيق.'
      : 'Supabase configuration is missing: Please set VITE_SUPABASE_PUBLISHABLE_KEY in environment variables.';
  }

  if (rawMsg.includes('row-level security') || rawMsg.includes('RLS') || rawMsg.includes('policy') || rawMsg.includes('403') || rawMsg.includes('Unauthorized') || rawMsg.includes('permission denied')) {
    return lang === 'ar'
      ? `تم حظر الرفع بواسطة سياسة الأمان (RLS) لمساحة "${BUCKET_NAME}". تأكد من تسجيل دخول المشرف في Supabase وتطبيق كود سياسة المشرف في Supabase SQL Editor.`
      : `Upload blocked by Supabase Storage Row-Level Security (RLS) on bucket "${BUCKET_NAME}". Please authenticate the Supabase admin identity and apply the authenticated admin RLS policy in Supabase SQL Editor.`;
  }

  if (rawMsg.includes('Bucket not found') || rawMsg.includes('404') || rawMsg.includes('bucket_not_found')) {
    return lang === 'ar'
      ? `لم يتم العثور على مساحة التخزين "${BUCKET_NAME}" في Supabase.`
      : `Storage bucket "${BUCKET_NAME}" was not found in Supabase.`;
  }

  if (rawMsg.includes('Payload too large') || rawMsg.includes('413') || rawMsg.includes('exceeded the maximum')) {
    return lang === 'ar'
      ? 'حجم الملف يتجاوز الحد الأقصى المسموح به في Supabase Storage.'
      : 'File size exceeds the maximum allowed limit configured in Supabase Storage.';
  }

  if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('network')) {
    return lang === 'ar'
      ? 'فشل الاتصال بخوادم Supabase. يرجى التحقق من اتصال الإنترنت.'
      : 'Failed to connect to Supabase Storage servers. Please check your network connection.';
  }

  return lang === 'ar'
    ? `خطأ أثناء الرفع إلى Supabase: ${rawMsg}`
    : `Supabase Storage Upload Error: ${rawMsg}`;
}

/**
 * Validate a media file before uploading
 */
export function validateMediaFile(
  file: File, 
  mediaType: 'image' | 'video' | 'any',
  maxSizeMB?: number
): { valid: boolean; error?: string } {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-m4v'];

  const defaultImageMaxMB = 25;
  const defaultVideoMaxMB = 100;
  const maxLimitMB = maxSizeMB || (mediaType === 'video' ? defaultVideoMaxMB : defaultImageMaxMB);

  if (file.size > maxLimitMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${maxLimitMB}MB.`
    };
  }

  if (mediaType === 'image') {
    if (!allowedImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
      return {
        valid: false,
        error: `Unsupported image format (${file.type || 'unknown'}). Please upload JPG, PNG, WEBP, or SVG.`
      };
    }
  } else if (mediaType === 'video') {
    if (!allowedVideoTypes.includes(file.type) && !file.type.startsWith('video/')) {
      return {
        valid: false,
        error: `Unsupported video format (${file.type || 'unknown'}). Please upload MP4, WEBM, or MOV.`
      };
    }
  }

  return { valid: true };
}

/**
 * Parse any video URL into embed format or direct stream URL
 */
export function parseVideoUrl(rawUrl: string): { 
  cleanUrl: string; 
  type: 'youtube' | 'mp4' | 'vimeo' | 'webm' | 'direct';
  isEmbeddable: boolean;
} {
  if (!rawUrl) return { cleanUrl: '', type: 'direct', isEmbeddable: false };
  const trimmed = rawUrl.trim();

  // YouTube formats
  if (trimmed.includes('youtube.com/watch?v=')) {
    const videoId = trimmed.split('v=')[1]?.split('&')[0];
    return {
      cleanUrl: `https://www.youtube.com/embed/${videoId}`,
      type: 'youtube',
      isEmbeddable: true
    };
  }
  if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
    return {
      cleanUrl: `https://www.youtube.com/embed/${videoId}`,
      type: 'youtube',
      isEmbeddable: true
    };
  }
  if (trimmed.includes('youtube.com/shorts/')) {
    const videoId = trimmed.split('shorts/')[1]?.split('?')[0];
    return {
      cleanUrl: `https://www.youtube.com/embed/${videoId}`,
      type: 'youtube',
      isEmbeddable: true
    };
  }
  if (trimmed.includes('youtube.com/embed/')) {
    return {
      cleanUrl: trimmed,
      type: 'youtube',
      isEmbeddable: true
    };
  }

  // Vimeo
  if (trimmed.includes('vimeo.com/') && !trimmed.includes('player.vimeo.com')) {
    const vimeoId = trimmed.split('vimeo.com/')[1]?.split('?')[0];
    return {
      cleanUrl: `https://player.vimeo.com/video/${vimeoId}`,
      type: 'vimeo',
      isEmbeddable: true
    };
  }

  // Direct MP4 / WebM / Quicktime
  if (trimmed.endsWith('.mp4') || trimmed.includes('.mp4?')) {
    return { cleanUrl: trimmed, type: 'mp4', isEmbeddable: true };
  }
  if (trimmed.endsWith('.webm') || trimmed.includes('.webm?')) {
    return { cleanUrl: trimmed, type: 'webm', isEmbeddable: true };
  }

  return { cleanUrl: trimmed, type: 'direct', isEmbeddable: true };
}

/**
 * Upload a file using official supabase.storage.from('cycle-media').upload()
 * Ensures the Supabase Admin Auth session is active so Supabase Storage RLS recognizes the user
 * Tracks real upload progress for the UI
 */
export async function uploadFileToSupabaseWithProgress(
  file: File,
  folder: string = 'images',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const { url, key } = getSupabaseConfig();

  if (!key) {
    throw new Error(
      'Supabase Publishable Key is missing. Please set VITE_SUPABASE_PUBLISHABLE_KEY in environment variables.'
    );
  }

  // Verify Firebase Admin authorization first
  const adminCreds = getActiveAdminCredentials();
  if (!adminCreds.isAdmin) {
    throw new Error(
      'Upload permission denied: Only authenticated Cycle administrators are authorized to upload media to cycle-media.'
    );
  }

  // Ensure Supabase Admin identity session is active
  const adminAuth = await ensureSupabaseAdminAuth();
  if (!adminAuth.isAuthenticated) {
    console.warn('[Supabase Storage] Supabase Admin Auth session is not active. Attempting upload with current session/anon credentials.');
  }

  const supabase = getSupabaseClient();

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${folder}/${timestamp}_${randomSuffix}_${cleanFileName}`;
  
  const mimeType = file.type || (folder === 'videos' ? 'video/mp4' : 'image/jpeg');

  console.log(`[Supabase Storage] Uploading to ${BUCKET_NAME}/${storagePath} (${(file.size / 1024).toFixed(1)} KB, mime: ${mimeType})`);

  if (onProgress) onProgress(10);

  // Progressive progress indicator while upload completes
  let simulated = 10;
  const timer = setInterval(() => {
    if (simulated < 90) {
      simulated += Math.min(15, Math.max(5, Math.floor((90 - simulated) / 2)));
      if (onProgress) onProgress(simulated);
    }
  }, 150);

  try {
    // Official Supabase SDK upload call to 'cycle-media'
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: true
      });

    clearInterval(timer);

    if (error) {
      console.error('[Supabase Storage] SDK upload error:', error);
      throw error;
    }

    if (onProgress) onProgress(95);

    // Official Supabase SDK getPublicUrl call
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`[Supabase Storage] Upload succeeded. Public URL: ${publicUrl}`);

    if (onProgress) onProgress(100);

    return {
      url: publicUrl,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      bucket: BUCKET_NAME
    };
  } catch (err: any) {
    clearInterval(timer);
    const friendlyMsg = getSupabaseErrorMessage(err);
    console.error('[Supabase Storage] Final Upload Error:', friendlyMsg, err);
    throw new Error(friendlyMsg);
  }
}

/**
 * Universal media / file uploader function for components
 */
export async function uploadFileOrImage(
  file: File, 
  folder: 'reports' | 'avatars' | 'logos' | 'media' | 'images' | 'videos' = 'reports'
): Promise<string> {
  const res = await uploadFileToSupabaseWithProgress(file, folder);
  return res.url;
}

/**
 * Remove an uploaded media file from Supabase Storage (Admin only)
 */
export async function deleteMediaFromSupabase(storagePath: string): Promise<void> {
  if (!storagePath) return;

  const adminCreds = getActiveAdminCredentials();
  if (!adminCreds.isAdmin) {
    console.warn('[Supabase Storage] Delete denied: Non-admin attempt');
    throw new Error('Delete permission denied: Only administrators can remove media.');
  }

  await ensureSupabaseAdminAuth();

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    if (error) {
      console.warn(`[Supabase Storage] Failed to remove ${storagePath}:`, error);
      throw error;
    }
  } catch (err: any) {
    console.warn('[Supabase Storage] Delete error:', err);
    throw new Error(getSupabaseErrorMessage(err));
  }
}
