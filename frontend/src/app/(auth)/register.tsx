import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuthStore();
  const theme = useTheme();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.post('/auth/register', { 
        full_name: fullName, 
        email, 
        password,
        role: role || 'CUSTOMER'
      });
      await login(response.data, response.data.token);
      
      if (role === 'VENDOR') {
        // Redirect to Vendor onboarding
        router.replace('/(main)/vendor-registration');
      } else {
        router.replace('/(main)/map');
      }
    } catch (err: any) {
      console.log('Registration Error Details:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed. Please check your connection and try again.');
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
        <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {role === 'VENDOR' ? 'Register your business profile' : 'Start discovering local goods'}
        </Text>
        
        {error ? <Text style={{ color: theme.colors.error, marginBottom: 10 }}>{error}</Text> : null}

        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        <Button 
          mode="contained" 
          onPress={handleRegister} 
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          Register
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
  },
  subtitle: {
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  }
});
