import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { info } from '../utils/logger';

export const unstable_settings = {
  anchor: '/',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const version = Constants.expoConfig?.version ?? 'unknown';
    info(`[App] Tracky starting — v${version}, ${Platform.OS} ${Platform.Version}`);
    // Just wait a tick to ensure GestureHandlerRootView is mounted
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
