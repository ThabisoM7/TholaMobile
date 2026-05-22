import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme, Divider } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { supabase } from '../../api/supabase';
import { useAuthStore } from '../../store/authStore';
import MFAChallenge from '../../components/Auth/MFAChallenge';

export default function LoginScreen() {
  const theme = useTheme();
  
  // State
  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'MFA'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuthStore(); // We'll still call this if the app expects Zustand to hold the user

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    
    const { error: authError } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);

    if (authError) setError(authError.message);
    else setStep('OTP');
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    setLoading(false);

    if (verifyError) {
      setError('Invalid code. Please try again.');
    } else if (data.session) {
      // Check if MFA is required
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (!mfaError && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        // User has MFA enrolled but hasn't verified it yet
        setStep('MFA');
      } else {
        // Logged in successfully
        handleSuccessfulLogin(data.session);
      }
    }
  };

  const handleSuccessfulLogin = async (session: any) => {
    // Optional: Fetch the user's role from the vendors table if needed
    // For now, we just pass the Supabase session token to Zustand
    await login(session.user, session.access_token);
    router.replace('/(main)/map');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text variant="displayMedium" style={styles.title}>THOLA</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Welcome back to your township marketplace</Text>
        
        {step === 'EMAIL' && (
          <>
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              mode="outlined"
            />
            {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}

            <Button 
              mode="contained" 
              onPress={handleSendOTP} 
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Send Login Code
            </Button>
            
            <View style={styles.footer}>
              <Text variant="bodyMedium">Don't have an account? </Text>
              <Link href="/(auth)/role-selection" asChild>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign up</Text>
              </Link>
            </View>
          </>
        )}

        {step === 'OTP' && (
          <>
            <Text style={{ marginBottom: 16 }}>We sent a 6-digit login code to {email}</Text>
            <TextInput
              label="6-Digit OTP Code"
              value={otp}
              onChangeText={(text) => { setOtp(text); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
              mode="outlined"
            />
            {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}

            <Button 
              mode="contained" 
              onPress={handleVerifyOTP} 
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Verify & Login
            </Button>

            <Button 
              mode="text" 
              onPress={() => setStep('EMAIL')}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              Back
            </Button>
          </>
        )}

        {step === 'MFA' && (
          <MFAChallenge 
            onVerified={async () => {
              const { data } = await supabase.auth.getSession();
              if (data.session) handleSuccessfulLogin(data.session);
            }} 
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: 8, color: '#1C1C1C' },
  subtitle: { textAlign: 'center', marginBottom: 32, color: '#666' },
  input: { marginBottom: 16, backgroundColor: '#fff' },
  button: { marginTop: 16, borderRadius: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 }
});
