import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#141313' } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
