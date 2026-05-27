import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Checkbox, Portal, Modal } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { TERMS_AND_CONDITIONS, POPIA_POLICY } from '../../constants/policies';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activePolicy, setActivePolicy] = useState<'T&C' | 'POPIA'>('T&C');
  
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

        <View style={styles.checkboxContainer}>
          <Checkbox.Android 
            status={acceptedTerms ? 'checked' : 'unchecked'} 
            onPress={() => setAcceptedTerms(!acceptedTerms)} 
            color={theme.colors.primary}
          />
          <Text variant="bodyMedium" style={styles.checkboxLabel}>
            I accept the{' '}
            <Text style={[styles.link, { color: theme.colors.primary }]} onPress={() => { setActivePolicy('T&C'); setModalVisible(true); }}>
              Terms & Conditions
            </Text>
            {' '}and{' '}
            <Text style={[styles.link, { color: theme.colors.primary }]} onPress={() => { setActivePolicy('POPIA'); setModalVisible(true); }}>
              POPIA Policy
            </Text>
          </Text>
        </View>

        <Button 
          mode="contained" 
          onPress={handleRegister} 
          loading={loading}
          disabled={loading || !acceptedTerms}
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          Register
        </Button>

        <Portal>
          <Modal 
            visible={modalVisible} 
            onDismiss={() => setModalVisible(false)} 
            contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>
              {activePolicy === 'T&C' ? 'Terms & Conditions' : 'POPIA Policy'}
            </Text>
            <ScrollView style={styles.modalScroll}>
              <Text variant="bodyMedium">
                {activePolicy === 'T&C' ? TERMS_AND_CONDITIONS : POPIA_POLICY}
              </Text>
            </ScrollView>
            <Button 
              mode="contained" 
              onPress={() => { setAcceptedTerms(true); setModalVisible(false); }}
              style={styles.modalCloseBtn}
            >
              Accept & Close
            </Button>
          </Modal>
        </Portal>
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
    marginTop: 8,
    borderRadius: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 24,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 20,
  },
  link: {
    fontWeight: 'bold',
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalCloseBtn: {
    borderRadius: 8,
  }
});
