import { getAuthToken } from './contentService';

const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;

export const mediaService = {
  async uploadImage(file: File): Promise<string> {
    const token = getAuthToken();

    try {
      console.log('[mediaService] Requesting pre-signed URL for:', file.name);
      
      // Step 1 — get presigned URL
      const presignRes = await fetch(`${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`, {
        method: 'POST',
        headers: {
          'x-blocks-key': KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: file.name,
          projectKey: SLUG, // Selise UDS usually expects the project slug
          moduleName: 8,    // 8 is standard for Content/Website modules
          accessModifier: 'Public',
          contentType: file.type,
        }),
      });

      if (!presignRes.ok) {
        const errText = await presignRes.text();
        console.error('[mediaService] UDS Presign Failed:', presignRes.status, errText);
        throw new Error(`UDS Presign Failed: ${presignRes.status}`);
      }

      const presignJson = await presignRes.json();
      // Handle various response structures from different Selise versions
      const uploadUrl: string = presignJson?.uploadUrl || presignJson?.data?.uploadUrl || presignJson?.preSignedUrl;

      if (!uploadUrl) {
        console.error('[mediaService] Invalid UDS response format:', presignJson);
        throw new Error('No uploadUrl in UDS response');
      }

      console.log('[mediaService] Uploading binary to Azure...');

      // Step 2 — upload binary to Azure
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('[mediaService] Azure Upload Failed:', uploadRes.status, errText);
        throw new Error(`Azure Upload Failed: ${uploadRes.status}`);
      }

      // Step 3 — return permanent URL (strip SAS query string)
      const finalUrl = uploadUrl.split('?')[0];
      console.log('[mediaService] Upload Success:', finalUrl);
      return finalUrl;
    } catch (err) {
      console.error('[mediaService] CRITICAL UDS ERROR:', err);
      // We return an object URL as a last-resort fallback so the user sees their image 
      // during the current session, even if it won't persist on reload.
      return URL.createObjectURL(file);
    }
  },
};
