import { auth } from './firebase';

/**
 * Client utility to upload user report and need post media securely
 * through the server-side proxy to the dedicated 'cycle-user-media' bucket.
 */

export interface UserMediaUploadResponse {
  url: string;
  storagePath: string;
  fileName?: string;
  resourceId?: string;
}

export interface UploadUserMediaParams {
  file: File;
  folder: 'reports' | 'organization-posts' | 'posts' | 'profiles';
  resourceId?: string;
  isNew?: boolean;
  lang?: 'en' | 'ar';
  token?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB

/**
 * Retrieves the active authenticated user's token:
 * - Real Firebase ID Token via `auth.currentUser.getIdToken()` if present
 * - Or cryptographic session token verified by the server for active app sessions
 */
export async function getActiveUserAuthToken(
  folder?: string,
  isNew?: boolean
): Promise<string | null> {
  // 1. Check real Firebase Auth SDK user first
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) return token;
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
    }
  }

  // 2. For guest contributors submitting new individual plastic reports
  if (folder === 'reports' && isNew) {
    try {
      const resp = await fetch('/api/auth/guest-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.token) return data.token;
      }
    } catch (guestErr) {
      console.warn('Failed to retrieve guest token for report upload:', guestErr);
    }
  }

  return null;
}

/**
 * Validates image file type and size
 */
export function validateUserImageFile(file: File, lang: 'en' | 'ar' = 'en'): { valid: boolean; error?: string } {
  if (!file) {
    return {
      valid: false,
      error: lang === 'ar' ? 'لم يتم تحديد أي ملف' : 'No file selected',
    };
  }

  // Check file type
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(mime);

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'نوع الملف غير مدعوم. الصيغ المدعومة هي: JPG, JPEG, PNG, WEBP.'
          : 'Unsupported file type. Supported formats are JPG, JPEG, PNG, and WEBP.',
    };
  }

  // Check file size (max 12MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'حجم الملف كبير جدًا. الحد الأقصى المسموح به هو 12 ميجابايت.'
          : 'File too large. Maximum allowed size is 12MB.',
    };
  }

  return { valid: true };
}

/**
 * Uploads a user-generated image for a Report or Organization Need Post
 */
export async function uploadUserMedia(
  optionsOrFile: UploadUserMediaParams | File,
  folderArg?: 'reports' | 'organization-posts' | 'posts' | 'profiles',
  resourceIdArg?: string,
  isNewOrLang?: boolean | ('en' | 'ar'),
  langArg: 'en' | 'ar' = 'en'
): Promise<UserMediaUploadResponse> {
  let file: File;
  let folder: 'reports' | 'organization-posts' | 'profiles' = 'reports';
  let resourceId = '';
  let isNew = false;
  let lang: 'en' | 'ar' = 'en';
  let providedToken: string | undefined = undefined;

  if (optionsOrFile instanceof File) {
    file = optionsOrFile;
    const rawFolder = folderArg || 'reports';
    if (rawFolder === 'profiles') {
      folder = 'profiles';
    } else if (rawFolder === 'posts' || rawFolder === 'organization-posts') {
      folder = 'organization-posts';
    } else {
      folder = 'reports';
    }
    resourceId = resourceIdArg || '';
    if (typeof isNewOrLang === 'boolean') {
      isNew = isNewOrLang;
      lang = langArg;
    } else if (typeof isNewOrLang === 'string') {
      lang = isNewOrLang;
    }
  } else {
    file = optionsOrFile.file;
    const rawFolder = optionsOrFile.folder || 'reports';
    if (rawFolder === 'profiles') {
      folder = 'profiles';
    } else if (rawFolder === 'posts' || rawFolder === 'organization-posts') {
      folder = 'organization-posts';
    } else {
      folder = 'reports';
    }
    resourceId = optionsOrFile.resourceId || '';
    isNew = optionsOrFile.isNew ?? false;
    lang = optionsOrFile.lang || 'en';
    providedToken = optionsOrFile.token;
  }

  // 1. Validation
  const validation = validateUserImageFile(file, lang);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 2. Authentication check (Real Firebase token or verified session token)
  let idToken = providedToken;
  if (!idToken) {
    idToken = (await getActiveUserAuthToken(folder, isNew)) || '';
  }

  if (!idToken) {
    if (folder === 'organization-posts') {
      throw new Error(
        lang === 'ar'
          ? 'يجب تسجيل الدخول بحساب مؤسسة لنشر طلبات الخامات ورفع الصور.'
          : 'Please sign in with your organization account to post material requests.'
      );
    }
    throw new Error(
      lang === 'ar'
        ? 'يجب تسجيل الدخول أولاً لرفع الصور.'
        : 'Please sign in to upload images.'
    );
  }

  // 3. Read as Base64 data URL
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error(lang === 'ar' ? 'فشل قراءة ملف الصورة' : 'Failed to read image file'));
    reader.readAsDataURL(file);
  });

  // 4. Send to secure server proxy
  const response = await fetch('/api/media/upload-user-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fileData: base64Data,
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      folder,
      resourceId,
      isNew,
      firebaseToken: idToken,
    }),
  });

  if (!response.ok) {
    let errorDetail = lang === 'ar' ? 'فشل رفع الصورة' : 'Upload failed';
    try {
      const errJson = await response.json();
      if (errJson.code === 'BUCKET_NOT_FOUND') {
        errorDetail =
          lang === 'ar'
            ? 'مساحة التخزين cycle-user-media قيد الإعداد في Supabase. يرجى مراجعة إعدادات قاعدة البيانات.'
            : "The Supabase storage bucket 'cycle-user-media' needs to be created.";
      } else {
        errorDetail = errJson.error || errJson.details || errorDetail;
      }
    } catch {
      errorDetail = response.statusText || errorDetail;
    }

    throw new Error(
      lang === 'ar'
        ? `فشل رفع الصورة: ${errorDetail}`
        : `Media upload failed: ${errorDetail}`
    );
  }

  const data = await response.json();
  const returnUrl = data.url || data.imageUrl || data.imageURL;
  if (!returnUrl) {
    throw new Error(lang === 'ar' ? 'لم يتم استلام رابط الصورة' : 'Did not receive image URL');
  }

  return {
    url: returnUrl,
    storagePath: data.storagePath,
    fileName: data.fileName,
    resourceId: data.resourceId,
  };
}

/**
 * Calls the server-side Gemini AI plastic scanner
 */
export async function analyzePlasticImageWithAI(
  fileOrBase64: File | string,
  lang: 'en' | 'ar' = 'en'
) {
  let base64String = '';
  let mimeType = 'image/jpeg';

  if (typeof fileOrBase64 === 'string') {
    base64String = fileOrBase64;
  } else {
    mimeType = fileOrBase64.type || 'image/jpeg';
    base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image for scanner'));
      reader.readAsDataURL(fileOrBase64);
    });
  }

  const response = await fetch('/api/ai/scan-plastic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: base64String,
      mimeType,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'AI scan request failed';
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(
      lang === 'ar'
        ? `تعذر فحص الصورة بواسطة الذكاء الاصطناعي: ${errorMsg}`
        : `AI Plastic Scanner failed: ${errorMsg}`
    );
  }

  const result = await response.json();
  return result.data;
}
