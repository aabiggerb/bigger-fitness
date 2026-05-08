import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface StartActivityArgs {
  athleteName: string;
  totalSec: number;
  /** Remaining seconds at the moment of starting. Used to compute endsAt. */
  remainingSec: number;
}

export interface UpdateActivityArgs {
  /** Provide if changing the running endpoint (e.g., resume after pause). */
  remainingSec?: number;
  /** Total duration to recompute progress. Optional. */
  totalSec?: number;
  isPaused?: boolean;
  isFinished?: boolean;
}

export interface DiagnosticInfo {
  platform: string;
  moduleLinked: boolean;
  liveActivitiesEnabled: boolean;
  lastError: string | null;
}

interface NativeRestTimerActivityModule {
  areLiveActivitiesEnabled(): boolean;
  startActivity(args: { athleteName: string; totalSec: number; remainingSec: number }): Promise<string | null>;
  updateActivity(args: { remainingSec?: number; totalSec?: number; isPaused?: boolean; isFinished?: boolean }): Promise<void>;
  endActivity(args?: { dismiss?: boolean }): Promise<void>;
}

const native = requireOptionalNativeModule<NativeRestTimerActivityModule>('RestTimerActivityModule');

const isSupported = Platform.OS === 'ios' && !!native;

let lastError: string | null = null;

const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log('[RestTimerActivity]', ...args);
};

export const RestTimerActivity = {
  isSupported,
  areEnabled(): boolean {
    if (!isSupported) {
      lastError = 'Native module not linked';
      return false;
    }
    try {
      return native!.areLiveActivitiesEnabled();
    } catch (e) {
      lastError = `areEnabled: ${String(e)}`;
      return false;
    }
  },
  async start(args: StartActivityArgs): Promise<string | null> {
    if (!isSupported) {
      lastError = 'Native module not linked (RestTimerActivityModule missing in IPA)';
      log('start skipped:', lastError);
      return null;
    }
    try {
      const id = await native!.startActivity(args);
      log('started activity', id, args);
      if (!id) {
        lastError = 'Activity.request returned null (Live Activities disabled in Settings, or unsupported device)';
      } else {
        lastError = null;
      }
      return id;
    } catch (e) {
      lastError = `start: ${String(e)}`;
      log('start error:', lastError);
      return null;
    }
  },
  async update(args: UpdateActivityArgs): Promise<void> {
    if (!isSupported) return;
    try { await native!.updateActivity(args); } catch (e) { lastError = `update: ${String(e)}`; }
  },
  async end(dismiss = true): Promise<void> {
    if (!isSupported) return;
    try { await native!.endActivity({ dismiss }); } catch (e) { lastError = `end: ${String(e)}`; }
  },
  /** Diagnostic snapshot of the current state. */
  diagnostics(): DiagnosticInfo {
    return {
      platform: Platform.OS,
      moduleLinked: !!native,
      liveActivitiesEnabled: this.areEnabled(),
      lastError,
    };
  },
};

export default RestTimerActivity;
