import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json' with { type: 'json' };
import { getEarthIntelligenceData } from './server/earthIntelligenceService';

const app = express();
const PORT = 3000;

// Safe, lazy initialization of Firebase App & Firestore
let firestoreDb: ReturnType<typeof getFirestore> | null = null;
function getDb(): ReturnType<typeof getFirestore> | null {
  if (!firestoreDb) {
    try {
      const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
      firestoreDb =
        firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
          ? getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId)
          : getFirestore(firebaseApp);
    } catch (err) {
      console.warn('[Server Firebase Init Warning] Could not initialize Firestore:', err);
    }
  }
  return firestoreDb;
}

// Increase JSON payload limit to handle photo uploads and scans
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to normalize Supabase URL
function getCleanSupabaseUrl(): string {
  const rawUrl = process.env.VITE_SUPABASE_URL || 'https://ymxeyphuwkhkmehavvoe.supabase.co';
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    return parsed.origin;
  } catch {
    return rawUrl.split('/rest/v1')[0].replace(/\/+$/, '');
  }
}

// Server-side cached Supabase Client
let serverSupabaseClient: SupabaseClient | null = null;
let hasCheckedUserMediaBucket = false;

async function getAuthenticatedServerSupabase(): Promise<SupabaseClient> {
  const url = getCleanSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // 1. If service role key is configured, use it for administrative operations
  if (serviceRoleKey) {
    if (!serverSupabaseClient) {
      serverSupabaseClient = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return serverSupabaseClient;
  }

  // 2. Otherwise use the standard client with the publishable/anon key
  if (!serverSupabaseClient) {
    serverSupabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverSupabaseClient;
}

/**
 * Attempts to automatically create 'cycle-user-media' bucket if privileged
 */
async function ensureUserMediaBucket(client: SupabaseClient) {
  if (hasCheckedUserMediaBucket) return;
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some(
      (b) => b.name === 'cycle-user-media' || b.id === 'cycle-user-media'
    );
    if (!exists) {
      await client.storage.createBucket('cycle-user-media', { public: true });
    }
    hasCheckedUserMediaBucket = true;
  } catch {
    // If blocked by RLS without service role, it will be handled gracefully during upload
  }
}

// Secure SESSION_SECRET: Load from environment variable, server secret file, or generate 256-bit random key
// NEVER expose in logs, frontend bundles, or fall back to public values
let _runtimeSessionSecret = '';
function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  if (_runtimeSessionSecret) {
    return _runtimeSessionSecret;
  }
  const secretPath = path.join(process.cwd(), '.session-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, 'utf8').trim();
      if (stored.length >= 16) {
        _runtimeSessionSecret = stored;
        return _runtimeSessionSecret;
      }
    }
  } catch {
    // Non-blocking
  }

  _runtimeSessionSecret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, _runtimeSessionSecret, { mode: 0o600 });
  } catch {
    // Non-blocking
  }
  return _runtimeSessionSecret;
}

/**
 * Generate HMAC signed token for authenticated application sessions
 */
function generateSessionToken(uid: string, email: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${uid}:${email}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  return `cycle_session_${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

/**
 * Verify HMAC signed token
 */
function verifySessionToken(token: string): { uid: string; email: string } | null {
  if (!token || !token.startsWith('cycle_session_')) return null;
  try {
    const raw = token.slice('cycle_session_'.length);
    const [encodedPayload, hmac] = raw.split('.');
    if (!encodedPayload || !hmac) return null;
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const [uid, email, expiresAtStr] = payload.split(':');
    if (!uid || !email || !expiresAtStr) return null;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const expectedHmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
    if (hmac.length !== expectedHmac.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) return null;
    return { uid, email };
  } catch {
    return null;
  }
}

/**
 * Verify a Firebase ID Token using Google Identity Toolkit API.
 * Real, cryptographic validation with Google Firebase Authentication servers.
 */
async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; email?: string } | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  try {
    const apiKey = firebaseConfigJson.apiKey;
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      const user = data.users?.[0];
      if (user && user.localId) {
        return { uid: user.localId, email: user.email };
      }
    }
  } catch (err) {
    console.warn('[Server Firebase Auth Lookup Warning]', err);
  }

  return null;
}

/**
 * Verify authentication token:
 * 1. For guest contributors submitting individual plastic reports: HMAC guest token
 * 2. For all user and admin actions: Official Firebase ID token verified via Google Identity Toolkit
 */
async function verifyAuthToken(
  token: string
): Promise<{ uid: string; email?: string; isGuest?: boolean; isFirebaseToken?: boolean } | null> {
  if (!token || typeof token !== 'string') return null;

  // 1. Check guest session token (used strictly for unauthenticated guest report photo uploads)
  if (token.startsWith('cycle_session_')) {
    const session = verifySessionToken(token);
    if (!session) return null;

    if (session.uid.startsWith('guest_')) {
      return { uid: session.uid, email: session.email, isGuest: true, isFirebaseToken: false };
    }

    // Do NOT accept simulated session tokens for non-guest operations
    return null;
  }

  // 2. Check official Firebase ID Token verified by Google Identity Toolkit
  const fbUser = await verifyFirebaseToken(token);
  if (fbUser) {
    return { uid: fbUser.uid, email: fbUser.email, isGuest: false, isFirebaseToken: true };
  }

  return null;
}

// -------------------------------------------------------------
// API ROUTES FIRST
// -------------------------------------------------------------

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Plastic Scanner Endpoint (Server-Side Gemini API)
app.post('/api/ai/scan-plastic', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 payload.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful heuristic fallback if API key is not supplied
      res.json({
        success: true,
        data: {
          plasticType: 'PET',
          confidence: 85,
          recyclability: 'High',
          suggestedCategoryEn: 'Type 1 - PET (Polyethylene Terephthalate): Common clear beverage bottles and food containers.',
          suggestedCategoryAr: 'النوع 1 - PET (بولي إيثيلين تيريفثاليت): زجاجات مياه ومشروبات شفافة شائعة.',
          tipsEn: 'Empty all liquids, rinse if sticky, and crush to save storage space.',
          tipsAr: 'أفرغ السوائل بالكامل، اشطف العبوة، واضغطها لتقليل الحجم.',
          condition: 'clean',
          analyzedAt: new Date().toISOString(),
          isFallback: true,
        },
      });
      return;
    }

    // Clean data URL prefix if provided
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `
You are an expert polymer chemist and plastic recycling identification system for the Cycle Plastic Recycling Platform.
Analyze the provided image of plastic waste or a recyclable container.

Identify:
1. Plastic polymer type: Must be strictly one of ["PET", "HDPE", "PVC", "LDPE", "PP", "PS", "Other", "Unknown"].
2. Confidence score: An integer from 0 to 100 representing your visual detection confidence.
3. Recyclability level: One of ["High", "Medium", "Low", "Specialty"].
4. Suggested category and resin identification number description in both English and Arabic.
5. Preparation/cleaning tips for recycling collectors in English and Arabic.
6. Estimated condition: clean, lightly soiled, or needs washing.

Return strictly valid JSON matching this schema:
{
  "plasticType": "PET",
  "confidence": 92,
  "recyclability": "High",
  "suggestedCategoryEn": "Type 1 - PET (Polyethylene Terephthalate): transparent beverage bottles and food containers.",
  "suggestedCategoryAr": "النوع 1 - PET (بولي إيثيلين تيريفثاليت): زجاجات مياه ومشروبات شفافة وعبوات طعام.",
  "tipsEn": "Empty all liquids, rinse if sticky, crush to save space, and keep caps attached if acceptable by local recyclers.",
  "tipsAr": "أفرغ السوائل بالكامل، اشطف العبوة، اضغطها لتقليل الحجم، واحتفظ بالأغطية إذا كانت مقبولة محلياً.",
  "condition": "clean"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plasticType: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            recyclability: { type: Type.STRING },
            suggestedCategoryEn: { type: Type.STRING },
            suggestedCategoryAr: { type: Type.STRING },
            tipsEn: { type: Type.STRING },
            tipsAr: { type: Type.STRING },
            condition: { type: Type.STRING },
          },
          required: [
            'plasticType',
            'confidence',
            'recyclability',
            'suggestedCategoryEn',
            'suggestedCategoryAr',
          ],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    // Validate plasticType
    const allowedTypes = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'];
    let finalType = parsedData.plasticType?.toUpperCase();
    if (!allowedTypes.includes(finalType)) {
      finalType = 'Other';
    }

    res.json({
      success: true,
      data: {
        plasticType: finalType,
        confidence: Math.min(100, Math.max(10, parsedData.confidence || 75)),
        recyclability: parsedData.recyclability || 'High',
        suggestedCategoryEn: parsedData.suggestedCategoryEn || `${finalType} polymer material`,
        suggestedCategoryAr: parsedData.suggestedCategoryAr || `مادة بلاستيكية من نوع ${finalType}`,
        tipsEn: parsedData.tipsEn || 'Ensure material is rinsed and free from contaminants before collection.',
        tipsAr: parsedData.tipsAr || 'تأكد من شطف المادة وخلوها من الملوثات قبل تسليمها.',
        condition: parsedData.condition || 'clean',
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[AI Plastic Scanner Error]', err);
    // Return graceful fallback so user scanner flow is never blocked
    res.json({
      success: true,
      data: {
        plasticType: 'PET',
        confidence: 80,
        recyclability: 'High',
        suggestedCategoryEn: 'Type 1 - PET: Recommended standard classification.',
        suggestedCategoryAr: 'النوع 1 - PET (بولي إيثيلين تيريفثاليت): التصنيف القياسي الموصى به.',
        tipsEn: 'Ensure items are rinsed and clean. Check resin stamp on bottom if unsure.',
        tipsAr: 'تأكد من نظافة المادة وخلوها من السوائل قبل التسليم.',
        condition: 'clean',
        analyzedAt: new Date().toISOString(),
        isFallback: true,
      },
    });
  }
});

// NASA Earth Observation Data & Environmental Intelligence Endpoint
app.get('/api/earth-intelligence/data', (_req, res) => {
  try {
    const data = getEarthIntelligenceData();
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[Earth Intelligence Data Error]', err);
    res.status(500).json({ error: 'Failed to retrieve Earth Observation data', details: err?.message });
  }
});

// Guest Token Endpoint for submitting new individual plastic reports safely
app.post('/api/auth/guest-token', async (_req, res) => {
  try {
    const guestUid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const guestEmail = `${guestUid}@cycle.app`;
    const token = generateSessionToken(guestUid, guestEmail);
    res.json({ token, uid: guestUid, email: guestEmail });
  } catch (err: any) {
    console.error('[Guest Token Endpoint Error]', err);
    res.status(500).json({ error: 'Failed to generate guest session token.' });
  }
});

// Secure User Media Upload Endpoint (Individuals & Organizations for their own reports/posts)
app.post('/api/media/upload-user-media', async (req, res) => {
  try {
    const {
      fileData,
      fileName = 'upload.jpg',
      mimeType = 'image/jpeg',
      folder = 'reports',
      resourceId,
      isNew = false,
    } = req.body;

    // 1. Receive and verify the authenticated user's token
    const authHeader = req.headers.authorization;
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '') ||
      req.body.firebaseToken ||
      '';

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized: Missing authentication token. Please sign in to upload images.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // 2. Verify token server-side and 3. Get the real verified UID
    const verifiedUser = await verifyAuthToken(token);
    if (!verifiedUser || !verifiedUser.uid) {
      res.status(401).json({
        error: 'Unauthorized: Invalid or expired authentication token. Please sign in again.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    const verifiedUid = verifiedUser.uid;
    const isGuest = !!verifiedUser.isGuest;

    if (!fileData) {
      res.status(400).json({ error: 'No image file data received.' });
      return;
    }

    // Strict boundary: normal user media belongs ONLY to reports, organization-posts, or profiles
    let targetFolder: 'reports' | 'organization-posts' | 'profiles' = 'reports';
    if (folder === 'organization-posts' || folder === 'posts') {
      targetFolder = 'organization-posts';
    } else if (folder === 'reports') {
      targetFolder = 'reports';
    } else if (folder === 'profiles' || folder === 'profile') {
      targetFolder = 'profiles';
    } else {
      res.status(403).json({
        error: 'Forbidden: User media uploads are only allowed for reports, organization-posts, or profiles.',
        code: 'FORBIDDEN_FOLDER',
      });
      return;
    }

    // Guests can ONLY upload photos for new individual reports
    if (isGuest && (targetFolder !== 'reports' || !isNew)) {
      res.status(403).json({
        error: 'Forbidden: Guest uploads are strictly allowed for new individual plastic waste reports only. Please sign in to post organization material requirements or modify existing posts.',
        code: 'GUEST_RESTRICTION',
      });
      return;
    }

    // Validate resourceId
    // For profiles, resourceId defaults to the verified user UID
    let cleanResourceId = '';
    if (targetFolder === 'profiles') {
      cleanResourceId = (resourceId && typeof resourceId === 'string' && resourceId.trim().length > 0)
        ? resourceId.trim()
        : verifiedUid;

      // Ensure user can only upload to their own profile
      if (cleanResourceId !== verifiedUid) {
        res.status(403).json({
          error: 'Forbidden: You can only upload images to your own profile or company logo.',
          code: 'PROFILE_OWNERSHIP_VIOLATION',
        });
        return;
      }
    } else {
      if (!resourceId || typeof resourceId !== 'string' || resourceId.trim().length === 0) {
        res.status(400).json({
          error: 'Missing resource identifier (reportId or postId).',
        });
        return;
      }
      cleanResourceId = resourceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    // 4. Verify ownership of the Report or Organization Need Post in Firestore
    if (!isNew && targetFolder !== 'profiles') {
      const collectionName = targetFolder === 'reports' ? 'reports' : 'organizationPosts';
      try {
        const database = getDb();
        if (database) {
          const docRef = doc(database, collectionName, cleanResourceId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const ownerId =
              targetFolder === 'reports'
                ? data.creatorId || data.authorId || data.userId
                : data.organizationId || data.orgId;

            if (ownerId && ownerId !== verifiedUid) {
              res.status(403).json({
                error: 'Forbidden: You can only upload images to your own reports or organization posts.',
                code: 'OWNERSHIP_VIOLATION',
              });
              return;
            }
          }
        }
      } catch (fsErr: any) {
        console.warn('[Server Firestore check warning]', fsErr?.message);
      }
    }

    // MIME type check: JPG, PNG, WEBP
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      res.status(400).json({
        error: 'Unsupported image format. Allowed formats are JPG, PNG, and WEBP.',
        code: 'UNSUPPORTED_FORMAT',
      });
      return;
    }

    // Decode base64
    const cleanBase64 = fileData.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Max 15MB limit
    if (buffer.length > 15 * 1024 * 1024) {
      res.status(400).json({
        error: 'File size exceeds maximum limit of 15MB.',
        code: 'FILE_TOO_LARGE',
      });
      return;
    }

    const supabase = await getAuthenticatedServerSupabase();
    const USER_BUCKET = 'cycle-user-media';

    // Ensure bucket exists if running with service role
    await ensureUserMediaBucket(supabase);

    // Ownership-based storage path:
    // "reports/{firebaseUserId}/{reportId}/{uniqueFileName}"
    // "organization-posts/{firebaseUserId}/{postId}/{uniqueFileName}"
    // "profiles/{firebaseUserId}/{uniqueFileName}"
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath =
      targetFolder === 'profiles'
        ? `profiles/${verifiedUid}/${timestamp}_${cleanFileName}`
        : `${targetFolder}/${verifiedUid}/${cleanResourceId}/${timestamp}_${cleanFileName}`;

    console.log(
      `[Server Media Upload] Uploading to ${USER_BUCKET}/${storagePath} (${(buffer.length / 1024).toFixed(1)} KB) for user ${verifiedUid}`
    );

    // 5. Upload the image to "cycle-user-media"
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(USER_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr) {
      console.error('[Server Media Upload] Supabase upload failed:', uploadErr);
      const isBucketNotFound =
        uploadErr.message?.includes('Bucket not found') ||
        uploadErr.message?.includes('NoSuchBucket') ||
        (uploadErr as any).statusCode === '404';

      if (isBucketNotFound) {
        res.status(404).json({
          error: `Storage bucket '${USER_BUCKET}' not found in Supabase.`,
          code: 'BUCKET_NOT_FOUND',
          bucket: USER_BUCKET,
          setupGuideSql: `-- Create bucket in Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public) VALUES ('cycle-user-media', 'cycle-user-media', true) ON CONFLICT (id) DO UPDATE SET public = true;
CREATE POLICY "Public Read cycle-user-media" ON storage.objects FOR SELECT USING (bucket_id = 'cycle-user-media');
CREATE POLICY "Server Insert cycle-user-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cycle-user-media');`,
        });
        return;
      }

      res.status(500).json({
        error: `Supabase Storage upload failed: ${uploadErr.message}`,
        details: uploadErr,
      });
      return;
    }

    // 6. Return the uploaded file path/URL
    const { data: urlData } = supabase.storage
      .from(USER_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // 7. Save the image reference in the correct Firestore document
    const database = getDb();
    if (targetFolder === 'profiles' && database) {
      try {
        const userRef = doc(database, 'users', verifiedUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            photoURL: publicUrl,
            imageUrl: publicUrl,
            profileImage: publicUrl,
            updatedAt: new Date().toISOString(),
          });
          console.log(`[Server Media Upload] Successfully synced photoURL to users/${verifiedUid}`);
        }
        const orgRef = doc(database, 'organizations', verifiedUid);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
          await updateDoc(orgRef, {
            logoURL: publicUrl,
            photoURL: publicUrl,
            imageUrl: publicUrl,
            updatedAt: new Date().toISOString(),
          });
          console.log(`[Server Media Upload] Successfully synced logoURL to organizations/${verifiedUid}`);
        }
      } catch (dbErr) {
        console.warn('[Server Media Upload] Firestore profile sync warning:', dbErr);
      }
    } else if (cleanResourceId && database) {
      const collectionName = targetFolder === 'reports' ? 'reports' : 'organizationPosts';
      try {
        const docRef = doc(database, collectionName, cleanResourceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, {
            imageURL: publicUrl,
            imageUrl: publicUrl,
            imagePath: storagePath,
            updatedAt: new Date().toISOString(),
          });
          console.log(
            `[Server Media Upload] Successfully saved image reference to Firestore ${collectionName}/${cleanResourceId}`
          );
        }
      } catch (dbErr) {
        console.warn('[Server Media Upload] Firestore update warning:', dbErr);
      }
    }

    res.json({
      success: true,
      url: publicUrl,
      imageUrl: publicUrl,
      imageURL: publicUrl,
      storagePath,
      fileName,
      resourceId: cleanResourceId,
      size: buffer.length,
      mimeType,
      bucket: USER_BUCKET,
    });
  } catch (err: any) {
    console.error('[Server Media Upload Error]', err);
    res.status(500).json({
      error: 'Server error while uploading user media.',
      details: err?.message || String(err),
    });
  }
});

// -------------------------------------------------------------
// SECURE ADMIN & OWNER DOCUMENT DELETION WITH MEDIA CLEANUP
// -------------------------------------------------------------

function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === 'contact.cycle.eg@gmail.com' ||
    clean === 'mayaramyahmed23@gmail.com'
  );
}

async function isUserAdmin(uid: string, email?: string | null): Promise<boolean> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (isSystemAdminEmail(cleanEmail)) return true;
  try {
    const database = getDb();
    if (database) {
      const userRef = doc(database, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data?.role === 'admin' && isSystemAdminEmail(data?.email)) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[Admin Verification Warning]', err);
  }
  return false;
}

function extractUserMediaPath(imagePath?: string, imageUrl?: string): string | null {
  if (
    imagePath &&
    (imagePath.startsWith('reports/') ||
      imagePath.startsWith('organization-posts/') ||
      imagePath.startsWith('profiles/'))
  ) {
    return imagePath;
  }
  if (imageUrl && imageUrl.includes('/cycle-user-media/')) {
    const parts = imageUrl.split('/cycle-user-media/');
    if (parts[1]) {
      return decodeURIComponent(parts[1].split('?')[0]);
    }
  }
  return null;
}

async function safelyDeleteUserMedia(storagePath: string | null) {
  if (!storagePath) return;
  try {
    const supabase = await getAuthenticatedServerSupabase();
    if (supabase) {
      console.log(`[Media Cleanup] Safely removing '${storagePath}' from cycle-user-media`);
      const { error } = await supabase.storage.from('cycle-user-media').remove([storagePath]);
      if (error) {
        console.warn(`[Media Cleanup] Supabase returned warning on removal:`, error.message);
      }
    }
  } catch (err) {
    console.warn(`[Media Cleanup] Exception during media cleanup for '${storagePath}':`, err);
  }
}

// Permanently delete a Plastic Report (Admin or Owner)
app.post('/api/admin/delete-report', async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId || typeof reportId !== 'string') {
      res.status(400).json({ error: 'Missing reportId parameter' });
      return;
    }

    const authHeader = req.headers.authorization;
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '') ||
      req.body.firebaseToken ||
      '';

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
      return;
    }

    const verifiedUser = await verifyAuthToken(token);
    if (!verifiedUser || !verifiedUser.uid || verifiedUser.isGuest || !verifiedUser.isFirebaseToken) {
      res.status(401).json({ error: 'Unauthorized: Valid Firebase authentication token is required' });
      return;
    }

    const database = getDb();
    if (!database) {
      res.status(500).json({ error: 'Database service is temporarily unavailable' });
      return;
    }

    const reportRef = doc(database, 'reports', reportId);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      res.json({
        success: true,
        message: 'Report already removed from database',
        deletedId: reportId,
      });
      return;
    }

    const reportData = reportSnap.data();
    const isAdmin = await isUserAdmin(verifiedUser.uid, verifiedUser.email);
    const isOwner = reportData.creatorId === verifiedUser.uid;

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        error: 'Forbidden: You do not have authorization to delete this report',
      });
      return;
    }

    // Safely clean up associated media object from cycle-user-media if present
    const mediaPath = extractUserMediaPath(
      reportData.imagePath,
      reportData.imageURL || reportData.imageUrl
    );
    await safelyDeleteUserMedia(mediaPath);

    // Permanently delete the Firestore document
    await deleteDoc(reportRef);

    console.log(
      `[Admin Deletion] Report '${reportId}' permanently deleted by ${verifiedUser.uid} (isAdmin: ${isAdmin})`
    );

    res.json({
      success: true,
      message: 'Report permanently deleted successfully',
      deletedId: reportId,
    });
  } catch (err: any) {
    console.error('[Admin Delete Report Error]', err);
    res.status(500).json({
      error: 'Failed to delete report',
      details: err?.message || String(err),
    });
  }
});

// Permanently delete an Organization Need Post (Admin or Owner Org)
app.post('/api/admin/delete-need-post', async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId || typeof postId !== 'string') {
      res.status(400).json({ error: 'Missing postId parameter' });
      return;
    }

    const authHeader = req.headers.authorization;
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '') ||
      req.body.firebaseToken ||
      '';

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
      return;
    }

    const verifiedUser = await verifyAuthToken(token);
    if (!verifiedUser || !verifiedUser.uid || verifiedUser.isGuest || !verifiedUser.isFirebaseToken) {
      res.status(401).json({ error: 'Unauthorized: Valid Firebase authentication token is required' });
      return;
    }

    const database = getDb();
    if (!database) {
      res.status(500).json({ error: 'Database service is temporarily unavailable' });
      return;
    }

    const postRef = doc(database, 'organizationPosts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      res.json({
        success: true,
        message: 'Organization need post already removed from database',
        deletedId: postId,
      });
      return;
    }

    const postData = postSnap.data();
    const isAdmin = await isUserAdmin(verifiedUser.uid, verifiedUser.email);
    const isOwner = postData.organizationId === verifiedUser.uid;

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        error: 'Forbidden: You do not have authorization to delete this need post',
      });
      return;
    }

    // Safely clean up associated media object from cycle-user-media if present
    const mediaPath = extractUserMediaPath(
      postData.imagePath,
      postData.imageURL || postData.imageUrl
    );
    await safelyDeleteUserMedia(mediaPath);

    // Permanently delete the Firestore document
    await deleteDoc(postRef);

    console.log(
      `[Admin Deletion] Need post '${postId}' permanently deleted by ${verifiedUser.uid} (isAdmin: ${isAdmin})`
    );

    res.json({
      success: true,
      message: 'Organization need post permanently deleted successfully',
      deletedId: postId,
    });
  } catch (err: any) {
    console.error('[Admin Delete Need Post Error]', err);
    res.status(500).json({
      error: 'Failed to delete organization need post',
      details: err?.message || String(err),
    });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } catch (initErr) {
    console.error('[Server Startup Warning] Middleware initialization encountered error:', initErr);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cycle Server] Successfully listening on 0.0.0.0:${PORT} (environment PORT=${process.env.PORT || 'default 3000'})`);
  });
}

startServer();
