/**
 * VI i18n — Translation System
 * ==============================
 * Supports: English, Hindi, Kannada, Telugu, Tamil, Marathi
 * Fallback: English for any missing key
 *
 * Usage:
 *   const { t, lang, setLang } = useTranslation()
 *   t('chat.title')          → "VI Health Assistant"
 *   t('nav.dashboard')       → "Dashboard" / "डैशबोर्ड"
 */

import en from './en'
import hi from './hi'
import kn from './kn'
import te from './te'
import ta from './ta'
import mr from './mr'

export const LANGUAGES = {
  en: { code: 'en', label: 'English',    nativeLabel: 'English',     flag: '🇬🇧' },
  hi: { code: 'hi', label: 'Hindi',      nativeLabel: 'हिंदी',        flag: '🇮🇳' },
  kn: { code: 'kn', label: 'Kannada',    nativeLabel: 'ಕನ್ನಡ',         flag: '🇮🇳' },
  te: { code: 'te', label: 'Telugu',     nativeLabel: 'తెలుగు',        flag: '🇮🇳' },
  ta: { code: 'ta', label: 'Tamil',      nativeLabel: 'தமிழ்',          flag: '🇮🇳' },
  mr: { code: 'mr', label: 'Marathi',    nativeLabel: 'मराठी',          flag: '🇮🇳' },
}

const TRANSLATIONS = { en, hi, kn, te, ta, mr }

/**
 * Translate a dot-notation key.
 * Supports interpolation: t('greeting', { name: 'Raj' }) where key is "Hello {{name}}"
 */
export function translate(lang = 'en', key, vars = {}) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
  const fallback = TRANSLATIONS.en

  // Dot-notation lookup
  const lookup = (obj, path) => {
    if (!obj || !path) return undefined
    return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj)
  }

  let value = lookup(dict, key) ?? lookup(fallback, key) ?? key

  // Interpolation: replace {{varName}} with vars[varName]
  if (vars && typeof value === 'string') {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
  }

  return value
}

export default TRANSLATIONS
