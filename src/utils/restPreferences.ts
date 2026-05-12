import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@secret_default_rest_seconds';
export const DEFAULT_REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];
export const FALLBACK_REST_SECONDS = 90;

export async function loadDefaultRestSeconds(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) return FALLBACK_REST_SECONDS;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : FALLBACK_REST_SECONDS;
  } catch {
    return FALLBACK_REST_SECONDS;
  }
}

export async function saveDefaultRestSeconds(seconds: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(seconds));
  } catch {
    // ignore
  }
}

export function formatRestSeconds(s: number): string {
  if (s < 60) return `${s} seg`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m} min` : `${m} min ${sec}s`;
}
