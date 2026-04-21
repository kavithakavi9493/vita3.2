/**
 * VI — Quiz2Screen
 * Mental health questions: stressLevel, anxietyLevel, focusLevel
 * Values match backend SCORE_MAP exactly.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { quizApi } from '../utils/api'
import { GoldBtn } from '../components/UI'
import { C, G } from '../constants/colors'

const QUESTIONS = [
  {
    field: 'stressLevel',
    question: 'How would you rate your current stress level?',
    icon: '🧠',
    options: [
      { value: 'Low',      label: 'Low',      sub: 'Calm and in control',      icon: '😌' },
      { value: 'Moderate', label: 'Moderate', sub: 'Manageable day-to-day',    icon: '😐' },
      { value: 'High',     label: 'High',     sub: 'Overwhelmed or anxious',   icon: '😰' },
    ],
  },
  {
    field: 'anxietyLevel',
    question: 'Do you experience anxiety or nervousness?',
    icon: '💭',
    options: [
      { value: 'No',        label: 'No',        sub: 'Rarely feel anxious',    icon: '😊' },
      { value: 'Sometimes', label: 'Sometimes', sub: 'In stressful situations', icon: '😅' },
      { value: 'Often',     label: 'Often',     sub: 'Frequently anxious',     icon: '😟' },
    ],
  },
  {
    field: 'focusLevel',
    question: 'How is your mental focus and concentration?',
    icon: '🎯',
    options: [
      { value: 'Good',    label: 'Good',    sub: 'Sharp and focused',         icon: '🎯' },
      { value: 'Average', label: 'Average', sub: 'Gets distracted sometimes', icon: '🙂' },
      { value: 'Poor',    label: 'Poor',    sub: 'Often unfocused or foggy',  icon: '😵' },
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

export default function Quiz2Screen() {
  const navigate    = useNavigate()
  const { state, update } = useApp()
  const [answers, setAnswers] = useState({
    stressLevel:  state.stressLevel  || '',
    anxietyLevel: state.anxietyLevel || '',
    focusLevel:   state.focusLevel   || '',
  })

  const allAnswered = QUESTIONS.every(q => answers[q.field])
  const handleSelect = (field, value) => setAnswers(a => ({ ...a, [field]: value }))

  const handleNext = async () => {
    if (!allAnswered) return
    update(answers)
    if (state.userId) {
      quizApi.save({ userId: state.userId, ...answers }).catch(() => {})
    }
    navigate('/quiz-3')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ padding: '24px 20px 0', background: G.hero }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6 }}>STEP 3 OF 4 — PART 2</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F0D080', marginBottom: 4 }}>Mental Wellness</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingBottom: 20 }}>
          Stress and focus directly impact your hormone levels
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {QUESTIONS.map(q => (
          <QuizQuestion key={q.field} q={q} answer={answers[q.field]} onSelect={handleSelect} />
        ))}
      </div>
      <div style={{ padding: '16px 16px 32px', borderTop: `1px solid ${C.border}`, background: C.white }}>
        <GoldBtn onClick={handleNext} disabled={!allAnswered}>Continue →</GoldBtn>
      </div>
    </div>
  )
}
