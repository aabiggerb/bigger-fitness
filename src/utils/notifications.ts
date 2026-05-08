import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configure how notifications appear when app is in foreground ────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permissions (iOS requires explicit permission) */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
    },
  });
  return status === 'granted';
}

/**
 * Schedule a local notification after `seconds` delay.
 * Returns the notification identifier so it can be cancelled.
 */
export async function scheduleRestTimerNotification(
  seconds: number,
  athleteName?: string,
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const body = athleteName
      ? `${athleteName} — el descanso terminó. ¡Siguiente serie!`
      : '¡El descanso terminó! Siguiente serie.';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏱ Descanso completado',
        body,
        sound: Platform.OS === 'ios' ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        // iOS: Time-Sensitive bypasses Focus / Do Not Disturb so the alarm
        // fires even with the screen off and notifications grouped.
        interruptionLevel: 'timeSensitive',
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
      },
    });

    return id;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

/** Cancel a previously scheduled notification */
export async function cancelRestTimerNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    // Notification may have already fired — ignore
  }
}

/** Cancel all pending rest timer notifications */
export async function cancelAllRestNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel notifications:', e);
  }
}
