import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@secret_alarm_sound';

// ─── Alarm Sound Types ────
export type AlarmSoundType = 'beep' | 'triple' | 'ascending' | 'bell' | 'buzzer' | 'none';

export interface AlarmSoundOption {
  id: AlarmSoundType;
  label: string;
  icon: string;
  description: string;
}

export const ALARM_SOUNDS: AlarmSoundOption[] = [
  { id: 'beep',      label: 'Beep Clásico',    icon: '🔔', description: 'Tono agudo continuo (880 Hz)' },
  { id: 'triple',    label: 'Triple Beep',      icon: '🔊', description: 'Tres pitidos rápidos repetidos' },
  { id: 'ascending', label: 'Ascendente',       icon: '📈', description: 'Tono que sube progresivamente' },
  { id: 'bell',      label: 'Campana',          icon: '🛎️', description: 'Sonido de campana suave' },
  { id: 'buzzer',    label: 'Zumbido Intenso',  icon: '⚡', description: 'Zumbido fuerte y urgente' },
  { id: 'none',      label: 'Sin Sonido',       icon: '🔇', description: 'Solo vibración, sin alarma sonora' },
];

let alarmSound: Audio.Sound | null = null;
let isLooping = false;
let currentAlarmType: AlarmSoundType = 'beep';

// ─── Persistence ────
export async function loadAlarmSoundPreference(): Promise<AlarmSoundType> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && ALARM_SOUNDS.some(a => a.id === stored)) {
      currentAlarmType = stored as AlarmSoundType;
      return currentAlarmType;
    }
  } catch { /* fallback */ }
  return 'beep';
}

export async function saveAlarmSoundPreference(type: AlarmSoundType): Promise<void> {
  currentAlarmType = type;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, type);
  } catch { /* ignore */ }
}

export function getCurrentAlarmType(): AlarmSoundType {
  return currentAlarmType;
}

// ─── WAV Generation ────
const SAMPLE_RATE = 22050;

function buildWavBytes(numSamples: number, generator: (i: number, total: number) => number): Uint8Array {
  const dataSize = numSamples;
  const fileSize = 44 + dataSize - 8;
  const buffer = new Uint8Array(44 + dataSize);

  // RIFF header
  buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46;
  buffer[4] = fileSize & 0xff; buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff; buffer[7] = (fileSize >> 24) & 0xff;
  buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45;

  // fmt chunk
  buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20;
  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
  buffer[20] = 1; buffer[21] = 0; // PCM
  buffer[22] = 1; buffer[23] = 0; // mono
  buffer[24] = SAMPLE_RATE & 0xff; buffer[25] = (SAMPLE_RATE >> 8) & 0xff;
  buffer[26] = (SAMPLE_RATE >> 16) & 0xff; buffer[27] = (SAMPLE_RATE >> 24) & 0xff;
  buffer[28] = SAMPLE_RATE & 0xff; buffer[29] = (SAMPLE_RATE >> 8) & 0xff;
  buffer[30] = (SAMPLE_RATE >> 16) & 0xff; buffer[31] = (SAMPLE_RATE >> 24) & 0xff;
  buffer[32] = 1; buffer[33] = 0; // block align
  buffer[34] = 8; buffer[35] = 0; // 8-bit

  // data chunk
  buffer[36] = 0x64; buffer[37] = 0x61; buffer[38] = 0x74; buffer[39] = 0x61;
  buffer[40] = dataSize & 0xff; buffer[41] = (dataSize >> 8) & 0xff;
  buffer[42] = (dataSize >> 16) & 0xff; buffer[43] = (dataSize >> 24) & 0xff;

  for (let i = 0; i < numSamples; i++) {
    buffer[44 + i] = Math.max(0, Math.min(255, Math.round(128 + 96 * generator(i, numSamples))));
  }

  return buffer;
}

function envelope(i: number, total: number, fadeInMs: number, fadeOutMs: number): number {
  const fadeInSamples = SAMPLE_RATE * fadeInMs / 1000;
  const fadeOutSamples = SAMPLE_RATE * fadeOutMs / 1000;
  const fadeIn = Math.min(1, i / fadeInSamples);
  const fadeOut = Math.min(1, (total - i) / fadeOutSamples);
  return fadeIn * fadeOut;
}

// ─── Sound Generators (return raw bytes) ────
function generateBeep(): Uint8Array {
  const numSamples = Math.floor(SAMPLE_RATE * 0.3);
  return buildWavBytes(numSamples, (i, total) => {
    const t = i / SAMPLE_RATE;
    return Math.sin(2 * Math.PI * 880 * t) * envelope(i, total, 10, 30);
  });
}

function generateTripleBeep(): Uint8Array {
  const numSamples = Math.floor(SAMPLE_RATE * 1.0);
  return buildWavBytes(numSamples, (i, _total) => {
    const t = i / SAMPLE_RATE;
    const beepDur = 0.08;
    const gap = 0.06;
    const cycle = beepDur + gap;
    const beep0 = t < beepDur;
    const beep1 = t >= cycle && t < cycle + beepDur;
    const beep2 = t >= cycle * 2 && t < cycle * 2 + beepDur;
    if (beep0 || beep1 || beep2) {
      const localT = beep0 ? t : beep1 ? t - cycle : t - cycle * 2;
      const localSamples = Math.floor(beepDur * SAMPLE_RATE);
      const localI = Math.floor(localT * SAMPLE_RATE);
      return Math.sin(2 * Math.PI * 1000 * t) * envelope(localI, localSamples, 5, 10);
    }
    return 0;
  });
}

function generateAscending(): Uint8Array {
  const numSamples = Math.floor(SAMPLE_RATE * 0.8);
  return buildWavBytes(numSamples, (i, total) => {
    const t = i / SAMPLE_RATE;
    const freq = 400 + (t / 0.8) * 800;
    return Math.sin(2 * Math.PI * freq * t) * envelope(i, total, 10, 40);
  });
}

function generateBell(): Uint8Array {
  const numSamples = Math.floor(SAMPLE_RATE * 0.6);
  return buildWavBytes(numSamples, (i, total) => {
    const t = i / SAMPLE_RATE;
    const decay = Math.exp(-t * 6);
    const f1 = Math.sin(2 * Math.PI * 523 * t);
    const f2 = Math.sin(2 * Math.PI * 1047 * t) * 0.5;
    const f3 = Math.sin(2 * Math.PI * 1568 * t) * 0.25;
    return (f1 + f2 + f3) / 1.75 * decay * envelope(i, total, 2, 5);
  });
}

function generateBuzzer(): Uint8Array {
  const numSamples = Math.floor(SAMPLE_RATE * 0.4);
  return buildWavBytes(numSamples, (i, total) => {
    const t = i / SAMPLE_RATE;
    const raw = Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.3 * Math.sin(2 * Math.PI * 660 * t);
    const clipped = Math.max(-1, Math.min(1, raw * 1.5));
    return clipped * envelope(i, total, 5, 20);
  });
}

const alarmGenerators: Record<Exclude<AlarmSoundType, 'none'>, () => Uint8Array> = {
  beep: generateBeep,
  triple: generateTripleBeep,
  ascending: generateAscending,
  bell: generateBell,
  buzzer: generateBuzzer,
};

// ─── Write WAV to cache file and return file URI ────
const fileUriCache = new Map<AlarmSoundType, string>();

function getAlarmFileUri(type: AlarmSoundType): string {
  if (type === 'none') return '';
  let uri = fileUriCache.get(type);
  if (!uri) {
    const wavBytes = alarmGenerators[type]();
    const file = new File(Paths.cache, `alarm_${type}.wav`);
    file.write(wavBytes);
    uri = file.uri;
    fileUriCache.set(type, uri);
  }
  return uri;
}

/** Configure audio session for alarm playback — plays in silent mode and when screen locked */
async function configureAudio() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Ignore errors on web or unsupported platforms
  }
}

/** Start playing the alarm sound in a loop (uses current selected type) */
export async function startAlarmSound(): Promise<void> {
  if (isLooping) return;
  if (currentAlarmType === 'none') return;
  isLooping = true;

  try {
    await configureAudio();
    const uri = getAlarmFileUri(currentAlarmType);
    if (!uri) { isLooping = false; return; }

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { isLooping: true, volume: 1.0, shouldPlay: true }
    );
    alarmSound = sound;
  } catch (err) {
    console.warn('Failed to play alarm sound:', err);
    isLooping = false;
  }
}

/** Play a short preview of a given alarm type (for settings) */
export async function previewAlarmSound(type: AlarmSoundType): Promise<void> {
  await stopAlarmSound();
  if (type === 'none') return;

  try {
    await configureAudio();
    const uri = getAlarmFileUri(type);
    if (!uri) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { isLooping: false, volume: 1.0, shouldPlay: true }
    );
    alarmSound = sound;
    // Auto-unload after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (alarmSound === sound) alarmSound = null;
      }
    });
  } catch {
    // Ignore preview errors
  }
}

/** Stop the alarm sound */
export async function stopAlarmSound(): Promise<void> {
  isLooping = false;
  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    } catch {
      // Ignore
    }
    alarmSound = null;
  }
}
