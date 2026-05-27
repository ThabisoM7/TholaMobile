import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

export class AudioService {
  private recording: Audio.Recording | null = null;

  async startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const customOptions: Audio.RecordingOptions = {
          isMeteringEnabled: false,
          android: {
            extension: '.aac',
            outputFormat: Audio.AndroidOutputFormat.AAC_ADTS,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        };

        const { recording } = await Audio.Recording.createAsync(customOptions);
        this.recording = recording;
      } else {
        throw new Error('Microphone permission not granted');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      throw err;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) return null;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return uri;
    } catch (error) {
      console.error('Failed to stop recording', error);
      throw error;
    }
  }

  async playAudio(uri: string) {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play audio', error);
      throw error;
    }
  }

  async sendVoiceQuery(audioUri: string, language: string, lat: number, lng: number) {
    try {
      const formData = new FormData();
      
      const fileExt = audioUri.split('.').pop() || 'm4a';
      
      formData.append('audio', {
        uri: audioUri,
        name: `voice_query.${fileExt}`,
        type: `audio/${fileExt === 'm4a' ? 'mp4' : fileExt}`,
      } as any);

      formData.append('language', language);
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());

      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${apiClient.defaults.baseURL}/api/assistant/voice-query`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend Voice Query Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send voice query', error);
      throw error;
    }
  }
}

export const audioService = new AudioService();
