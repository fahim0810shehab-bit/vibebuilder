const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

// Use the EXACT token key found from debug above
const getToken = (): string => {
  const possibleKeys = [
    'access_token',
    'token',
    'selise_access_token',
    'blocks_access_token',
    'id_token',
    'selise_token',
    'auth_token'
  ];
  for (const key of possibleKeys) {
    const val = localStorage.getItem(key) || 
                sessionStorage.getItem(key);
    if (val && val.startsWith('eyJ')) return val;
  }
  return '';
};

export async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  
  if (!token) {
    console.error('[UPLOAD] No auth token - cannot upload to Selise');
    return '';
  }

  try {
    // Step 1: Get presigned URL
    const body = {
      name: file.name,
      projectKey: KEY,
      moduleName: 8,
      accessModifier: 'Public',
      contentType: file.type,
      fileSize: file.size
    };
    
    const r1 = await fetch(
      `${BASE}/uds/v1/Files/GetPreSignedUrlForUpload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-blocks-key': KEY,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      }
    );

    const d1 = await r1.json();

    // Find upload URL in response
    const uploadUrl =
      d1?.uploadUrl || d1?.UploadUrl ||
      d1?.data?.uploadUrl || d1?.result?.uploadUrl ||
      d1?.url || d1?.presignedUrl;

    if (!uploadUrl) {
      console.error('[UPLOAD] No upload URL in response:', d1);
      return '';
    }

    // Step 2: Upload to Azure Blob
    const r2 = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'x-ms-blob-type': 'BlockBlob'
      },
      body: file
    });

    if (!r2.ok) {
      console.error('[UPLOAD] Azure upload failed:', r2.status);
      return '';
    }

    // Step 3: Return permanent URL
    const permanentUrl = uploadUrl.split('?')[0];

    if (permanentUrl.startsWith('blob:')) {
      throw new Error('Got blob URL - UDS upload failed');
    }
    if (!permanentUrl.startsWith('https://')) {
      throw new Error('Invalid URL: ' + permanentUrl);
    }
    console.log('[UDS] Permanent URL confirmed:', permanentUrl);
    return permanentUrl;

  } catch (err: any) {
    console.error('[UPLOAD] Error:', err.message);
    return '';
  }
}
