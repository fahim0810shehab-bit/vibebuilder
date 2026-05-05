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

async function saveKey(token: string, moduleId: string, keyName: string, culture: string, value: string) {
  const payload = {
    keyName: keyName,
    moduleId: moduleId,
    projectKey: PROJECT_KEY,
    resources: [
      {
        value: value,
        culture: culture,
        characterLength: value.length
      }
    ],
    isNewKey: true,
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
    console.error(`[FAILED] ${keyName} (${culture}): ${res.status} - ${err}`);
  } else {
    console.log(`[SUCCESS] ${keyName} (${culture})`);
  }
}

async function main() {
  // Get args from command line: ts-node scripts/save-single-key.ts <key> <culture> <value>
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: ts-node scripts/save-single-key.ts <key> <culture> <value>');
    return;
  }

  const [keyName, culture, value] = args;

  try {
    const token = await authenticate();
    const moduleId = await getModuleId(token);
    await saveKey(token, moduleId, keyName, culture, value);
  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
