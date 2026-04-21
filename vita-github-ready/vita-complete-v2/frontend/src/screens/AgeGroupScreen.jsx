/**
 * VI — AgeGroupScreen
 * Selects ageGroup: "18-25" | "26-35" | "36-45" | "45+"
 * Matches backend AGE_DEDUCTION map exactly.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { quizApi } from '../utils/api'
import { GoldBtn } from '../components/UI'
import { C, G } from '../constants/colors'

const AGE_OPTIONS = [
  { id: '18-25', label: '18–25', sub: 'Young & energetic', icon: '⚡' },
  { id: '26-35', label: '26–35', sub: 'Prime performance zone', icon: '🔥' },
  { id: '36-45', label: '36–45', sub: 'Maintaining peak strength', icon: '💪' },
  { id: '45+',   label: '45+',   sub: 'Experience & wisdom', icon: '👑' },
]

export default function AgeGroupScreen() {
  const navigate    = useNavigate()
  const { state, update } = useApp()
  const [selected, setSelected] = useState(state.ageGroup || '')

  const handleNext = async () => {
    if (!selected) return
    update({ ageGroup: selected })
    if (state.userId) {
      quizApi.save({ userId: state.userId, ageGroup: selected }).catch(() => {})
    }
    navigate('/quiz-1')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ padding: '24px 20px 0', background: G.hero }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6 }}>STEP 2 OF 4</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F0D080', marginBottom: 4 }}>Your Age Group</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingBottom: 20 }}>
          Age determines your optimal supplement protocol
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        {AGE_OPTIONS.map(opt => {
          const active = selected === opt.id
          return (
            <div key={opt.id} onClick={() => setSelected(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 20px', marginBottom: 12, borderRadius: 16, cursor: 'pointer',
                background: active ? C.goldBg : C.white,
                border: `2px solid ${active ? C.gold : C.border}`,
                transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: 28 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: active ? C.goldDark : C.text }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px solid ${active ? C.gold : C.border}`,
                background: active ? C.gold : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: C.onGold,
              }}>
                {active ? '✓' : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '16px 16px 32px', borderTop: `1px solid ${C.border}`, background: C.white }}>
        <GoldBtn onClick={handleNext} disabled={!selected}>Continue →</GoldBtn>
      </div>
    </div>
  )
}
