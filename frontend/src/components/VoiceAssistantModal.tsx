import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { Modal, Portal, Text, useTheme, IconButton, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { audioService } from '../services/audioService';

interface VoiceAssistantModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
};

export default function VoiceAssistantModal({ visible, onDismiss }: VoiceAssistantModalProps) {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('zul');
  const flatListRef = useRef<FlatList>(null);

  const handleClose = () => {
    setMessages([]);
    Speech.stop();
    onDismiss();
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      await stopAndProcess();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      Speech.stop();
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

      // Send to backend with selected language
      const data = await audioService.sendVoiceQuery(uri, selectedLanguage, lat, lng);
      
      if (data.success) {
        const userMsg: Message = { id: Date.now().toString() + '-u', sender: 'user', text: data.query.native };
        const astMsg: Message = { id: Date.now().toString() + '-a', sender: 'assistant', text: data.response.text };
        
        setMessages(prev => [...prev, userMsg, astMsg]);
        
        if (data.response.audioUrl) {
          await audioService.playAudio(data.response.audioUrl);
        } else {
          // Fallback to expo-speech
          let ttsLang = 'zu-ZA';
          if (selectedLanguage === 'eng') ttsLang = 'en-ZA';
          if (selectedLanguage === 'sot') ttsLang = 'st-ZA';
          
          Speech.speak(data.response.text, { language: ttsLang });
        }
      }
    } catch (error) {
      console.error('Processing failed', error);
      setMessages(prev => [...prev, { id: Date.now().toString() + '-e', sender: 'assistant', text: 'Sorry, I could not process your request at this time.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? [styles.userBubble, { backgroundColor: theme.colors.primary }] : [styles.assistantBubble, { backgroundColor: theme.colors.surfaceVariant }]]}>
        <Text style={{ color: isUser ? '#fff' : theme.colors.onSurface }}>{item.text}</Text>
      </View>
    );
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleClose} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>Thola Assistant</Text>
          <IconButton icon="close" size={24} onPress={handleClose} style={styles.closeButton} />
        </View>
        
        <SegmentedButtons
          value={selectedLanguage}
          onValueChange={setSelectedLanguage}
          buttons={[
            { value: 'eng', label: 'English' },
            { value: 'sot', label: 'Sotho' },
            { value: 'zul', label: 'Zulu' },
          ]}
          style={styles.languageSelector}
          density="small"
        />

        <View style={styles.chatContainer}>
          {messages.length === 0 && !isProcessing && (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Tap the microphone and ask me to find products or vendors near you!
              </Text>
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} color={theme.colors.primary} size="small" />
              <Text style={{ marginLeft: 10, color: theme.colors.onSurfaceVariant }}>Thinking...</Text>
            </View>
          )}
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
            {isRecording ? 'Tap to Stop' : 'Tap to Speak'}
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
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: -10,
  },
  languageSelector: {
    marginBottom: 15,
  },
  chatContainer: {
    flex: 1,
    width: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageList: {
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 10,
  },
  recordContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
