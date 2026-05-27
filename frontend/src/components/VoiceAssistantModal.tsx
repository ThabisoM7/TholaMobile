import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import * as Location from 'expo-location';
import { audioService } from '../services/audioService';

interface VoiceAssistantModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function VoiceAssistantModal({ visible, onDismiss }: VoiceAssistantModalProps) {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseAudio, setResponseAudio] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [replyText, setReplyText] = useState('');

  const handleRecordPress = async () => {
    if (isRecording) {
      await stopAndProcess();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      setResponseAudio(null);
      setTranscription('');
      setReplyText('');
      await audioService.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      setIsRecording(false);
    }
  };

  const stopAndProcess = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      const uri = await audioService.stopRecording();
      
      if (!uri) throw new Error('No audio URI returned');

      // Get user location for geospatial queries
      let { status } = await Location.requestForegroundPermissionsAsync();
      let lat = -26.2041; // Default to Johannesburg if denied
      let lng = 28.0473;
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }

      // Send to backend (assume Zulu 'zul' for this MVP, could be selectable)
      const data = await audioService.sendVoiceQuery(uri, 'zul', lat, lng);
      
      if (data.success) {
        setTranscription(data.query.native);
        setReplyText(data.response.text);
        if (data.response.audioUrl) {
          setResponseAudio(data.response.audioUrl);
          await audioService.playAudio(data.response.audioUrl);
        }
      }
    } catch (error) {
      console.error('Processing failed', error);
      setReplyText('Sorry, I could not process your request at this time.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Thola Assistant</Text>
        
        <View style={styles.content}>
          {transcription ? (
            <Text style={styles.transcription}>You: "{transcription}"</Text>
          ) : null}
          
          {replyText ? (
            <Text style={styles.reply}>Assistant: "{replyText}"</Text>
          ) : null}

          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
              <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>Thinking...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.recordContainer}>
          <TouchableOpacity
            style={[styles.recordButton, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]}
            onPress={handleRecordPress}
            disabled={isProcessing}
          >
            <IconButton
              icon={isRecording ? 'stop' : 'microphone'}
              iconColor="#fff"
              size={32}
            />
          </TouchableOpacity>
          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
            {isRecording ? 'Tap to Stop' : 'Tap to Speak (Zulu)'}
          </Text>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 300,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcription: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  reply: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
