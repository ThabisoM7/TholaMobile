import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, useTheme, Card, Avatar } from 'react-native-paper';
import { router } from 'expo-router';

export default function NotificationsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.title}>Notifications</Text>
      
      <View style={styles.emptyState}>
        <Avatar.Icon size={80} icon="bell-sleep" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={styles.emptyTitle}>You're all caught up!</Text>
        <Text variant="bodyMedium" style={styles.emptyDesc}>No new notifications at the moment.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptyDesc: {
    color: '#888',
    marginTop: 8,
  }
});
