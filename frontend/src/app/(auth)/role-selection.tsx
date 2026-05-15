import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RoleSelectionScreen() {
  const theme = useTheme();

  const handleSelectRole = (role: 'CUSTOMER' | 'VENDOR') => {
    router.push({ pathname: '/(auth)/register', params: { role } });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.title}>Join THOLA</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>How would you like to use the platform?</Text>

      <View style={styles.cardsContainer}>
        <TouchableOpacity onPress={() => handleSelectRole('CUSTOMER')} activeOpacity={0.8}>
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="shopping" size={40} color={theme.colors.primary} />
              </View>
              <Text variant="titleLarge" style={styles.cardTitle}>I want to buy</Text>
              <Text variant="bodyMedium" style={styles.cardDesc}>Discover nearby township businesses and products</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleSelectRole('VENDOR')} activeOpacity={0.8}>
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                <MaterialCommunityIcons name="storefront" size={40} color={theme.colors.secondary} />
              </View>
              <Text variant="titleLarge" style={styles.cardTitle}>I want to sell</Text>
              <Text variant="bodyMedium" style={styles.cardDesc}>Register your business and reach local customers</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  cardContent: {
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDesc: {
    textAlign: 'center',
    color: '#666',
  }
});
