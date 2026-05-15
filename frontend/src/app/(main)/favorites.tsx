import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, useTheme, Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import apiClient from '../../api/client';

export default function FavoritesScreen() {
  const theme = useTheme();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const response = await apiClient.get('/favorites');
      // Format the data so it matches what we expect in the render
      const formatted = response.data.map((fav: any) => fav.vendor);
      setFavorites(formatted);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const removeFavorite = async (vendorId: string) => {
    try {
      await apiClient.delete(`/favorites/${vendorId}`);
      setFavorites(prev => prev.filter(v => v.id !== vendorId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.title}>My Favorites</Text>
      
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.emptyText}>You haven't added any favorites yet.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="elevated">
            <Card.Title
              title={item.business_name}
              subtitle={item.category}
              left={(props) => <Avatar.Icon {...props} icon="store" style={{ backgroundColor: theme.colors.primary }} />}
              right={(props) => <IconButton {...props} icon="heart" iconColor={theme.colors.error} onPress={() => removeFavorite(item.id)} />}
            />
            <Card.Content>
              <Text variant="bodyMedium">{item.business_description}</Text>
            </Card.Content>
          </Card>
        )}
      />
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
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  }
});
