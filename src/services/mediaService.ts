const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

const getToken = (): string =>
  localStorage.getItem('access_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('selise_access_token') || '';

export const mediaService = {
  async uploadImage(file: File): Promise<string> {
    try {
      console.log('[MEDIA] Starting upload:', file.name);

      const presignRes = await fetch(
        `${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-blocks-key': KEY,
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            name: file.name,
            projectKey: KEY,
            moduleName: 8,
            accessModifier: 'Public',
            contentType: file.type,
            fileSize: file.size
          })
        }
      );

      const presignData = await presignRes.json();
      console.log('[MEDIA] Presign response:', presignData);

      const uploadUrl =
        presignData?.uploadUrl ||
        presignData?.data?.uploadUrl ||
        presignData?.result?.uploadUrl ||
        presignData?.url ||
        presignData?.UploadUrl;

      if (!uploadUrl) {
        console.error('[MEDIA] No upload URL:', presignData);
        return URL.createObjectURL(file);
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob'
        },
        body: file
      });

      console.log('[MEDIA] Upload status:', uploadRes.status);

      if (!uploadRes.ok) {
        return URL.createObjectURL(file);
      }

      const permanentUrl = uploadUrl.split('?')[0];
      console.log('[MEDIA] Permanent URL:', permanentUrl);
      return permanentUrl;

    } catch (err) {
      console.error('[MEDIA] Error:', err);
      return URL.createObjectURL(file);
    }
  },
};
