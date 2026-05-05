import fs from 'fs';

const API_BASE_URL = 'https://api.seliseblocks.com';
const CLIENT_ID = 'd42841f2-3cb6-4d03-9be3-6e6d24ce6443';
const CLIENT_SECRET = 'a5a283c9ee3e4b32b59981f3683aa582';
const PROJECT_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
const TARGET_MODULE_NAME = 'common';

async function authenticate(): Promise<string> {
  const formData = new FormData();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', CLIENT_ID);
  formData.append('client_secret', CLIENT_SECRET);

  const res = await fetch(`${API_BASE_URL}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: { 'x-blocks-key': PROJECT_KEY },
    body: formData
  });

  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function getModuleId(token: string): Promise<string> {
  const params = new URLSearchParams({ ProjectKey: PROJECT_KEY });
  const res = await fetch(`${API_BASE_URL}/uilm/v1/Module/Gets?${params}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'x-blocks-key': PROJECT_KEY }
  });
  const modules = await res.json();
  const mod = modules.find((m: any) => m.moduleName === TARGET_MODULE_NAME);
  if (!mod) throw new Error(`Module ${TARGET_MODULE_NAME} not found`);
  return mod.itemId;
}

async function getExistingKeyMap(moduleId: string): Promise<Record<string, string>> {
  // Use GetUilmFile to find which keys already exist
  const res = await fetch(`${API_BASE_URL}/uilm/v1/Key/GetUilmFile?Language=en-US&ModuleName=${TARGET_MODULE_NAME}&ProjectKey=${PROJECT_KEY}`, {
    headers: { 'x-blocks-key': PROJECT_KEY }
  });
  if (!res.ok) return {};
  return await res.json();
}

async function saveKey(token: string, moduleId: string, keyName: string, exists: boolean, translations: Record<string, string>) {
  const payload = {
    keyName: keyName,
    moduleId: moduleId,
    projectKey: PROJECT_KEY,
    resources: Object.entries(translations).map(([culture, value]) => ({
      value: value,
      culture: culture,
      characterLength: value.length
    })),
    isNewKey: !exists,
    shouldPublish: true
  };

  const res = await fetch(`${API_BASE_URL}/uilm/v1/Key/Save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-blocks-key': PROJECT_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[FAILED] ${keyName}: ${res.status} - ${err}`);
  } else {
    console.log(`[SUCCESS] ${keyName} ${exists ? 'updated' : 'created'}.`);
  }
}

async function main() {
  try {
    const token = await authenticate();
    const moduleId = await getModuleId(token);
    const existingKeyMap = await getExistingKeyMap(moduleId);
    const existingKeys = Object.keys(existingKeyMap);
    console.log(`Found ${existingKeys.length} existing keys in ${TARGET_MODULE_NAME} via en-US file.`);

    const payloadPath = './scripts/translations-payload.json';
    const translations = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

    // Reorganize translations by key
    const keysToSync: Record<string, Record<string, string>> = {};
    for (const [culture, keys] of Object.entries(translations)) {
      for (const [keyName, value] of Object.entries(keys as Record<string, string>)) {
        if (!keysToSync[keyName]) keysToSync[keyName] = {};
        keysToSync[keyName][culture] = value;
      }
    }

    // Add English values from en-US.json
    const enUsPath = './en-US.json';
    if (fs.existsSync(enUsPath)) {
      const enUs = JSON.parse(fs.readFileSync(enUsPath, 'utf8'));
      for (const [keyName, value] of Object.entries(enUs)) {
        if (value !== '[ KEY MISSING ]') {
          if (!keysToSync[keyName]) keysToSync[keyName] = {};
          keysToSync[keyName]['en-US'] = value as string;
        }
      }
    }
    
    // Final check for critical en-US keys that might be missing in en-US.json
    if (keysToSync['PUBLISH'] && !keysToSync['PUBLISH']['en-US']) keysToSync['PUBLISH']['en-US'] = 'Publish';
    if (keysToSync['UNPUBLISH'] && !keysToSync['UNPUBLISH']['en-US']) keysToSync['UNPUBLISH']['en-US'] = 'Unpublish';
    if (keysToSync['DASHBOARD'] && !keysToSync['DASHBOARD']['en-US']) keysToSync['DASHBOARD']['en-US'] = 'Dashboard';
    if (keysToSync['SAVE'] && !keysToSync['SAVE']['en-US']) keysToSync['SAVE']['en-US'] = 'Save';

    console.log(`Syncing ${Object.keys(keysToSync).length} keys...`);

    for (const [keyName, values] of Object.entries(keysToSync)) {
      const exists = existingKeys.includes(keyName);
      await saveKey(token, moduleId, keyName, exists, values);
    }

    console.log('\nSync complete!');
  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
