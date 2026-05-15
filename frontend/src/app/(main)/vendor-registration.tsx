import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import apiClient from '../../api/client';

export default function VendorRegistrationScreen() {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [category, setCategory] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [township, setTownship] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [error, setError] = useState('');
  
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied. Please enable it in settings.');
        return;
      }

      try {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
      } catch (err) {
        console.warn('Failed to get location:', err);
      }
    })();
  }, []);

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

        {!location && !error && (
          <View style={styles.locationContainer}>
            <ActivityIndicator size="small" />
            <Text style={styles.locationText}>Getting your location...</Text>
          </View>
        )}

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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    color: '#005b9f',
  }
});
