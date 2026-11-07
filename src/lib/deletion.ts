import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getActiveUserAuthToken } from './userMedia';

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Permanently deletes a plastic report from Firestore and cleans up its media in cycle-user-media.
 * Works seamlessly for both authorized Admins and the original individual report creators.
 */
export async function deleteReportPermanently(reportId: string): Promise<DeleteResult> {
  let serverError: string | null = null;

  // 1. Attempt server-side deletion to also clean up associated media in Supabase storage
  try {
    const token = await getActiveUserAuthToken('reports', false);
    if (token) {
      const resp = await fetch('/api/admin/delete-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportId }),
      });

      if (resp.ok) {
        return { success: true };
      } else {
        const data = await resp.json().catch(() => ({}));
        serverError = data.error || `Server returned ${resp.status}`;
      }
    }
  } catch (err: any) {
    serverError = err?.message || String(err);
  }

  // 2. Direct Firestore client-side deletion (authorized by updated firestore.rules)
  try {
    await deleteDoc(doc(db, 'reports', reportId));
    return { success: true };
  } catch (clientErr: any) {
    console.error('[Client Deletion Failed]', clientErr);
    return {
      success: false,
      error: clientErr?.message || serverError || 'Permission denied or database error.',
    };
  }
}

/**
 * Permanently deletes an Organization Need Post from Firestore and cleans up its media in cycle-user-media.
 * Works seamlessly for both authorized Admins and the original organization owner.
 */
export async function deleteNeedPostPermanently(postId: string): Promise<DeleteResult> {
  let serverError: string | null = null;

  // 1. Attempt server-side deletion to also clean up associated media in Supabase storage
  try {
    const token = await getActiveUserAuthToken('organization-posts', false);
    if (token) {
      const resp = await fetch('/api/admin/delete-need-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId }),
      });

      if (resp.ok) {
        return { success: true };
      } else {
        const data = await resp.json().catch(() => ({}));
        serverError = data.error || `Server returned ${resp.status}`;
      }
    }
  } catch (err: any) {
    serverError = err?.message || String(err);
  }

  // 2. Direct Firestore client-side deletion (authorized by updated firestore.rules)
  try {
    await deleteDoc(doc(db, 'organizationPosts', postId));
    return { success: true };
  } catch (clientErr: any) {
    console.error('[Client Deletion Failed]', clientErr);
    return {
      success: false,
      error: clientErr?.message || serverError || 'Permission denied or database error.',
    };
  }
}
