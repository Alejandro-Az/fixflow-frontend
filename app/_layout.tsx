import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import {
    configureReanimatedLogger,
    ReanimatedLogLevel,
} from "react-native-reanimated";

import "../global.css";

import { useAuthStore } from "../src/store/useAuthStore";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Establece modo oscuro por clase para la web
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

export const unstable_settings = {
  anchor: "(app)",
};

export default function RootLayout() {
  const { isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#141313",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6699cc" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#141313" },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
