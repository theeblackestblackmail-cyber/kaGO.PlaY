/**
 * Haptic Feedback Engine for mobile & touch interaction
 * Uses navigator.vibrate where available
 */

export const haptic = {
  // Light pulse on Play/Pause
  playPause: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration errors
    }
  },

  // Medium double pulse on Track Skip
  trackSkip: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 40, 20]);
      }
    } catch {
      // Ignore vibration errors
    }
  },

  // Tick pulse on EQ fader adjustment or toggle
  eqTick: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration errors
    }
  },

  // Custom pattern
  pattern: (ms: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore
    }
  },
};
