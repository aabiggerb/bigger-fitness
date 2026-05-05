import { Stack } from 'expo-router';
import { AppDataProvider } from '../src/context/AppDataContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppDataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AppDataProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
