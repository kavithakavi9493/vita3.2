/**
 * VI V3 — useActivation hook
 * Single source of truth for activation state + lock logic.
 */
import { useApp } from '../context/AppContext'

export function useActivation() {
  const { state } = useApp()

  const isActivated = state.isActivated
  const expiry      = state.activationExpiry ? new Date(state.activationExpiry) : null
  const isExpired   = expiry ? new Date() > expiry : !isActivated

  // Features locked after 7-day trial expires (but not converted to paid)
  const isLocked = isExpired && !state.isConvertedToPaid

  const daysLeft = expiry
    ? Math.max(Math.ceil((expiry - new Date()) / (1000*60*60*24)), 0)
    : 0

  const dayNumber = state.activationDay || 1
  const isDay7    = dayNumber >= 7

  return {
    isActivated,
    isExpired,
    isLocked,       // true → show locked overlay
    daysLeft,
    dayNumber,
    isDay7,
    isConverted: state.isConvertedToPaid,
    canTrack:    isActivated && !isLocked,   // can log + view streak
  }
}
