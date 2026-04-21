/**
 * VI — AI Health Chatbot Component
 * ==================================
 * Features:
 *   - Floating button on all screens
 *   - Chat window with message history
 *   - Typing / thinking animation
 *   - Suggested prompt chips
 *   - Context-aware (uses user's body type if logged in)
 *   - Multi-language (sends lang to backend)
 *   - Mobile-first design matching VI's gold/cream theme
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import { useLanguage } from '../context/LanguageContext'
import { C, G } from '../constants/colors'

// ── API ──────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || ''

async function sendChatMessage(message, history, userId, language) {
  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

  const res = await fetch(`${API_BASE}/api/chat/`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history, userId, language }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to get response')
  }
  return res.json()
}

async function fetchSuggestedPrompts(language = 'en') {
  const res = await fetch(`${API_BASE}/api/chat/prompts?language=${language}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.prompts || []
}

// ── COLORS (VI theme) ────────────────────────────────────────
const CH = {
  bg:       '#F0EAE0',
  surface:  '#FFFFFF',
  gold:     '#C9A84C',
  goldDark: '#8B6914',
  text:     '#1A1206',
  muted:    '#706050',
  subtle:   '#A09070',
  border:   '#E0D8C8',
  userBg:   'linear-gradient(135deg, #C9A84C, #8B6914)',
  aiBg:     '#F7F3EC',
  shadow:   'rgba(0,0,0,0.15)',
}

// ── TYPING INDICATOR ─────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: CH.gold,
          animation: `vi-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes vi-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes vi-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vi-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(201,168,76,0.4); }
          50%       { transform: scale(1.07); box-shadow: 0 6px 28px rgba(201,168,76,0.6); }
        }
        @keyframes vi-slideup {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

// ── MESSAGE BUBBLE ────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display:       'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:  10,
      animation:     'vi-fadein 0.25s ease',
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `linear-gradient(135deg, ${CH.gold}, ${CH.goldDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>⚡</div>
      )}
      <div style={{
        maxWidth:     '80%',
        padding:      '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background:   isUser ? CH.userBg : CH.aiBg,
        color:        isUser ? '#FFF' : CH.text,
        fontSize:     13,
        lineHeight:   1.6,
        boxShadow:    `0 1px 4px ${CH.shadow}`,
        border:       isUser ? 'none' : `1px solid ${CH.border}`,
        whiteSpace:   'pre-wrap',
        wordBreak:    'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ── PROMPT CHIP ───────────────────────────────────────────────
function PromptChip({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:      '6px 12px',
      background:   'transparent',
      border:       `1px solid ${CH.gold}`,
      borderRadius: 20,
      color:        CH.goldDark,
      fontSize:     11,
      cursor:       'pointer',
      whiteSpace:   'nowrap',
      transition:   'all 0.15s',
      flexShrink:   0,
    }}
    onMouseOver={e => e.currentTarget.style.background = CH.gold + '20'}
    onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
    >
      {label}
    </button>
  )
}

// ── MAIN CHATBOT COMPONENT ────────────────────────────────────
export default function ChatBot() {
  const { lang, t }         = useLanguage()
  const [open, setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]   = useState('')
  const [typing, setTyping] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [error, setError]   = useState('')
  const [userId, setUserId] = useState(null)
  const messagesEndRef       = useRef(null)
  const inputRef             = useRef(null)

  // ── Init ────────────────────────────────────────────────────
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = auth.onAuthStateChanged(u => setUserId(u?.uid || null))
    return unsubscribe
  }, [])

  // ── Fetch suggested prompts ──────────────────────────────────
  useEffect(() => {
    fetchSuggestedPrompts(lang).then(setPrompts).catch(() => {})
  }, [lang])

  // ── Auto-open greeting ────────────────────────────────────────
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = {
        role:    'assistant',
        content: t('chat.greeting'),
      }
      setMessages([greeting])
    }
  }, [open])

  // ── Scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // ── Focus input when opened ───────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // ── Send message ──────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg) return

    setInput('')
    setError('')
    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    // Build history for API (exclude first greeting)
    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role, content: m.content,
    }))

    try {
      const data = await sendChatMessage(msg, history, userId, lang)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || t('chat.error'))
    } finally {
      setTyping(false)
    }
  }, [input, messages, userId, lang, t])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* ── Floating Trigger Button ────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open VI Health Assistant"
        style={{
          position:  'fixed',
          bottom:    80,
          right:     16,
          width:     54,
          height:    54,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${CH.gold}, ${CH.goldDark})`,
          border:    'none',
          cursor:    'pointer',
          display:   'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize:  22,
          zIndex:    1000,
          animation: open ? 'none' : 'vi-pulse 2.5s ease-in-out infinite',
          transition: 'transform 0.2s',
          boxShadow: '0 4px 20px rgba(201,168,76,0.5)',
        }}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* ── Chat Window ──────────────────────────────────────── */}
      {open && (
        <div style={{
          position:    'fixed',
          bottom:      144,
          right:       16,
          width:       'min(360px, calc(100vw - 32px))',
          height:      'min(520px, calc(100vh - 180px))',
          background:  CH.surface,
          borderRadius: 20,
          boxShadow:   '0 12px 48px rgba(0,0,0,0.2)',
          display:     'flex',
          flexDirection: 'column',
          overflow:    'hidden',
          zIndex:      999,
          animation:   'vi-slideup 0.25s ease',
          border:      `1px solid ${CH.border}`,
        }}>

          {/* Header */}
          <div style={{
            padding:    '14px 16px',
            background: `linear-gradient(135deg, ${CH.goldDark}, #5a3d00)`,
            display:    'flex',
            alignItems: 'center',
            gap:        10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontWeight: 700, fontSize: 14 }}>
                {t('chat.title')}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}>
                {t('chat.free_label')}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
              fontSize: 18, cursor: 'pointer', padding: 4,
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex:        1,
            overflowY:   'auto',
            padding:     '12px 12px 4px',
            background:  CH.bg,
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${CH.gold}, ${CH.goldDark})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}>⚡</div>
                <div style={{ background: CH.aiBg, borderRadius: '18px 18px 18px 4px', border: `1px solid ${CH.border}` }}>
                  <TypingDots />
                </div>
              </div>
            )}
            {error && (
              <div style={{
                padding: '8px 12px', marginBottom: 8,
                background: '#FFF0F0', border: '1px solid #FFCCCC',
                borderRadius: 10, fontSize: 11, color: '#CC3333',
                animation: 'vi-fadein 0.2s ease',
              }}>
                ⚠️ {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts — shown when 1 message (greeting only) */}
          {messages.length <= 1 && prompts.length > 0 && (
            <div style={{
              padding:    '8px 12px',
              background: CH.bg,
              borderTop:  `1px solid ${CH.border}`,
              display:    'flex',
              gap:        6,
              overflowX:  'auto',
              flexShrink: 0,
              scrollbarWidth: 'none',
            }}>
              {prompts.map((p, i) => (
                <PromptChip key={i} label={p} onClick={() => send(p)} />
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding:    '10px 12px',
            background: CH.surface,
            borderTop:  `1px solid ${CH.border}`,
            display:    'flex',
            gap:        8,
            alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('chat.placeholder')}
              rows={1}
              style={{
                flex:        1,
                border:      `1px solid ${CH.border}`,
                borderRadius: 12,
                padding:     '9px 12px',
                fontSize:    13,
                resize:      'none',
                outline:     'none',
                fontFamily:  'inherit',
                background:  CH.bg,
                color:       CH.text,
                lineHeight:  1.5,
                maxHeight:   80,
                overflowY:   'auto',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || typing}
              style={{
                width:        40,
                height:       40,
                borderRadius: '50%',
                background:   input.trim() && !typing ? `linear-gradient(135deg, ${CH.gold}, ${CH.goldDark})` : CH.border,
                border:       'none',
                cursor:       input.trim() && !typing ? 'pointer' : 'default',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     16,
                flexShrink:   0,
                transition:   'all 0.15s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
