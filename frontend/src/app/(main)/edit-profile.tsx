import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme, Avatar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function EditProfileScreen() {
  const { user, login } = useAuthStore();
  const theme = useTheme();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || '');
  const [age, setAge] = useState(user?.age ? user.age.toString() : '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Full name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.put('/auth/me', {
        full_name: fullName,
        profile_picture: profilePicture,
        age: age ? parseInt(age) : undefined,
        location: location,
        bio: bio,
      });

      // Update global user state properly
      const { token, login } = useAuthStore.getState();
      if (token) {
        await login(response.data, token);
      }

      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Edit Profile</Text>
        
        {error ? <Text style={{ color: theme.colors.error, marginBottom: 10 }}>{error}</Text> : null}

        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={pickImage}>
            {profilePicture ? (
              <Avatar.Image size={100} source={{ uri: profilePicture }} />
            ) : (
              <Avatar.Text size={100} label={user?.full_name?.substring(0, 2).toUpperCase() || 'U'} />
            )}
            <View style={styles.editIconContainer}>
              <Text style={styles.editIconText}>Edit</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Email (Cannot be changed)"
          value={user?.email || ''}
          disabled
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Location (Township / Area)"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          style={[styles.input, { height: 100 }]}
          mode="outlined"
        />

        <Button 
          mode="contained" 
          onPress={handleSave} 
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          Save Changes
        </Button>
        <Button 
          mode="text" 
          onPress={() => router.back()} 
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  cancelButton: {
    marginTop: 8,
  }
});
