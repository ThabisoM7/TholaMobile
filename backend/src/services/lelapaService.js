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

  async transcribeAudio(audioFilePath, originalname = 'audio.m4a', mimetype = 'audio/mp4') {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath), {
        filename: originalname,
        contentType: mimetype
      });

      const response = await axios.post(`${LELAPA_API_BASE_URL}/transcribe/sync`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders(),
        },
      });

      return response.data.text || '';
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('Lelapa ASR Error:', errDetail);
      throw new Error(`Failed to transcribe audio via Lelapa API: ${errDetail}`);
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
