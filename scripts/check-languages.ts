import fs from 'fs';

const API_BASE_URL = 'https://api.seliseblocks.com';
const X_BLOCKS_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
const CLIENT_ID = 'd42841f2-3cb6-4d03-9be3-6e6d24ce6443';
const CLIENT_SECRET = 'a5a283c9ee3e4b32b59981f3683aa582';

async function authenticate() {
  const formData = new FormData();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', CLIENT_ID);
  formData.append('client_secret', CLIENT_SECRET);

  const response = await fetch(`${API_BASE_URL}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: { 'x-blocks-key': X_BLOCKS_KEY },
    body: formData
  });

  if (!response.ok) throw new Error(`Auth failed`);
  return (await response.json()).access_token;
}

async function getLanguages() {
  const response = await fetch(`${API_BASE_URL}/uilm/v1/Language/Gets`, {
    method: 'GET',
    headers: {
      'x-blocks-key': X_BLOCKS_KEY,
      'accept': 'application/json'
    }
  });
  return await response.json();
}

async function checkLanguages() {
  const langs = await getLanguages();
  console.log('Currently Configured Languages:');
  langs.forEach((l: any) => console.log(`- ${l.languageName} (${l.languageCode})`));
}

checkLanguages();
