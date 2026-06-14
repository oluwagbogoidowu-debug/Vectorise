/**
 * Subtle haptic feedback utility using the native HTML5 Vibration API.
 * Safely handles environments where navigator.vibrate is unavailable (or blocked).
 */
export const getHapticSettings = (): boolean => {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('vectorise_haptics_enabled');
  return val === null ? true : val === 'true';
};

export const setHapticSettings = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vectorise_haptics_enabled', String(enabled));
  }
};

export const triggerHaptic = (pattern: number | number[] = 10) => {
  if (!getHapticSettings()) {
    return;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Degrade silently (e.g. security blocks in iframe contexts)
    }
  }
};

export const hapticPatterns = {
  light: 8,          // Small subtle tick for button presses/toggles (8ms)
  medium: 15,        // Standard tap (15ms)
  success: [15, 50, 20], // Crisp double-pulse for success/completion of a sprint step
  notification: [10, 30, 10], // Gentle double-tap for opening updates or notifications
};
