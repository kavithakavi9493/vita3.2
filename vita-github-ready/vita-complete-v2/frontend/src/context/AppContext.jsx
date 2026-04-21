/**
 * VI V3 + Phase 1 — AppContext
 * ==============================
 * Surgical addition vs V3:
 *   - language field added to defaultState (used by LanguageContext)
 *   - phoneNumber alias added for Razorpay subscription prefill
 * All existing V3 state, update, reset logic is 100% unchanged.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const AppContext = createContext(null)

const defaultState = {
  // Auth
  userId: null, userName: '', phone: '', phoneNumber: '', email: '',
  isLoggedIn: false, hasCompletedQuiz: false,

  // Quiz inputs
  ageGroup: '', wakeTime: '06:00', breakfastTime: '08:00',
  lunchTime: '13:00', dinnerTime: '20:00', sleepTime: '22:30',

  // Quiz answers
  energyLevel: '', workoutLevel: '', fatigueLevel: '',
  stressLevel: '', anxietyLevel: '', focusLevel: '',
  libidoLevel: '', timingControl: '', erectionQuality: '',

  // Scores
  lifestyleScore: 0, physicalScore: 0, mentalScore: 0,
  performanceScore: 0, vitaScore: 0,

  // Body type + recommendation
  bodyTypeId: '', recommendedPlan: '',

  // V3: Activation model
  isActivated: false,
  activationExpiry: null,
  activationDay: 1,
  isConvertedToPaid: false,

  // V3: Real tracking data
  currentStreak: 0,
  totalDaysActive: 0,
  weekNumber: 1,
  lastLogDate: '',
  todayTasksDone: [],

  // V3: Recommended product stack
  recommendedStack: [],
  stackBundlePrice: 0,

  // Phase 1: Language preference
  language: 'en',
}

async function persistQuizStep(userId, updates) {
  if (!userId) return
  try {
    const quizFields = [
      'ageGroup','energyLevel','workoutLevel','fatigueLevel',
      'stressLevel','anxietyLevel','focusLevel','libidoLevel',
      'timingControl','erectionQuality','lifestyleScore',
      'physicalScore','mentalScore','performanceScore','vitaScore',
      'bodyTypeId','recommendedPlan','hasCompletedQuiz',
    ]
    const quizData = {}
    for (const k of quizFields) if (k in updates) quizData[k] = updates[k]
    if (!Object.keys(quizData).length) return
    await setDoc(doc(db, 'quizResults', userId), {
      userId, ...quizData, updatedAt: serverTimestamp(),
    }, { merge: true })
  } catch (err) {
    console.warn('Quiz persistence skipped:', err.message)
  }
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem('vi_app_state_v3')
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState
    } catch { return defaultState }
  })

  useEffect(() => {
    localStorage.setItem('vi_app_state_v3', JSON.stringify(state))
  }, [state])

  // Recompute activationDay on mount / when expiry changes
  useEffect(() => {
    if (!state.isActivated || !state.activationExpiry) return
    try {
      const expDate   = new Date(state.activationExpiry)
      const days      = 7
      const startDate = new Date(expDate.getTime() - days * 24 * 60 * 60 * 1000)
      const dayNum    = Math.min(
        Math.max(Math.floor((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1, 1),
        days
      )
      const expiredNow = new Date() > expDate
      if (state.activationDay !== dayNum || (expiredNow && state.isActivated)) {
        setState(s => ({ ...s, activationDay: dayNum, isActivated: !expiredNow }))
      }
    } catch { /* ignore */ }
  }, [state.activationExpiry])

  const update = (updates) => {
    setState(s => {
      const next = { ...s, ...updates }
      // Keep phoneNumber in sync with phone (Razorpay prefill)
      if (updates.phone && !updates.phoneNumber) next.phoneNumber = updates.phone
      if (next.userId) persistQuizStep(next.userId, updates)
      return next
    })
  }

  const reset = () => {
    localStorage.removeItem('vi_app_state_v3')
    setState(defaultState)
  }

  return (
    <AppContext.Provider value={{ state, update, reset }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
