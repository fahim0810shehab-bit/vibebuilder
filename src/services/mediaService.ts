import { clients } from '@/lib/https';
import { useAuthStore } from '@/state/store/auth';

const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

export async function uploadImage(file: File): Promise<string> {
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) {
    console.error('[UPLOAD] No auth token - cannot upload to Selise');
    return '';
  }

  try {
    console.log('[UPLOAD] Starting upload for:', file.name);
    
    // Step 1: Get presigned URL using the standard clients utility
    const body = {
      name: file.name,
      projectKey: KEY,
      moduleName: 'common',
      accessModifier: 'Public',
      contentType: file.type,
      fileSize: file.size
    };
    
    console.log('[UPLOAD] Requesting presigned URL with body:', body);
    const d1 = await clients.post<any>(
      `${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`,
      JSON.stringify(body)
    );

    console.log('[UPLOAD] Presigned URL response:', d1);

    // Find upload URL in response
    const uploadUrl =
      d1?.uploadUrl || d1?.UploadUrl ||
      d1?.data?.uploadUrl || d1?.result?.uploadUrl ||
      d1?.url || d1?.presignedUrl;

    if (!uploadUrl) {
      console.error('[UPLOAD] No upload URL found in response data');
      return '';
    }

    // Step 2: Upload to Azure Blob (Direct fetch as it's an external URL)
    console.log('[UPLOAD] Uploading to Azure Blob...');
    const r2 = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'x-ms-blob-type': 'BlockBlob'
      },
      body: file
    });

    if (!r2.ok) {
      console.error('[UPLOAD] Azure upload failed status:', r2.status);
      return '';
    }

    // Step 3: Return permanent URL
    const permanentUrl = uploadUrl.split('?')[0];
    console.log('[UPLOAD] Success! Permanent URL:', permanentUrl);

    if (permanentUrl.startsWith('blob:')) {
      throw new Error('Got blob URL - UDS upload failed');
    }
    if (!permanentUrl.startsWith('https://')) {
      throw new Error('Invalid URL: ' + permanentUrl);
    }
    return permanentUrl;

  } catch (err: any) {
    console.error('[UPLOAD] Unexpected error:', err.message);
    return '';
  }
}
