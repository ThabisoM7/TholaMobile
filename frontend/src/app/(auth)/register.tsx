import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../api/supabase';
import { isValidSAMobileNumber } from '../../utils/validation';
import { useAuthStore } from '../../store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const theme = useTheme();

  // State
  const [step, setStep] = useState<'CREDENTIALS' | 'ROLE' | 'PROFILE'>('CREDENTIALS');
  
  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Role
  const [role, setRole] = useState<'CUSTOMER' | 'VENDOR' | null>(null);
  
  // Profile
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!email || !password) {
      setError('Please enter a valid email and password.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (data.session) {
      // User registered and logged in! Save the session token to Zustand so apiClient works
      const { login } = useAuthStore.getState();
      await login(data.session.user as any, data.session.access_token);
      
      // Move to role selection
      setStep('ROLE');
    } else {
      setError('Please disable "Confirm email" in Supabase Auth Settings to login immediately, or check your email for a link.');
    }
  };

  const handleRoleSelection = (selectedRole: 'CUSTOMER' | 'VENDOR') => {
    setRole(selectedRole);
    setStep('PROFILE');
  };

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!isValidSAMobileNumber(phone)) {
      setError('Please enter a valid SA mobile number (e.g. 072 123 4567)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session found");

      // Update the user in the database
      const { error: updateError } = await supabase
        .from('User')
        .update({ 
          full_name: fullName,
          phone_number: phone,
          role: role || 'CUSTOMER'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Fetch the updated user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('User')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!profileError && userProfile) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
           const fullUser = { ...sessionData.session.user, ...userProfile };
           const { login } = useAuthStore.getState();
           await login(fullUser, sessionData.session.access_token);
        }
      }

      // Proceed to the next step
      if (role === 'VENDOR') {
        router.replace('/(main)/vendor-registration');
      } else {
        router.replace('/(main)/map');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
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
        
        {step === 'CREDENTIALS' && (
          <>
            <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>Start discovering local goods</Text>

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />
            {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
            
            <Button 
              mode="contained" 
              onPress={handleSignup} 
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Sign Up
            </Button>
          </>
        )}

        {step === 'ROLE' && (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text variant="headlineMedium" style={[styles.title, { textAlign: 'center' }]}>Join THOLA</Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { textAlign: 'center' }]}>How would you like to use the platform?</Text>

            <View style={styles.cardsContainer}>
              <TouchableOpacity onPress={() => handleRoleSelection('CUSTOMER')} activeOpacity={0.8}>
                <Card style={styles.card} mode="elevated">
                  <Card.Content style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                      <MaterialCommunityIcons name="shopping" size={40} color={theme.colors.primary} />
                    </View>
                    <Text variant="titleLarge" style={styles.cardTitle}>I want to buy</Text>
                    <Text variant="bodyMedium" style={styles.cardDesc}>Discover nearby township businesses and products</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleRoleSelection('VENDOR')} activeOpacity={0.8}>
                <Card style={styles.card} mode="elevated">
                  <Card.Content style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                      <MaterialCommunityIcons name="storefront" size={40} color={theme.colors.secondary} />
                    </View>
                    <Text variant="titleLarge" style={styles.cardTitle}>I want to sell</Text>
                    <Text variant="bodyMedium" style={styles.cardDesc}>Register your business and reach local customers</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'PROFILE' && (
          <>
            <Text variant="headlineMedium" style={styles.title}>Almost done!</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>Tell us a bit about yourself</Text>

            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setError(''); }}
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />
            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={(text) => { setPhone(text); setError(''); }}
              keyboardType="phone-pad"
              mode="outlined"
              placeholder="082 123 4567"
              style={styles.input}
              disabled={loading}
            />
            {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
            
            <Button 
              mode="contained" 
              onPress={handleCompleteProfile} 
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Complete Registration
            </Button>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginBottom: 32, opacity: 0.7 },
  input: { marginBottom: 12 },
  button: { marginTop: 16, borderRadius: 8 },
  cardsContainer: { gap: 20 },
  card: { borderRadius: 16, backgroundColor: '#fff' },
  cardContent: { alignItems: 'center', padding: 24 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontWeight: 'bold', marginBottom: 8 },
  cardDesc: { textAlign: 'center', color: '#666' }
});
