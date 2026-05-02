import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../src/store/useAuthStore";

export default function AuthLayout() {
  const { token, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return null;
  }

  if (token) {
    return <Redirect href="/(app)" />;
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
