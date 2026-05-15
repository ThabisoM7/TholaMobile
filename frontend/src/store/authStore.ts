import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'CUSTOMER' | 'VENDOR';
  profile_picture?: string;
  age?: number;
  location?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (userData, token) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(userData));
    set({ user: userData, token, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    set({ user: null, token: null, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const userDataStr = await SecureStore.getItemAsync('userData');
      
      if (token && userDataStr) {
        set({ user: JSON.parse(userDataStr), token, isLoading: false });
      } else {
        set({ user: null, token: null, isLoading: false });
      }
    } catch (e) {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
