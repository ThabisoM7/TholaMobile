import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import BottomNav from '../../components/BottomNav';

export default function MainLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="map" />
        <Stack.Screen name="kyc-intro" />
        <Stack.Screen name="vendor-registration" />
        <Stack.Screen name="vendor-dashboard" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="help-support" />
      </Stack>
      <BottomNav />
    </View>
  );
}
