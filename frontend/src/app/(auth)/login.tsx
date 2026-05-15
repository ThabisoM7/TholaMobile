import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const theme = useTheme();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.post('/auth/login', { email, password });
      await login(response.data, response.data.token);
      router.replace('/(main)/map');
    } catch (err: any) {
      console.log('Login Error Details:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text variant="displayMedium" style={styles.title}>THOLA</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Welcome back to your township marketplace</Text>
        
        {error ? <Text style={{ color: theme.colors.error, marginBottom: 10 }}>{error}</Text> : null}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.outline}
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.outline}
        />

        <Button 
          mode="contained" 
          onPress={handleLogin} 
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          Login
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Don't have an account? </Text>
          <Link href="/(auth)/role-selection" asChild>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1C1C1C',
  },
  subtitle: {
    textAlign: 'center',
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
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  }
});
