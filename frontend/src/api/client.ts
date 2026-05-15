import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use environment variable if provided, otherwise default to localhost. 
// For Android Emulator, use 10.0.2.2. For Physical Device, use your computer's local IP (e.g. 192.168.1.x)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.179:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
