import * as Haptics from 'expo-haptics';

/** Light impact — button taps, selections, toggles, pills */
export const light = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** Medium impact — modal snap, mode cycle, threshold crossing */
export const medium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

/** Heavy impact — destructive threshold (swipe-to-delete) */
export const heavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

/** Success notification — save, sync complete, trip added */
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

/** Warning notification — offline alert, error state */
export const warning = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

/** Selection changed — station/calendar/option picked from a list */
export const selection = () => Haptics.selectionAsync();
