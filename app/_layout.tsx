import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View, ActivityIndicator, Platform } from 'react-native';

import '../global.css';

import { useAuthStore } from '../src/store/useAuthStore';

// Establece modo oscuro por clase (no por media query) para evitar
// el warning "Cannot manually set color scheme" en React Native Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
}

export const unstable_settings = {
  anchor: '(app)',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  
  const { token, isHydrated, hydrate } = useAuthStore();

  // Inicializar estado del storage al cargar la app
  useEffect(() => {
    hydrate();
  }, []);

  // Lógica de Route Guarding
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (
      // Si el usuario no tiene token y NO está en el grupo (auth), redirigir a login
      !token && !inAuthGroup
    ) {
      router.replace('/(auth)/login');
    } else if (
      // Si el usuario sí tiene token y está en el grupo (auth) (ej. logueado intentando entrar al login), redirigir al Dashboard
      token && inAuthGroup
    ) {
      router.replace('/(app)');
    }
  }, [token, isHydrated, segments]);

  if (!isHydrated) {
    // Mientras lee del disco (SecureStore) mostramos pantalla de carga
    return (
      <View style={{ flex: 1, backgroundColor: '#141313', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6699cc" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#141313' } }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
