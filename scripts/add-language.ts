import fs from 'fs';

const API_BASE_URL = 'https://api.seliseblocks.com';
const CLIENT_ID = 'd42841f2-3cb6-4d03-9be3-6e6d24ce6443';
const CLIENT_SECRET = 'a5a283c9ee3e4b32b59981f3683aa582';
const X_BLOCKS_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
const PROJECT_KEY = 'psnjei';
const MODULE_ID = '25b40560-43b1-4263-88e7-407099e3b075'; // 'common' module

// The languages you requested
const TARGET_CULTURES = ['de-DE', 'fr-FR', 'bn-BD'];

// The translations you want to add
const TRANSLATIONS = [
  { keyName: 'welcome_message', values: { 'de-DE': 'Willkommen', 'fr-FR': 'Bienvenue', 'bn-BD': 'স্বাগতম' } },
  { keyName: 'btn_submit', values: { 'de-DE': 'Einreichen', 'fr-FR': 'Soumettre', 'bn-BD': 'জমা দিন' } },
];

async function authenticate() {
  console.log('Authenticating...');
  const formData = new FormData();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', CLIENT_ID);
  formData.append('client_secret', CLIENT_SECRET);

  const response = await fetch(`${API_BASE_URL}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: {
      'x-blocks-key': X_BLOCKS_KEY
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function saveKey(token: string, keyName: string, culture: string, value: string) {
  const payload = {
    itemId: null,
    keyName: keyName,
    moduleId: MODULE_ID,
    resources: [
      {
        value: value,
        culture: culture,
        characterLength: value.length,
      },
    ],
    routes: [],
    glossaryIds: [],
    isPartiallyTranslated: false,
    isNewKey: true,
    lastUpdateDate: new Date().toISOString(),
    createDate: new Date().toISOString(),
    context: '',
    shouldPublish: true,
    projectKey: PROJECT_KEY,
  };

  const response = await fetch(`${API_BASE_URL}/uilm/v1/Key/Save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-blocks-key': X_BLOCKS_KEY,
      'Content-Type': 'application/json',
      'accept': 'text/plain',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Failed to save key ${keyName} for ${culture}: ${response.status} ${await response.text()}`);
  } else {
    console.log(`Successfully saved key: ${keyName} for ${culture}`);
  }
}

async function main() {
  try {
    const token = await authenticate();
    console.log('Authentication successful. Saving keys...');

    for (const translation of TRANSLATIONS) {
      for (const culture of TARGET_CULTURES) {
        const val = translation.values[culture as keyof typeof translation.values];
        if (val) {
          await saveKey(token, translation.keyName, culture, val);
        }
      }
    }

    console.log('Finished uploading translations.');
  } catch (error) {
    console.error('Error during translation upload:', error);
  }
}

main();
