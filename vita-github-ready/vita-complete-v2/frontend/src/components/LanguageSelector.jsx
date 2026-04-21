/**
 * VI — Language Selector Component
 * ==================================
 * Compact globe icon + dropdown to switch between 6 languages.
 * Place in ProfileScreen header or nav bar.
 */

import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { C } from '../constants/colors'

export default function LanguageSelector({ compact = false }) {
  const { lang, setLang, languages, t } = useLanguage()
  const [open, setOpen] = useState(false)

  const current = languages[lang]

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          compact ? 4 : 6,
          padding:      compact ? '5px 10px' : '8px 14px',
          background:   'rgba(201,168,76,0.1)',
          border:       '1px solid rgba(201,168,76,0.3)',
          borderRadius: 20,
          cursor:       'pointer',
          fontSize:     compact ? 12 : 13,
          color:        '#8B6914',
          fontWeight:   600,
        }}
      >
        <span style={{ fontSize: compact ? 13 : 16 }}>🌐</span>
        {!compact && <span>{current?.nativeLabel || 'EN'}</span>}
        {compact && <span>{lang.toUpperCase()}</span>}
        <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          />
          <div style={{
            position:    'absolute',
            top:         '110%',
            right:       0,
            background:  '#FFF',
            border:      '1px solid #E0D8C8',
            borderRadius: 12,
            boxShadow:   '0 8px 32px rgba(0,0,0,0.12)',
            zIndex:      1000,
            minWidth:    160,
            overflow:    'hidden',
          }}>
            <div style={{
              padding:    '10px 14px 6px',
              fontSize:   10,
              fontWeight: 700,
              color:      '#A09070',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              {t('language.select')}
            </div>
            {Object.values(languages).map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false) }}
                style={{
                  width:       '100%',
                  display:     'flex',
                  alignItems:  'center',
                  gap:         10,
                  padding:     '10px 14px',
                  background:  lang === l.code ? 'rgba(201,168,76,0.1)' : 'transparent',
                  border:      'none',
                  cursor:      'pointer',
                  fontSize:    13,
                  color:       lang === l.code ? '#8B6914' : '#1A1206',
                  fontWeight:  lang === l.code ? 700 : 400,
                  textAlign:   'left',
                  transition:  'background 0.15s',
                }}
                onMouseOver={e => { if (lang !== l.code) e.currentTarget.style.background = '#F7F3EC' }}
                onMouseOut={e  => { if (lang !== l.code) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                <div>
                  <div style={{ fontSize: 13 }}>{l.nativeLabel}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>{l.label}</div>
                </div>
                {lang === l.code && (
                  <span style={{ marginLeft: 'auto', color: '#C9A84C', fontSize: 14 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
