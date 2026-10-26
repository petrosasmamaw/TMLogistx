import crypto from 'crypto';
import { config } from '../config/index.js';

/**
 * Upload image (data URI or base64) to Cloudinary. Returns secure_url or null.
 */
export async function uploadProfileImage(filePayload) {
  if (!filePayload) return null;
  const { cloudName, apiKey, apiSecret, uploadPreset } = config.cloudinary;
  if (!cloudName) {
    console.warn('[Cloudinary] CLOUDINARY_CLOUD_NAME not set — avatar not uploaded');
    return null;
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append('file', filePayload);
  form.append('folder', 'tmlogistx/profiles');

  if (uploadPreset) {
    form.append('upload_preset', uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=tmlogistx/profiles&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
  } else {
    console.warn('[Cloudinary] Set CLOUDINARY_UPLOAD_PRESET or API key/secret');
    return null;
  }

  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
  return data.secure_url || null;
}
