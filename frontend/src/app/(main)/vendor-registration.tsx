import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme, ActivityIndicator, Modal, Portal, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import apiClient from '../../api/client';
import { mapStyle } from '../../utils/mapStyle';

export default function VendorRegistrationScreen() {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [category, setCategory] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [township, setTownship] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number, longitude: number }>({
    latitude: -26.2041, // Default to Johannesburg
    longitude: 28.0473
  });
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5&bbox=16.45,-34.83,32.89,-22.12`
        );
        const data = await response.json();
        if (data && Array.isArray(data.features)) {
          setSuggestions(data.features);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 400);

    setSearchTimeout(timeout);
  };

  const handleSelectSuggestion = (item: any) => {
    const coords = item.geometry.coordinates; // [lon, lat]
    const lon = coords[0];
    const lat = coords[1];
    
    // Set location coordinates
    setLocation({ latitude: lat, longitude: lon });
    
    const prop = item.properties || {};
    
    // Extract Township / Suburb (Photon returns city, locality, district, name)
    const townshipOrSuburb = prop.locality || prop.district || prop.city || prop.name || '';
    setTownship(townshipOrSuburb);
    
    // Construct full display name
    const parts = [];
    if (prop.name) parts.push(prop.name);
    if (prop.street) parts.push(prop.street);
    if (prop.locality || prop.district) parts.push(prop.locality || prop.district);
    if (prop.city) parts.push(prop.city);
    if (prop.country) parts.push(prop.country);
    const displayName = parts.join(', ');
    
    // Set full address field
    setAddress(displayName);
    
    // Clear suggestions and update search input
    setSuggestions([]);
    setSearchQuery(displayName);
  };

  const theme = useTheme();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          let loc = await Location.getCurrentPositionAsync({});
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
        } catch (err) {
          console.warn('Failed to get live location, using default');
        }
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const result = await Location.geocodeAsync(searchQuery);
      if (result.length > 0) {
        setLocation({
          latitude: result[0].latitude,
          longitude: result[0].longitude
        });
      } else {
        setError('Location not found. Try a different township or street name.');
      }
    } catch (err) {
      console.error(err);
      setError('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!businessName || !businessDescription || !category || !phoneNumber || !township || !address) {
      setError('Please fill out all fields');
      return;
    }

    if (!location) {
      setError('Waiting for location data... Please ensure location is enabled.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/vendors/register-business', {
        business_name: businessName,
        business_description: businessDescription,
        category: category,
        phone_number: phoneNumber,
        township: township,
        address: address,
        latitude: location.latitude,
        longitude: location.longitude,
        logo_url: null
      });

      // Navigate to KYC step after successful registration
      router.replace('/(main)/kyc-intro');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to register business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineMedium" style={styles.title}>Business Profile</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Tell us about your business so customers can find you.
        </Text>
        
        {error ? <Text style={{ color: theme.colors.error, marginBottom: 10 }}>{error}</Text> : null}

        <TextInput
          label="Business Name"
          value={businessName}
          onChangeText={setBusinessName}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Business Description"
          value={businessDescription}
          onChangeText={setBusinessDescription}
          multiline
          numberOfLines={3}
          style={styles.input}
          mode="outlined"
        />

        <Text variant="titleMedium" style={styles.label}>Business Category</Text>
        <View style={styles.categoryGrid}>
          {['FOOD & BEVERAGE', 'CLOTHING AND MERCH', 'SERVICE PROVIDERS', 'ELECTRONICS'].map((cat) => (
            <Button 
              key={cat}
              mode={category === cat ? 'contained' : 'outlined'}
              onPress={() => setCategory(cat)}
              style={styles.categoryBtn}
              labelStyle={{ fontSize: 10 }}
            >
              {cat}
            </Button>
          ))}
        </View>

        <TextInput
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Township"
          value={township}
          onChangeText={setTownship}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Detailed Address"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          mode="outlined"
        />

        <View style={styles.locationSection}>
          <Text variant="titleMedium" style={styles.label}>Business Location</Text>
          <View style={styles.locationPreview}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Coordinates Set:</Text>
              <Text variant="bodySmall" style={{ color: '#666' }}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
            <Button 
              mode="outlined" 
              onPress={() => setShowMap(true)}
              icon="map-marker-radius"
            >
              Change Location
            </Button>
          </View>
        </View>

        <Portal>
          <Modal 
            visible={showMap} 
            onDismiss={() => setShowMap(false)} 
            contentContainerStyle={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Pin Your Business</Text>
              <IconButton icon="close" onPress={() => setShowMap(false)} />
            </View>
            
            <View style={styles.searchBox}>
              <TextInput
                placeholder="Search township or street..."
                value={searchQuery}
                onChangeText={handleQueryChange}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                onSubmitEditing={handleSearch}
                right={<TextInput.Icon icon="magnify" onPress={handleSearch} />}
              />
            </View>

            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  {suggestions.map((item, idx) => {
                    const prop = item.properties || {};
                    const parts = [];
                    if (prop.name) parts.push(prop.name);
                    if (prop.street) parts.push(prop.street);
                    if (prop.locality || prop.district) parts.push(prop.locality || prop.district);
                    if (prop.city) parts.push(prop.city);
                    if (prop.country) parts.push(prop.country);
                    const displayName = parts.join(', ');

                    return (
                      <TouchableOpacity
                        key={idx + '-' + (prop.osm_id || Math.random())}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(item)}
                      >
                        <Text style={styles.suggestionText} numberOfLines={2}>
                          {displayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <MapView
              style={styles.map}
              customMapStyle={mapStyle}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(e) => setLocation(e.nativeEvent.coordinate)}
            >
              <Marker 
                coordinate={location} 
                draggable 
                onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)}
                pinColor={theme.colors.primary}
              />
            </MapView>

            <View style={styles.modalFooter}>
              <Text variant="bodySmall" style={styles.hintText}>
                Tip: Drag the pin or tap anywhere on the map to set your exact spot.
              </Text>
              <Button 
                mode="contained" 
                onPress={() => setShowMap(false)}
                style={styles.confirmBtn}
              >
                Confirm Location
              </Button>
            </View>
          </Modal>
        </Portal>

        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          loading={loading}
          disabled={loading || !location}
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          {loading ? 'Saving...' : 'Continue to Verification'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 40,
  },
  subtitle: {
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  label: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBtn: {
    flexBasis: '48%',
    borderRadius: 8,
  },
  button: {
    marginTop: 24,
    marginBottom: 40,
    borderRadius: 8,
  },
  locationSection: {
    marginBottom: 20,
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 0,
    margin: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    elevation: 10,
  },
  hintText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 115,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 9999,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  }
});
