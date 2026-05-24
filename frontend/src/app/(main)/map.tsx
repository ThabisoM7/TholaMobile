import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useTheme, Searchbar, FAB, Text, Card, Avatar, Chip, Button, ActivityIndicator, Portal } from 'react-native-paper';
import * as Location from 'expo-location';
import apiClient from '../../api/client';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { router, useFocusEffect } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_PK;
if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

const CATEGORIES = ['All', 'Food & Beverage', 'Clothing & Merch', 'Service Providers', 'Electronics'];

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [routeDirections, setRouteDirections] = useState<any>(null);
  const theme = useTheme();
  const { user } = useAuthStore();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (selectedVendor) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedVendor]);

  const handleRecenter = () => {
    if (location) {
      setSelectedVendor(null);
      cameraRef.current?.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
        animationMode: 'flyTo'
      });
    }
  };

  // Get current user location once on mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        setHasLocationPermission(status === 'granted');
        setPermissionChecked(true);

        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        }
      } catch (e) {
        setPermissionChecked(true);
      }
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

  // Fetch routing when a vendor is selected
  useEffect(() => {
    if (selectedVendor && location) {
      const fetchRoute = async () => {
        try {
          const startCoords = `${location.coords.longitude},${location.coords.latitude}`;
          const endCoords = `${selectedVendor.longitude},${selectedVendor.latitude}`;
          const token = process.env.EXPO_PUBLIC_MAPBOX_PK;

          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords};${endCoords}?geometries=geojson&access_token=${token}`
          );
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            setRouteDirections(data.routes[0].geometry);
          }
        } catch (error) {
          console.error('Failed to fetch route:', error);
        }
      };
      fetchRoute();
    } else {
      setRouteDirections(null);
    }
  }, [selectedVendor, location]);

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

  if (!permissionChecked) {
    return (
      <View style={[styles.page, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

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

      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/tatts-io/cmpexgmoc002001sj7ztf2do6"
        onPress={() => setSelectedVendor(null)}
      >
        {location && (
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={selectedVendor ? 16 : 14}
            pitch={60}
            centerCoordinate={
              selectedVendor
                ? [selectedVendor.longitude, selectedVendor.latitude]
                : [location.coords.longitude, location.coords.latitude]
            }
            animationMode="flyTo"
            animationDuration={1500}
          />
        )}
        {routeDirections && (
          <Mapbox.ShapeSource id="routeSource" shape={routeDirections}>
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: theme.colors.primary,
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {hasLocationPermission && (
          <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />
        )}
        {filteredVendors.map((vendor) => (
          <Mapbox.PointAnnotation
            key={vendor.id}
            id={String(vendor.id)}
            coordinate={[vendor.longitude, vendor.latitude]}
            onSelected={() => setSelectedVendor(vendor)}
          >
            <View style={styles.pinWrapper}>
              <View style={[styles.markerContainer, { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons
                  name={vendor.category === 'Food & Beverage' ? "food" :
                    vendor.category === 'Electronics' ? "laptop" :
                      vendor.category === 'Clothing & Merch' ? "tshirt-crew" : "store"}
                  size={24}
                  color="black"
                />
              </View>
              <View style={[styles.pinTriangle, { borderTopColor: theme.colors.primary }]} />
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      <Portal>
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['15%', '50%', '85%']}
          enablePanDownToClose={true}
          onClose={() => setSelectedVendor(null)}
          backgroundStyle={{ backgroundColor: theme.colors.surface }}
          handleIndicatorStyle={{ backgroundColor: theme.colors.onSurfaceVariant }}
        >
          <BottomSheetView style={{ flex: 1 }}>
            {selectedVendor && (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {selectedVendor.banner_url ? (
                  <Image
                    source={{ uri: selectedVendor.banner_url }}
                    style={{ height: 120, width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    {selectedVendor.logo_url ? (
                      <Avatar.Image size={48} source={{ uri: selectedVendor.logo_url }} style={{ backgroundColor: theme.colors.surfaceVariant }} />
                    ) : (
                      <Avatar.Icon size={48} icon="store" style={{ backgroundColor: theme.colors.primary }} color="black" />
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        {selectedVendor.business_name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {selectedVendor.category}
                      </Text>
                    </View>
                    {user?.role === 'CUSTOMER' && (
                      <FAB
                        icon={favoriteIds.has(selectedVendor.id) ? "heart" : "heart-outline"}
                        color={favoriteIds.has(selectedVendor.id) ? theme.colors.error : theme.colors.onSurfaceVariant}
                        style={{ backgroundColor: 'transparent', elevation: 0 }}
                        onPress={() => toggleFavorite(selectedVendor.id)}
                      />
                    )}
                  </View>

                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }} numberOfLines={3}>
                    {selectedVendor.business_description}
                  </Text>

                  {selectedVendor.products && selectedVendor.products.length > 0 && (
                    <View style={{ backgroundColor: theme.dark ? '#333' : '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                      <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 4 }}>LATEST PRODUCT</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{selectedVendor.products[0].name} - R {selectedVendor.products[0].price}</Text>
                    </View>
                  )}

                  <Button
                    mode="contained"
                    onPress={() => router.push(`/(main)/vendor/${selectedVendor.id}`)}
                    style={{ borderRadius: 8 }}
                    contentStyle={{ height: 44 }}
                    labelStyle={{ fontWeight: 'bold' }}
                  >
                    View Business
                  </Button>
                </View>
              </ScrollView>
            )}
          </BottomSheetView>
        </BottomSheet>
      </Portal>

      <FAB
        icon="crosshairs-gps"
        style={styles.recenterFab}
        onPress={handleRecenter}
      />
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
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  pinTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 0,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  recenterFab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    borderRadius: 30,
    elevation: 4,
  }
});
