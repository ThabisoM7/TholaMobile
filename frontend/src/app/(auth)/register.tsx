import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme, Divider, Checkbox, Portal, Modal } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../api/supabase';
import { isValidSAMobileNumber } from '../../utils/validation';
import { useAuthStore } from '../../store/authStore';
import { TERMS_AND_CONDITIONS, POPIA_POLICY } from '../../constants/policies';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const theme = useTheme();

  // State
  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'PHONE'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activePolicy, setActivePolicy] = useState<'T&C' | 'POPIA'>('T&C');

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Optional: pass data to the trigger if supported, otherwise trigger handles it
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setStep('OTP');
    }
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
      // User verified! Save the session token to Zustand so apiClient works
      const { login } = useAuthStore.getState();
      await login(data.session.user as any, data.session.access_token);
      
      // Now ask for phone number (especially if they are a VENDOR)
      setStep('PHONE');
    }
  };

  const handleSavePhone = async () => {
    if (!isValidSAMobileNumber(phone)) {
      setError('Please enter a valid SA mobile number (e.g. 072 123 4567)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session found");

      // Note: The SQL trigger has already created the row in `public."User"`.
      // We just need to update it with the phone and role.
      const { error: updateError } = await supabase
        .from('User')
        .update({ 
          phone_number: phone,
          role: role || 'CUSTOMER'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Proceed to the next step
      if (role === 'VENDOR') {
        router.replace('/(main)/vendor-registration');
      } else {
        router.replace('/(main)/map');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save phone number.');
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
        
        {step === 'EMAIL' && (
          <>
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
            {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}
            
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
              onPress={handleSendOTP} 
              loading={loading}
              disabled={loading || !acceptedTerms}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Send Verification Code
            </Button>
          </>
        )}

        {step === 'OTP' && (
          <>
            <Text style={{ marginBottom: 16 }}>We sent a 6-digit code to {email}</Text>
            <TextInput
              label="6-Digit OTP Code"
              value={otp}
              onChangeText={(text) => { setOtp(text); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              mode="outlined"
              style={styles.input}
              disabled={loading}
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
              Verify Email
            </Button>
            
            <Button 
              mode="text" 
              onPress={() => setStep('EMAIL')}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              Use a different email
            </Button>
          </>
        )}

        {step === 'PHONE' && (
          <>
            <Text style={{ marginBottom: 16 }}>Almost done! What's your mobile number?</Text>
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
              onPress={handleSavePhone} 
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              Complete Registration
            </Button>
          </>
        )}

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
  container: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginBottom: 32, opacity: 0.7 },
  input: { marginBottom: 8 },
  button: { marginTop: 16, borderRadius: 8 },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
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
