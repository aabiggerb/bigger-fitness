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

interface NativeRestTimerActivityModule {
  areLiveActivitiesEnabled(): boolean;
  startActivity(args: { athleteName: string; totalSec: number; remainingSec: number }): Promise<string | null>;
  updateActivity(args: { remainingSec?: number; totalSec?: number; isPaused?: boolean; isFinished?: boolean }): Promise<void>;
  endActivity(args?: { dismiss?: boolean }): Promise<void>;
}

const native = requireOptionalNativeModule<NativeRestTimerActivityModule>('RestTimerActivityModule');

const isSupported = Platform.OS === 'ios' && !!native;

export const RestTimerActivity = {
  isSupported,
  areEnabled(): boolean {
    if (!isSupported) return false;
    try { return native!.areLiveActivitiesEnabled(); } catch { return false; }
  },
  async start(args: StartActivityArgs): Promise<string | null> {
    if (!isSupported) return null;
    try { return await native!.startActivity(args); } catch { return null; }
  },
  async update(args: UpdateActivityArgs): Promise<void> {
    if (!isSupported) return;
    try { await native!.updateActivity(args); } catch { /* swallow */ }
  },
  async end(dismiss = true): Promise<void> {
    if (!isSupported) return;
    try { await native!.endActivity({ dismiss }); } catch { /* swallow */ }
  },
};

export default RestTimerActivity;
