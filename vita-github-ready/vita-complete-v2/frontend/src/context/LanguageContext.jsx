/**
 * VI — Language Context
 * ======================
 * Provides language state + t() translation function to the entire app.
 *
 * Usage:
 *   const { t, lang, setLang } = useLanguage()
 *   t('chat.title')                → "VI Health Assistant"
 *   t('referral.step1')            → "Share your code"
 *   t('subscription.cycle', {count: 3}) → "Cycle 3 of 12"
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { translate, LANGUAGES } from '../i18n/index'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'vi_language'
const DEFAULT_LANG = 'en'

// Detect browser language and map to supported language
function detectBrowserLang() {
  const nav = navigator.language || navigator.userLanguage || ''
  const code = nav.substring(0, 2).toLowerCase()
  return LANGUAGES[code] ? code : DEFAULT_LANG
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || detectBrowserLang()
  })

  // Translate function — memoized per language
  const t = useCallback((key, vars = {}) => {
    return translate(lang, key, vars)
  }, [lang])

  // Change language — persists to localStorage + Firestore
  const setLang = async (newLang) => {
    if (!LANGUAGES[newLang]) return
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)

    // Persist to Firestore if logged in
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          language:  newLang,
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (_) {
      // Silent fail — localStorage is source of truth
    }
  }

  // On mount: sync from Firestore if user is logged in
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        const savedLang = snap.data()?.language
        if (savedLang && LANGUAGES[savedLang] && savedLang !== lang) {
          setLangState(savedLang)
          localStorage.setItem(STORAGE_KEY, savedLang)
        }
      } catch (_) {}
    })
    return unsubscribe
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>')
  return ctx
}

// Backward-compat alias
export const useTranslation = useLanguage
