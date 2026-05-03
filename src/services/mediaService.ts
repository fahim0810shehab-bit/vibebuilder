const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

function getToken(): string {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) return token;
    }
  } catch {
    // ignore
  }
  return localStorage.getItem('access_token') ?? '';
}

export const mediaService = {
  async uploadImage(file: File): Promise<string> {
    const token = getToken();

    try {
      // Step 1 — get presigned URL
      const presignRes = await fetch(`${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`, {
        method: 'POST',
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: file.name,
          projectKey: KEY,
          moduleName: 8,
          accessModifier: 'Public',
          contentType: file.type,
        }),
      });

      if (!presignRes.ok) throw new Error(`Presign failed: HTTP ${presignRes.status}`);

      const presignJson = await presignRes.json();
      const uploadUrl: string = presignJson?.uploadUrl ?? presignJson?.data?.uploadUrl;

      if (!uploadUrl) throw new Error('No uploadUrl in response');

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
      return uploadUrl.split('?')[0];
    } catch (err) {
      console.warn('[mediaService] Upload failed, returning object URL as fallback', err);
      return URL.createObjectURL(file);
    }
  },
};
