const axios = require('axios');

const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah (Allowed on Free Tier)

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ELEVENLABS_API_KEY is not defined in environment variables.');
    }
  }

  get headers() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generates Text-to-Speech audio using ElevenLabs Multilingual v2 model.
   * @param {string} text - The text to speak.
   * @param {string} voiceId - The ElevenLabs Voice ID (optional).
   * @returns {Promise<string>} Base64 encoded audio string.
   */
  async textToSpeech(text, voiceId = DEFAULT_VOICE_ID) {
    try {
      const response = await axios.post(
        `${ELEVENLABS_API_BASE_URL}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: this.headers,
          responseType: 'arraybuffer' // Request raw binary audio data
        }
      );

      // Convert the raw ArrayBuffer to a Base64 string
      const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
      return base64Audio;
    } catch (error) {
      console.error('ElevenLabs TTS Error:', error.response?.data?.toString() || error.message);
      throw new Error(`Failed to generate TTS via ElevenLabs`);
    }
  }
}

module.exports = {
  elevenLabsService: new ElevenLabsService()
};
