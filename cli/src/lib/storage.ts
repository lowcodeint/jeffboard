// Firebase Storage helper for uploading note images

import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';
import { extname } from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Upload a local image file to Firebase Storage and return a permanent download URL.
 * Uses a download token so the URL works without client auth.
 */
export async function uploadNoteImage(
  localPath: string,
  storyShortId: string,
  noteId: string
): Promise<string> {
  const ext = extname(localPath).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    throw new Error(`Unsupported image type: ${ext}. Supported: ${Object.keys(MIME_TYPES).join(', ')}`);
  }

  const bucket = getStorage().bucket();
  const storagePath = `notes/${storyShortId}/${noteId}${ext}`;
  const downloadToken = randomUUID();

  const fileBuffer = readFileSync(localPath);

  const file = bucket.file(storagePath);
  await file.save(fileBuffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  return url;
}
