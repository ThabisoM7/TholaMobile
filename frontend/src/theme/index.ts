import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// High-end Grayscale + Thola Yellow Palette
const sharedColors = {
  primary: '#FEDD00', // Signature Yellow
  error: '#FF5252',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...sharedColors,
    // Overriding all purple-ish defaults
    secondary: '#000000',
    secondaryContainer: '#F0F0F0',
    tertiary: '#424242',
    tertiaryContainer: '#EEEEEE',
    surfaceVariant: '#F5F5F5',
    onSurfaceVariant: '#616161',
    outline: '#E0E0E0',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    onPrimary: '#000000',
  },
  roundness: 12,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...sharedColors,
    // Overriding all purple-ish defaults
    secondary: '#FFFFFF',
    secondaryContainer: '#333333',
    tertiary: '#BDBDBD',
    tertiaryContainer: '#424242',
    surfaceVariant: '#2C2C2C',
    onSurfaceVariant: '#BDBDBD',
    outline: '#424242',
    background: '#121212',
    surface: '#1E1E1E',
    onPrimary: '#000000',
  },
  roundness: 12,
};
