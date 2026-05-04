import { getAuthToken } from './contentService';

const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;

export const mediaService = {
  async uploadImage(file: File): Promise<string> {
    const token = getAuthToken();

    try {
      // Step 1 — get presigned URL
      // We try with SLUG first as projectKey, fallback to KEY if needed
      const presignRes = await fetch(`${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`, {
        method: 'POST',
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: file.name,
          projectKey: SLUG || KEY,
          moduleName: 8,
          accessModifier: 'Public',
          contentType: file.type,
        }),
      });

      if (!presignRes.ok) {
        const errText = await presignRes.text();
        console.warn('[mediaService] Presign failed with status:', presignRes.status, errText);
        throw new Error(`Presign failed: HTTP ${presignRes.status}`);
      }

      const presignJson = await presignRes.json();
      const uploadUrl: string = presignJson?.uploadUrl || presignJson?.data?.uploadUrl;

      if (!uploadUrl) {
        console.warn('[mediaService] No uploadUrl in response:', presignJson);
        throw new Error('No uploadUrl in response');
      }

      // Step 2 — upload binary to Azure
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob',
        },
        body: file,
      });

      if (!uploadRes.ok) throw new Error(`Azure upload failed: HTTP ${uploadRes.status}`);

      // Step 3 — return permanent URL (strip SAS query string)
      const finalUrl = uploadUrl.split('?')[0];
      console.log('[mediaService] Upload success:', finalUrl);
      return finalUrl;
    } catch (err) {
      console.warn('[mediaService] Upload failed, returning object URL as fallback', err);
      // Fallback to object URL so user sees the image locally at least
      return URL.createObjectURL(file);
    }
  },
};
