import fs from 'fs';
const API_BASE_URL = 'https://api.seliseblocks.com';
const PROJECT_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';
async function main() {
  const res = await fetch(`${API_BASE_URL}/uilm/v1/Key/GetUilmFile?Language=en-US&ModuleName=common&ProjectKey=${PROJECT_KEY}`, { headers: { 'x-blocks-key': PROJECT_KEY } });
  const data = await res.json();
  fs.writeFileSync('en-US.json', JSON.stringify(data, null, 2));
}
main();
