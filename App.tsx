import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TriageScreen from './src/screens/TriageScreen';
import { registerServiceWorker } from './src/pwa';

export default function App() {
  useEffect(registerServiceWorker, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <TriageScreen />
    </SafeAreaProvider>
  );
}
