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
  const [step, setStep] = useState<'CREDENTIALS' | 'MFA'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuthStore(); // We'll still call this if the app expects Zustand to hold the user

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    setLoading(false);

    if (authError) {
      setError(authError.message);
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
    // Fetch the user's full profile from the database
    const { data: userProfile, error } = await supabase
      .from('User')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!error && userProfile) {
      // Merge session user with db user profile
      const fullUser = {
        ...session.user,
        ...userProfile,
      };
      await login(fullUser, session.access_token);
      
      // If the user hasn't selected a role, direct them to complete registration
      if (!fullUser.role) {
        router.replace('/(auth)/register');
        return;
      }

      if (fullUser.role === 'VENDOR') {
        router.replace('/(main)/vendor-dashboard');
      } else {
        router.replace('/(main)/map');
      }
    } else {
      // Fallback if profile doesn't exist yet (e.g. trigger failed or new user)
      await login(session.user, session.access_token);
      router.replace('/(auth)/register');
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
        
        {step === 'CREDENTIALS' && (
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
            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              secureTextEntry
              style={styles.input}
              mode="outlined"
            />
            {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}

            <Button 
              mode="contained" 
              onPress={handleLogin} 
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Log In
            </Button>
            
            <View style={styles.footer}>
              <Text variant="bodyMedium">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign up</Text>
              </Link>
            </View>
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
