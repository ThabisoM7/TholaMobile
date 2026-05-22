import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { supabase } from '../../api/supabase';

interface Props {
  onVerified: () => void;
}

export default function MFAChallenge({ onVerified }: Props) {
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Find the user's enrolled TOTP factor
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) return setError(error.message);
      const totpFactor = data?.totp?.[0];
      if (totpFactor) setFactorId(totpFactor.id);
    });
  }, []);

  const handleVerifyMFA = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    // 1. Create a challenge for the factor
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    // 2. Verify the 6-digit code from their Authenticator App
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    setLoading(false);
    if (verifyError) {
      setError('Invalid Authenticator Code.');
    } else {
      console.log('MFA Verified! Session upgraded to AAL2');
      onVerified();
    }
  };

  return (
    <View style={{ padding: 24 }}>
      <Text variant="headlineSmall">Two-Factor Authentication</Text>
      <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
        Enter the 6-digit code from your authenticator app.
      </Text>
      
      <TextInput
        label="6-Digit Code"
        value={code}
        onChangeText={(val) => { setCode(val); setError(''); }}
        keyboardType="number-pad"
        maxLength={6}
        mode="outlined"
      />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      
      <Button 
        mode="contained" 
        onPress={handleVerifyMFA} 
        loading={loading} 
        disabled={!factorId || loading}
        style={{ marginTop: 16, paddingVertical: 6 }}
      >
        Verify MFA
      </Button>
    </View>
  );
}
