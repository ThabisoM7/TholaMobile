import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme, Searchbar, FAB, Text, Card, Avatar, Chip } from 'react-native-paper';
import * as Location from 'expo-location';
import apiClient from '../../api/client';
import { lightMapStyle, darkMapStyle } from '../../utils/mapStyle';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { router, useFocusEffect } from 'expo-router';

const CATEGORIES = ['All', 'Food & Beverage', 'Clothing & Merch', 'Service Providers', 'Electronics'];

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const { user } = useAuthStore();
  const currentMapStyle = theme.dark ? darkMapStyle : lightMapStyle;

  // Get current user location once on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  // Fetch vendors and favorites dynamically on screen focus
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const response = await apiClient.get('/vendors');
          setVendors(response.data);
        } catch (error) {
          console.error('Failed to fetch vendors:', error);
        }

        if (user?.role === 'CUSTOMER') {
          try {
            const favResponse = await apiClient.get('/favorites');
            const ids = new Set(favResponse.data.map((fav: any) => fav.vendor_id));
            setFavoriteIds(ids as Set<string>);
          } catch (error) {
            console.error('Failed to fetch favorites:', error);
          }
        }
      };

      fetchData();
    }, [user])
  );

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || vendor.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = async (vendorId: string) => {
    try {
      if (favoriteIds.has(vendorId)) {
        await apiClient.delete(`/favorites/${vendorId}`);
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(vendorId);
          return newSet;
        });
      } else {
        await apiClient.post('/favorites', { vendor_id: vendorId });
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.add(vendorId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Search for food, clothing, services..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          iconColor={theme.colors.primary}
          elevation={2}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((cat) => (
            <Chip 
              key={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.chip,
                { backgroundColor: selectedCategory === cat ? theme.colors.primary : theme.colors.surface }
              ]}
              textStyle={{ 
                color: selectedCategory === cat ? 'black' : theme.colors.onSurface,
                fontSize: 12,
                fontWeight: 'bold'
              }}
              showSelectedOverlay
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={currentMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={true}
        region={location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : undefined}
      >
        {filteredVendors.map((vendor) => (
          <Marker
            key={vendor.id}
            coordinate={{ latitude: vendor.latitude, longitude: vendor.longitude }}
            onPress={() => setSelectedVendor(vendor)}
          >
            <View style={[styles.markerContainer, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons 
                name={vendor.category === 'Food & Beverage' ? "food" : 
                      vendor.category === 'Electronics' ? "laptop" :
                      vendor.category === 'Clothing & Merch' ? "tshirt-crew" : "store"} 
                size={20} 
                color="black" 
              />
            </View>
          </Marker>
        ))}
      </MapView>


      {selectedVendor && (
        <Card 
          style={[styles.vendorCard, { backgroundColor: theme.colors.surface }]} 
          mode="elevated" 
          onPress={() => router.push(`/(main)/vendor/${selectedVendor.id}`)}
        >
          <Card.Title
            title={selectedVendor.business_name}
            subtitle={selectedVendor.category}
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => <Avatar.Icon {...props} icon="store" style={{ backgroundColor: theme.colors.primary }} color="black" />}
            right={(props) => user?.role === 'CUSTOMER' ? (
              <FAB
                {...props}
                icon={favoriteIds.has(selectedVendor.id) ? "heart" : "heart-outline"}
                color={favoriteIds.has(selectedVendor.id) ? theme.colors.error : theme.colors.onSurfaceVariant}
                style={{ backgroundColor: 'transparent', elevation: 0 }}
                onPress={() => toggleFavorite(selectedVendor.id)}
              />
            ) : null}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurface }}>{selectedVendor.business_description}</Text>
            {selectedVendor.products && selectedVendor.products.length > 0 && (
              <View style={[styles.latestProduct, { borderTopColor: theme.colors.outlineVariant, paddingTop: 8, marginTop: 8, borderTopWidth: 1 }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>LATEST PRODUCT</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{selectedVendor.products[0].name} - R {selectedVendor.products[0].price}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  map: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  categoryScroll: {
    marginTop: 10,
  },
  categoryContainer: {
    paddingRight: 20,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    height: 32,
  },
  searchBar: {
    borderRadius: 12,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  vendorCard: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    borderRadius: 16,
  }
});
