const API_BASE_URL = 'https://api.seliseblocks.com';
const CLIENT_ID = 'd42841f2-3cb6-4d03-9be3-6e6d24ce6443';
const CLIENT_SECRET = 'a5a283c9ee3e4b32b59981f3683aa582';
const X_BLOCKS_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
const PROJECT_KEY = 'psnjei';
const MODULE_ID = '25b40560-43b1-4263-88e7-407099e3b075'; // 'common' module

async function authenticate() {
  const formData = new FormData();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', CLIENT_ID);
  formData.append('client_secret', CLIENT_SECRET);

  const res = await fetch(`${API_BASE_URL}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: { 'x-blocks-key': X_BLOCKS_KEY },
    body: formData
  });

  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function addLanguageToModule(token: string, culture: string) {
  // First, we need to find the Language record for this culture
  const langRes = await fetch(`${API_BASE_URL}/uilm/v1/Language/Gets`, {
    headers: { 'Authorization': `Bearer ${token}`, 'x-blocks-key': X_BLOCKS_KEY }
  });
  const allLangs = await langRes.json();
  const lang = allLangs.find((l: any) => l.languageCode === culture);

  if (!lang) {
    console.error(`Language with culture code ${culture} not found in Selise system.`);
    return;
  }

  console.log(`Found language: ${lang.languageName} (${lang.languageCode}). ID: ${lang.itemId}`);

  // Now, save this language to the module
  const payload = {
    moduleId: MODULE_ID,
    languageId: lang.itemId,
    projectKey: PROJECT_KEY,
    isDefault: false
  };

  const saveRes = await fetch(`${API_BASE_URL}/uilm/v1/ModuleLanguage/Save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-blocks-key': X_BLOCKS_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!saveRes.ok) {
    const err = await saveRes.text();
    console.error(`Failed to add language to module: ${saveRes.status} - ${err}`);
  } else {
    console.log(`Successfully added ${lang.languageName} to the module.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx ts-node scripts/add-new-language.ts <culture-code> (e.g. es-ES)');
    return;
  }

  const cultureCode = args[0];

  try {
    const token = await authenticate();
    await addLanguageToModule(token, cultureCode);
  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
