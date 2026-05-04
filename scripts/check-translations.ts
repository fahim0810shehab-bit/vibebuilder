import fs from 'fs';

const API_BASE_URL = 'https://api.seliseblocks.com';
const PROJECT_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
const CLIENT_ID = 'd42841f2-3cb6-4d03-9be3-6e6d24ce6443';
const CLIENT_SECRET = 'a5a283c9ee3e4b32b59981f3683aa582';

async function authenticate() {
  const formData = new FormData();
  formData.append('grant_type', 'client_credentials');
  formData.append('client_id', CLIENT_ID);
  formData.append('client_secret', CLIENT_SECRET);
  const response = await fetch(`${API_BASE_URL}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: { 'x-blocks-key': PROJECT_KEY },
    body: formData
  });
  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
  return (await response.json()).access_token;
}

async function getUilmFile(language: string, module: string) {
  const params = new URLSearchParams({ Language: language, ModuleName: module, ProjectKey: PROJECT_KEY });
  const res = await fetch(`${API_BASE_URL}/uilm/v1/Key/GetUilmFile?${params}`, {
    headers: { 'x-blocks-key': PROJECT_KEY }
  });
  const text = await res.text();
  console.log(`[${language}][${module}] Status: ${res.status}, Body: ${text.substring(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  // First see what English has loaded so we know what keys to translate
  console.log('=== English common keys ===');
  const enCommon = await getUilmFile('en-US', 'common');
  console.log('en-US common:', JSON.stringify(enCommon, null, 2));

  console.log('\n=== German common keys ===');
  const deCommon = await getUilmFile('de-DE', 'common');
  console.log('de-DE common:', JSON.stringify(deCommon, null, 2));
}

main();
