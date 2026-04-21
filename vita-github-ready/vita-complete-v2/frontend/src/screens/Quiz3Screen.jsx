/**
 * VI — Quiz3Screen
 * Performance questions: libidoLevel, timingControl, erectionQuality
 * Values match backend SCORE_MAP exactly.
 * This is the sensitive section — handled respectfully.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { quizApi } from '../utils/api'
import { GoldBtn } from '../components/UI'
import { C, G } from '../constants/colors'

const QUESTIONS = [
  {
    field: 'libidoLevel',
    question: 'How would you describe your libido (sexual desire)?',
    icon: '🔥',
    options: [
      { value: 'High',     label: 'High',     sub: 'Strong and consistent drive', icon: '🔥' },
      { value: 'Moderate', label: 'Moderate', sub: 'Present but could be stronger', icon: '😊' },
      { value: 'Low',      label: 'Low',      sub: 'Noticeably reduced drive', icon: '😔' },
    ],
  },
  {
    field: 'timingControl',
    question: 'Do you experience timing control challenges during intimacy?',
    icon: '⏱️',
    options: [
      { value: 'No',        label: 'No',        sub: 'Good control consistently', icon: '✅' },
      { value: 'Sometimes', label: 'Sometimes', sub: 'Occasionally an issue',    icon: '🤔' },
      { value: 'Often',     label: 'Often',     sub: 'Frequent concern for me',  icon: '⚠️' },
    ],
  },
  {
    field: 'erectionQuality',
    question: 'How would you rate your erection quality?',
    icon: '💪',
    options: [
      { value: 'Strong',   label: 'Strong',   sub: 'Firm and reliable',        icon: '💪' },
      { value: 'Moderate', label: 'Moderate', sub: 'Sometimes inconsistent',   icon: '😐' },
      { value: 'Weak',     label: 'Weak',     sub: 'Often weak or unreliable', icon: '😞' },
    ],
  },
]

function QuizQuestion({ q, answer, onSelect }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{q.icon}</span>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{q.question}</div>
      </div>
      {q.options.map(opt => {
        const active = answer === opt.value
        return (
          <div key={opt.value} onClick={() => onSelect(q.field, opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 16px', marginBottom: 8, borderRadius: 12, cursor: 'pointer',
              background: active ? C.goldBg : C.white,
              border: `1.5px solid ${active ? C.gold : C.border}`,
              transition: 'all 0.18s',
            }}>
            <span style={{ fontSize: 20 }}>{opt.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: active ? C.goldDark : C.text }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.sub}</div>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: active ? C.gold : 'transparent',
              border: `2px solid ${active ? C.gold : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: C.onGold, flexShrink: 0,
            }}>{active ? '✓' : ''}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function Quiz3Screen() {
  const navigate    = useNavigate()
  const { state, update } = useApp()
  const [answers, setAnswers] = useState({
    libidoLevel:     state.libidoLevel     || '',
    timingControl:   state.timingControl   || '',
    erectionQuality: state.erectionQuality || '',
  })

  const allAnswered = QUESTIONS.every(q => answers[q.field])
  const handleSelect = (field, value) => setAnswers(a => ({ ...a, [field]: value }))

  const handleNext = async () => {
    if (!allAnswered) return
    update(answers)
    if (state.userId) {
      quizApi.save({ userId: state.userId, ...answers }).catch(() => {})
    }
    navigate('/final-loading')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ padding: '24px 20px 0', background: G.hero }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6 }}>STEP 4 OF 4</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F0D080', marginBottom: 4 }}>Performance Health</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingBottom: 20 }}>
          100% confidential. This shapes your entire protocol.
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: 'rgba(184,134,11,0.08)', border: `1px solid ${C.goldBorder}`,
          borderRadius: 10, fontSize: 11, color: C.muted,
        }}>
          🔒 Your answers are private and never shared
        </div>
        {QUESTIONS.map(q => (
          <QuizQuestion key={q.field} q={q} answer={answers[q.field]} onSelect={handleSelect} />
        ))}
      </div>
      <div style={{ padding: '16px 16px 32px', borderTop: `1px solid ${C.border}`, background: C.white }}>
        <GoldBtn onClick={handleNext} disabled={!allAnswered}>See My Results →</GoldBtn>
      </div>
    </div>
  )
}
