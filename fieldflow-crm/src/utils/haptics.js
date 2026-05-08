/**
 * haptics.js — Capacitor-aware haptic feedback utility
 * Silently no-ops on web / desktop.
 */

const isNative = () => !!(window.Capacitor?.isNativePlatform?.())

async function _impact(style) {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle[style] })
  } catch (_) {}
}

async function _notification(type) {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType[type] })
  } catch (_) {}
}

/** Short, subtle tap — for list item selection, toggles */
export function lightTap() { return _impact('Light') }

/** Standard tap — for primary buttons, nav items */
export function mediumTap() { return _impact('Medium') }

/** Strong tap — for destructive actions, alerts */
export function heavyTap() { return _impact('Heavy') }

/** Success pattern — for save/submit confirmations */
export function successVibration() { return _notification('Success') }

/** Error pattern — for validation failures, errors */
export function errorVibration() { return _notification('Error') }

/** Warning pattern — for warnings, confirmations before destructive action */
export function warningVibration() { return _notification('Warning') }
