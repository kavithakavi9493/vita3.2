/**
 * VI — RoutineScreen
 * Collects wake/meal/sleep times. Computes lifestyleScore.
 * Fields: wakeTime, breakfastTime, lunchTime, dinnerTime, sleepTime
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { quizApi } from '../utils/api'
import { GoldBtn } from '../components/UI'
import { C, G } from '../constants/colors'

function computeLifestyleScore({ wakeTime, breakfastTime, lunchTime, dinnerTime, sleepTime }) {
  let score = 20
  const wake  = parseInt(wakeTime?.split(':')[0] || '7')
  const sleep = parseInt(sleepTime?.split(':')[0] || '22')
  const sleepHrs = (sleep >= wake ? sleep - wake : 24 - wake + sleep)
  if (wake <= 6)  score += 5
  if (wake <= 7)  score += 3
  if (sleepHrs >= 7 && sleepHrs <= 9) score += 5
  if (breakfastTime) score += 3
  if (lunchTime)     score += 3
  if (dinnerTime)    score += 3
  const dinner = parseInt(dinnerTime?.split(':')[0] || '20')
  if (dinner <= 20) score += 3
  return Math.min(score, 40)
}

function TimeRow({ label, icon, field, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', marginBottom: 10,
      background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{label}</span>
      </div>
      <input
        type="time"
        value={value}
        onChange={e => onChange(field, e.target.value)}
        style={{
          border: `1px solid ${C.goldBorder}`, borderRadius: 8,
          padding: '6px 10px', fontSize: 14, color: C.text,
          background: C.goldBg, fontWeight: 700, outline: 'none',
        }}
      />
    </div>
  )
}

export default function RoutineScreen() {
  const navigate    = useNavigate()
  const { state, update } = useApp()
  const [times, setTimes] = useState({
    wakeTime:      state.wakeTime      || '06:00',
    breakfastTime: state.breakfastTime || '08:00',
    lunchTime:     state.lunchTime     || '13:00',
    dinnerTime:    state.dinnerTime    || '20:00',
    sleepTime:     state.sleepTime     || '22:30',
  })

  const handleChange = (field, val) => setTimes(t => ({ ...t, [field]: val }))

  const handleNext = async () => {
    const lifestyleScore = computeLifestyleScore(times)
    update({ ...times, lifestyleScore })
    if (state.userId) {
      quizApi.save({ userId: state.userId, ...times, lifestyleScore }).catch(() => {})
    }
    navigate('/age-group')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 0', background: G.hero }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6 }}>STEP 1 OF 4</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F0D080', marginBottom: 4 }}>Your Daily Routine</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingBottom: 20 }}>
          Help us understand your lifestyle for a personalised protocol
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {[
          { label: 'Wake Up',   icon: '🌅', field: 'wakeTime'      },
          { label: 'Breakfast', icon: '☕', field: 'breakfastTime'  },
          { label: 'Lunch',     icon: '🍱', field: 'lunchTime'      },
          { label: 'Dinner',    icon: '🌙', field: 'dinnerTime'     },
          { label: 'Sleep',     icon: '😴', field: 'sleepTime'      },
        ].map(row => (
          <TimeRow key={row.field} {...row} value={times[row.field]} onChange={handleChange} />
        ))}

        <div style={{
          marginTop: 8, padding: '12px 16px',
          background: C.goldBg, border: `1px solid ${C.goldBorder}`,
          borderRadius: 12, fontSize: 12, color: C.muted,
        }}>
          💡 Your routine helps us schedule supplement timing for maximum effect
        </div>
      </div>

      <div style={{ padding: '16px 16px 32px', borderTop: `1px solid ${C.border}`, background: C.white }}>
        <GoldBtn onClick={handleNext}>Continue →</GoldBtn>
      </div>
    </div>
  )
}
