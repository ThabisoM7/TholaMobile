const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    const dummyFilePath = path.join(__dirname, 'dummy.m4a');
    fs.writeFileSync(dummyFilePath, 'dummy audio data');

    const form = new FormData();
    form.append('audio', fs.createReadStream(dummyFilePath));
    form.append('lat', '-26.2041');
    form.append('lng', '28.0473');

    console.log('Sending request to local backend...');
    const response = await axios.post('https://tholaagentprod.up.railway.app/api/assistant/voice-query', form, {
      headers: form.getHeaders(),
    });

    console.log('Response:', response.status, response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testUpload();
