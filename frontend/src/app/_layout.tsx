import { useEffect } from 'react';
import { useColorScheme, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { lightTheme, darkTheme } from '../theme';
import talsec from 'freerasp-react-native';

const freeRaspConfig = {
  androidConfig: {
    packageName: 'com.thola.app',
    certificateHashes: ['oMCacpG4z8Tkfj55W4OjkrHomM28n8S38eK04ouUyXU='],
    supportedAlternativeStores: ['play.google.com'],
  },
  iosConfig: {
    appBundleId: 'com.thola.app',
    appTeamId: 'YOUR_APPLE_TEAM_ID',
  },
  watcherMail: 'thabisomashifana2@gmail.com',
  isProd: true,
};

export default function RootLayout() {
  const { checkAuth, isLoading, logout } = useAuthStore();
  const { themeMode } = useThemeStore();
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    checkAuth();

    // Setup freeRASP Security Callbacks (Moderate Response: Alert & Logout)
    const actions = {
      privilegedAccess: () => {
        Alert.alert('Security Alert', 'Rooted/Jailbroken device detected. Logging out to protect your data.', [{ text: 'OK', onPress: () => logout() }]);
      },
      debug: () => {
        Alert.alert('Security Alert', 'Debugger attached. Logging out.', [{ text: 'OK', onPress: () => logout() }]);
      },
      simulator: () => {
        console.log('Running on simulator (Warning only).');
      },
      appIntegrity: () => {
        Alert.alert('Security Alert', 'App tampering detected (Invalid Signature). Logging out.', [{ text: 'OK', onPress: () => logout() }]);
      },
      unofficialStore: () => {
        Alert.alert('Security Alert', 'App installed from an unofficial store. Logging out.', [{ text: 'OK', onPress: () => logout() }]);
      },
      hooks: () => {
        Alert.alert('Security Alert', 'Hooking framework detected (e.g. Frida/Magisk). Logging out.', [{ text: 'OK', onPress: () => logout() }]);
      },
      deviceBinding: () => {
        console.log('Device binding failed.');
      },
    };

    try {
      talsec.start(freeRaspConfig, actions);
    } catch (e) {
      console.warn('freeRASP failed to start:', e);
    }
  }, []);

  if (isLoading) {
    return null;
  }

  const isDarkMode = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
