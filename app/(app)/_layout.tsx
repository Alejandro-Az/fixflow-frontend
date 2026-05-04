import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../src/store/useAuthStore";

export default function AppLayout() {
  const { token, isHydrated } = useAuthStore();

  // Esperar hidratación para evitar redirecciones prematuras.
  if (!isHydrated) {
    return null;
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#141313" },
      }}
    />
  );
}
