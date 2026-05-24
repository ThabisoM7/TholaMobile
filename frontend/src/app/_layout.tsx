import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { lightTheme, darkTheme } from '../theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const { checkAuth, isLoading } = useAuthStore();
  const { themeMode } = useThemeStore();
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return null;
  }

  const isDarkMode = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
