import fs from 'fs';

const API_BASE_URL = 'https://api.seliseblocks.com';
const CLIENT_ID = 'd42841f2-3cb6-4d03-9be3-6e6d24ce6443';
const X_BLOCKS_KEY = 'P3aa4ff2d5aaf4667a333302e4c26be55';

async function testAuth() {
  try {
    const formData = new FormData();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', CLIENT_ID);
    // omitted client_secret

    const response = await fetch(`${API_BASE_URL}/idp/v1/Authentication/Token`, {
      method: 'POST',
      headers: {
        'x-blocks-key': X_BLOCKS_KEY
      },
      body: formData
    });
    
    console.log('Auth Status:', response.status);
    const data = await response.json();
    console.log('Auth Response:', data);
  } catch (err) {
    console.error(err);
  }
}

testAuth();
