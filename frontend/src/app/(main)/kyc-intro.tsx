import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { router } from 'expo-router';

export default function KycIntroScreen() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Welcome to Thola!</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Your business profile has been successfully created.
        </Text>
      </View>

      <Card style={styles.card} mode="outlined">
        <Card.Title title="Start Selling Immediately" subtitle="Delayed Verification" />
        <Card.Content style={styles.cardContent}>
          <Text style={{ marginBottom: 16 }}>
            You can start using Thola to manage your business immediately! However, to build trust with customers and unlock the "Verified Trader" badge, you will need to complete identity verification.
          </Text>
          
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => router.replace('/(main)/kyc-verification')}
          >
            Get Verified Now
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
