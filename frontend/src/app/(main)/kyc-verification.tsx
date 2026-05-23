import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { IdnormService } from '../../api/IdnormService';
import { useAuthStore } from '../../store/authStore';

export default function KycVerificationScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendorId, setVendorId] = useState('');
  const theme = useTheme();
  const { checkAuth } = useAuthStore();

  const handleStartVerification = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Initialize session with backend
      const { sessionUrl, reference } = await IdnormService.createVerificationSession();
      setVendorId(reference);

      // 2. Open idnorm hosted URL in secure web browser
      const result = await WebBrowser.openBrowserAsync(sessionUrl);

      // 3. When browser is closed, we simulate the callback (since we don't have a real webhook hooked up yet)
      // In production, you might just poll the status instead
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // Simulate a successful verification for demonstration purposes
        // In a real scenario, the backend webhook handles this and we just checkStatus()
        await IdnormService.simulateCallback(reference, 'approved');

        // Refresh the user's KYC state
        await checkAuth();

        // Navigate back to the dashboard
        router.replace('/(main)/vendor-dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initialize verification session.');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Identity Verification</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Get your "Verified Trader" badge by securely confirming your identity with idnorm.
        </Text>
      </View>

      <Card style={styles.card} mode="outlined">
        <Card.Title title="Secure KYC Process" subtitle="Powered by idnorm" />
        <Card.Content style={styles.cardContent}>
          <Text style={{ marginBottom: 16 }}>
            You will be redirected to a secure page to take a photo of your ID document and a quick selfie.
          </Text>

          {error ? <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text> : null}

          <Button
            icon="shield-check"
            mode="contained"
            style={styles.button}
            loading={loading}
            disabled={loading}
            onPress={handleStartVerification}
          >
            {loading ? 'Initializing...' : 'Get Verified Now'}
          </Button>

          <Button
            mode="text"
            style={{ marginTop: 8 }}
            onPress={() => router.replace('/(main)/vendor-dashboard')}
          >
            I'll do this later
          </Button>
        </Card.Content>
      </Card>
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
    backgroundColor: '#fff',
  },
  cardContent: {
    paddingVertical: 10,
  },
  button: {
    paddingVertical: 6,
  }
});
