import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function KycIntroScreen() {
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const { checkAuth } = useAuthStore();

  const pickImage = async (type: 'id' | 'selfie') => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Permission to access the camera is required for verification.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'id' ? [4, 3] : [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      if (type === 'id') setIdImage(result.assets[0].uri);
      else setSelfieImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!idImage || !selfieImage) return;
    
    setLoading(true);
    try {
      // For MVP, we simulate upload by just sending dummy URLs to backend
      await apiClient.post('/kyc', {
        id_document_url: idImage,
        selfie_url: selfieImage
      });
      
      // Navigate to dashboard
      await checkAuth(); // refresh user state if needed
      router.replace('/(main)/vendor-dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to submit KYC. Make sure your business is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Identity Verification</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          To ensure trust on Thola, all vendors must be verified.
        </Text>
      </View>

      <Card style={styles.card} mode="outlined">
        <Card.Title title="1. Official ID Document" subtitle="Take a clear photo of your ID or Passport" />
        <Card.Content style={styles.cardContent}>
          {idImage ? (
            <Image source={{ uri: idImage }} style={styles.imagePreview} />
          ) : (
            <Button icon="camera" mode="contained-tonal" onPress={() => pickImage('id')}>
              Take ID Photo
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Title title="2. Selfie Verification" subtitle="Take a clear selfie matching your ID" />
        <Card.Content style={styles.cardContent}>
          {selfieImage ? (
            <Image source={{ uri: selfieImage }} style={styles.imagePreview} />
          ) : (
            <Button icon="camera-front" mode="contained-tonal" onPress={() => pickImage('selfie')}>
              Take Selfie
            </Button>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.submitButton}
        disabled={!idImage || !selfieImage || loading}
        onPress={handleSubmit}
      >
        {loading ? <ActivityIndicator color="white" /> : 'Submit Verification'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginTop: 8,
  },
  card: {
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 40,
    paddingVertical: 8,
  }
});
