const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const LELAPA_API_BASE_URL = 'https://api.lelapa.ai/v1';

class LelapaService {
  constructor() {
    this.apiKey = process.env.LELAPA_API_KEY || process.env.LELAPA_API_K || '';
    if (!this.apiKey) {
      console.warn('LELAPA_API_KEY is not defined in environment variables.');
    }
  }

  get headers() {
    return {
      'X-CLIENT-TOKEN': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async transcribeAudio(audioFilePath) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));

      const response = await axios.post(`${LELAPA_API_BASE_URL}/transcribe/sync`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders(),
        },
      });

      return response.data.text || '';
    } catch (error) {
      console.error('Lelapa ASR Error:', error.response?.data || error.message);
      throw new Error('Failed to transcribe audio via Lelapa API');
    }
  }

  async translateText(text, sourceLang, targetLang) {
    try {
      const response = await axios.post(`${LELAPA_API_BASE_URL}/translate/process`, {
        input_text: text,
        source_lang: sourceLang,
        target_lang: targetLang
      }, {
        headers: this.headers
      });

      return response.data.translation?.[0]?.translated_text || '';
    } catch (error) {
      console.error('Lelapa Translation Error:', error.response?.data || error.message);
      throw new Error(`Failed to translate text from ${sourceLang} to ${targetLang}`);
    }
  }

  async textToSpeech(text, language) {
    console.warn('Lelapa TTS is not officially supported on /v1/tts. Mocking return.');
    return '';
  }
}

module.exports = {
  lelapaService: new LelapaService()
};
