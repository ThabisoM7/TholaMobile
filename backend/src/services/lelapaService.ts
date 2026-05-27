import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Constants for Lelapa API endpoints
const LELAPA_API_BASE_URL = 'https://api.lelapa.ai/v1'; // Example URL, replace with actual if different

export class LelapaService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LELAPA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('LELAPA_API_KEY is not defined in environment variables.');
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Transcribe an audio file using Lelapa Vulavula ASR.
   * @param audioFilePath Path to the local audio file to transcribe
   */
  async transcribeAudio(audioFilePath: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));
      // Specify the language if required by the API, e.g., 'zul' or 'tsn'

      const response = await axios.post(`${LELAPA_API_BASE_URL}/transcribe`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders(),
        },
      });

      return response.data.text || ''; // Adjust according to actual response structure
    } catch (error) {
      console.error('Lelapa ASR Error:', error);
      throw new Error('Failed to transcribe audio via Lelapa API');
    }
  }

  /**
   * Translate text to a target language (e.g., from Zulu to English).
   * @param text Text to translate
   * @param sourceLang Source language code (e.g., 'zul', 'tsn')
   * @param targetLang Target language code (e.g., 'eng')
   */
  async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      const response = await axios.post(`${LELAPA_API_BASE_URL}/translate`, {
        text,
        source_language: sourceLang,
        target_language: targetLang
      }, {
        headers: this.headers
      });

      return response.data.translated_text || ''; // Adjust according to actual response structure
    } catch (error) {
      console.error('Lelapa Translation Error:', error);
      throw new Error(`Failed to translate text from ${sourceLang} to ${targetLang}`);
    }
  }

  /**
   * Convert text to speech.
   * @param text Text to synthesize
   * @param language Language code for TTS
   * @returns URL or base64 audio depending on API response
   */
  async textToSpeech(text: string, language: string): Promise<string> {
    try {
      const response = await axios.post(`${LELAPA_API_BASE_URL}/tts`, {
        text,
        language
      }, {
        headers: this.headers
      });

      return response.data.audio_url || ''; // Adjust according to actual response structure
    } catch (error) {
      console.error('Lelapa TTS Error:', error);
      throw new Error('Failed to convert text to speech via Lelapa API');
    }
  }
}

export const lelapaService = new LelapaService();
