import React from 'react';
import { StyleSheet, View, ImageBackground, Image, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter, Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { user } = useAuthStore();
  const theme = useTheme();
  const router = useRouter();

  // If user is already logged in, redirect to the main app
  if (user) {
    return <Redirect href="/(main)/map" />;
  }

  return (
    <View style={styles.container}>
      {/* Background Image with Dark Overlay */}
      <ImageBackground 
        source={require('../../assets/landing-bg.jpg')} 
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text variant="headlineMedium" style={styles.tagline}>
              Connecting Township Commerce
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={() => router.push('/(auth)/register')}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Get Started
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={() => router.push('/(auth)/login')}
              style={[styles.button, styles.outlineButton]}
              contentStyle={styles.buttonContent}
              labelStyle={[styles.buttonLabel, { color: theme.colors.primary }]}
            >
              Login
            </Button>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Empowering local vendors, serving communities.
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Dark overlay for text readability
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: width * 0.7,
    height: 120,
    marginBottom: 20,
  },
  tagline: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    borderRadius: 12,
  },
  outlineButton: {
    borderColor: '#FEDD00', // Brand yellow
    borderWidth: 2,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
});


