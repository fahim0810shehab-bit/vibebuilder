const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

/**
 * Gets the auth token by checking all possible storage locations.
 * Primary: Zustand persist store ('auth-storage') which is always populated.
 * Fallback: Direct localStorage keys set by editor/dashboard pages.
 */
const getToken = (): string => {
  // 1. Primary: Zustand persist store (always the most reliable)
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token && token.length > 20) {
        return token;
      }
    }
  } catch {
    // ignore parse errors
  }

  // 2. Fallbacks: direct localStorage keys
  const fallbackKeys = [
    'access_token',
    'token',
    'selise_access_token',
    'selise_token',
    'blocks_access_token',
    'id_token',
  ];

  for (const key of fallbackKeys) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
    if (val && val.length > 20) {
      return val;
    }
  }

  console.error('[MEDIA] No auth token found in any storage key');
  return '';
};

export const mediaService = {
  async uploadImage(file: File): Promise<string> {
    const token = getToken();

    console.log('[MEDIA-1] File:', file.name, file.type, file.size);
    console.log('[MEDIA-2] Token exists:', !!token, '| length:', token.length);
    console.log('[MEDIA-3] BASE:', BASE);
    console.log('[MEDIA-4] KEY:', KEY?.substring(0, 10) + '...');

    try {
      // ── STEP A: Get presigned URL from Selise UDS ──────────────────────────
      const requestBody = {
        name: file.name,
        projectKey: KEY,
        moduleName: 8,            // 8 = Content/Website module in Selise UDS
        accessModifier: 'Public',
        contentType: file.type,
        fileSize: file.size,
        description: 'VibeBuilder image upload',
      };

      console.log('[MEDIA-5] Presign request:', JSON.stringify(requestBody));

      const presignRes = await fetch(
        `${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-blocks-key': KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('[MEDIA-6] Presign HTTP status:', presignRes.status);

      if (!presignRes.ok) {
        const errText = await presignRes.text();
        console.error('[MEDIA-7] Presign failed:', presignRes.status, errText);
        return URL.createObjectURL(file);
      }

      const presignData = await presignRes.json();
      console.log('[MEDIA-8] Presign response:', JSON.stringify(presignData));

      // Handle ALL possible response formats Selise has ever used
      const uploadUrl =
        presignData?.uploadUrl ||
        presignData?.UploadUrl ||
        presignData?.data?.uploadUrl ||
        presignData?.result?.uploadUrl ||
        presignData?.url ||
        presignData?.presignedUrl ||
        presignData?.signedUrl ||
        presignData?.fileUrl;

      console.log('[MEDIA-9] Upload URL found:', uploadUrl ? uploadUrl.substring(0, 80) + '...' : 'NONE');

      if (!uploadUrl) {
        console.error('[MEDIA-10] No upload URL in response:', presignData);
        return URL.createObjectURL(file);
      }

      // ── STEP B: Upload binary to Azure Blob Storage ─────────────────────────
      console.log('[MEDIA-11] Uploading to Azure...');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob',
          'Content-Length': String(file.size),
        },
        body: file,
      });

      console.log('[MEDIA-12] Azure upload status:', uploadRes.status);

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('[MEDIA-13] Azure upload failed:', uploadRes.status, errText);
        return URL.createObjectURL(file);
      }

      // ── STEP C: Return permanent CDN URL (strip SAS query string) ───────────
      const permanentUrl = uploadUrl.split('?')[0];
      console.log('[MEDIA-14] SUCCESS — Permanent URL:', permanentUrl);
      return permanentUrl;

    } catch (err: any) {
      console.error('[MEDIA-ERROR]', err?.message, err);
      return URL.createObjectURL(file);
    }
  },
};
