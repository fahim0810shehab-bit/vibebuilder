import fs from 'fs';

const API_BASE_URL = 'https://api.seliseblocks.com';
const PROJECT_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
const CULTURES = ['en-US', 'de-DE', 'fr-FR', 'bn-BD'];
const MODULE_NAME = 'common';

async function downloadAndVerify(culture: string) {
  console.log(`Checking ${culture}...`);
  const url = `${API_BASE_URL}/uilm/v1/Key/GetUilmFile?Language=${culture}&ModuleName=${MODULE_NAME}&ProjectKey=${PROJECT_KEY}`;
  
  try {
    const res = await fetch(url, { headers: { 'x-blocks-key': PROJECT_KEY } });
    if (!res.ok) {
      console.error(`[FAIL] ${culture} download failed: ${res.status}`);
      return;
    }
    
    const data = await res.json();
    const keyCount = Object.keys(data).length;
    
    if (keyCount === 0) {
      console.warn(`[WARN] ${culture} has 0 keys!`);
    } else {
      console.log(`[PASS] ${culture} has ${keyCount} keys.`);
      // Check for specific critical keys
      const criticalKeys = ['DASHBOARD', 'SAVE', 'PUBLISH', 'WELCOME_MESSAGE', 'BTN_SUBMIT'];
      criticalKeys.forEach(k => {
        if (data[k]) {
          console.log(`  - Key ${k}: "${data[k]}"`);
        } else {
          console.error(`  - [MISSING] Key ${k}`);
        }
      });
    }
    
    // Save to temp file for inspection
    fs.writeFileSync(`./scripts/verify-${culture}.json`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[ERROR] ${culture}:`, err);
  }
}

async function main() {
  for (const culture of CULTURES) {
    await downloadAndVerify(culture);
    console.log('---');
  }
}

main();
