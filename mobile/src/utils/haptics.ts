import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utility functions for premium UX
 * Provides consistent haptic feedback across the app
 */

export enum HapticFeedbackType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SELECTION = 'selection',
}

/**
 * Trigger light haptic feedback
 * Use for: Button hovers, list item selections
 */
export const triggerLight = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger medium haptic feedback
 * Use for: Button presses, toggles
 */
export const triggerMedium = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger heavy haptic feedback
 * Use for: Important actions, confirmations
 */
export const triggerHeavy = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger success haptic feedback
 * Use for: Successful operations, achievements
 */
export const triggerSuccess = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger warning haptic feedback
 * Use for: Warning messages, attention needed
 */
export const triggerWarning = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger error haptic feedback
 * Use for: Error messages, failed operations
 */
export const triggerError = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger selection haptic feedback
 * Use for: Selection changes, picker scrolls
 */
export const triggerSelection = async (): Promise<void> => {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Generic haptic trigger based on type
 * @param type - The type of haptic feedback to trigger
 */
export const triggerHaptic = async (type: HapticFeedbackType): Promise<void> => {
  switch (type) {
    case HapticFeedbackType.LIGHT:
      return triggerLight();
    case HapticFeedbackType.MEDIUM:
      return triggerMedium();
    case HapticFeedbackType.HEAVY:
      return triggerHeavy();
    case HapticFeedbackType.SUCCESS:
      return triggerSuccess();
    case HapticFeedbackType.WARNING:
      return triggerWarning();
    case HapticFeedbackType.ERROR:
      return triggerError();
    case HapticFeedbackType.SELECTION:
      return triggerSelection();
    default:
      return triggerMedium();
  }
};

/**
 * Trigger a double tap haptic pattern
 * Use for: Like actions, favorites
 */
export const triggerDoubleTap = async (): Promise<void> => {
  try {
    await triggerLight();
    await new Promise(resolve => setTimeout(resolve, 100));
    await triggerMedium();
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

/**
 * Trigger a success pattern (light + success)
 * Use for: Completed actions with positive feedback
 */
export const triggerSuccessPattern = async (): Promise<void> => {
  try {
    await triggerLight();
    await new Promise(resolve => setTimeout(resolve, 50));
    await triggerSuccess();
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
};

export default {
  triggerLight,
  triggerMedium,
  triggerHeavy,
  triggerSuccess,
  triggerWarning,
  triggerError,
  triggerSelection,
  triggerHaptic,
  triggerDoubleTap,
  triggerSuccessPattern,
  HapticFeedbackType,
};
