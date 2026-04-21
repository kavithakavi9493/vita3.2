/**
 * VI — User Service
 * =================
 * All user profile, auth state, and preference logic.
 */

import { getAuth, signOut } from 'firebase/auth'
import { trackingApi }      from '../utils/api'

/**
 * Get current Firebase user or null.
 */
export function getCurrentUser() {
  return getAuth().currentUser
}

/**
 * Get current user's ID token (for API calls).
 */
export async function getIdToken() {
  const user = getAuth().currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Sign out and clear all local state.
 */
export async function logout(clearAppState) {
  await signOut(getAuth())
  // Clear VI state from localStorage
  localStorage.removeItem('vi_app_state_v3')
  clearAppState?.()
}

/**
 * Fetch dashboard stats for a user.
 * Returns streak, todayLog, weekReport.
 */
export async function getDashboardData(userId) {
  try {
    const [stats, today] = await Promise.all([
      trackingApi.stats(userId),
      trackingApi.todayLog(userId),
    ])
    return { stats, today, error: null }
  } catch (error) {
    console.error('getDashboardData error:', error)
    return { stats: null, today: null, error: error.message }
  }
}

/**
 * Save daily supplement log.
 */
export async function saveDailyLog(userId, tasks) {
  return trackingApi.logDay({ userId, tasks })
}

/**
 * Get user's current streak.
 */
export async function getStreak(userId) {
  try {
    const stats = await trackingApi.stats(userId)
    return stats.currentStreak || 0
  } catch {
    return 0
  }
}
