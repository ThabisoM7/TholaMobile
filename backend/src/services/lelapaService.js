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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async transcribeAudio(audioFilePath) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));

      const response = await axios.post(`${LELAPA_API_BASE_URL}/transcribe`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders(),
        },
      });

      return response.data.text || '';
    } catch (error) {
      console.error('Lelapa ASR Error:', error);
      throw new Error('Failed to transcribe audio via Lelapa API');
    }
  }

  async translateText(text, sourceLang, targetLang) {
    try {
      const response = await axios.post(`${LELAPA_API_BASE_URL}/translate`, {
        text,
        source_language: sourceLang,
        target_language: targetLang
      }, {
        headers: this.headers
      });

      return response.data.translated_text || '';
    } catch (error) {
      console.error('Lelapa Translation Error:', error);
      throw new Error(`Failed to translate text from ${sourceLang} to ${targetLang}`);
    }
  }

  async textToSpeech(text, language) {
    try {
      const response = await axios.post(`${LELAPA_API_BASE_URL}/tts`, {
        text,
        language
      }, {
        headers: this.headers
      });

      return response.data.audio_url || '';
    } catch (error) {
      console.error('Lelapa TTS Error:', error);
      throw new Error('Failed to convert text to speech via Lelapa API');
    }
  }
}

module.exports = {
  lelapaService: new LelapaService()
};
