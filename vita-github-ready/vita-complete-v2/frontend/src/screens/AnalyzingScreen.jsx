/**
 * VI — AnalyzingScreen
 * Animated "AI analysing" loading screen between Quiz1 and Quiz2.
 * Auto-advances after 2.5 seconds.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, G } from '../constants/colors'

const STEPS = [
  { icon: '🧬', label: 'Scanning physical markers...' },
  { icon: '🧠', label: 'Mapping hormonal profile...'  },
  { icon: '⚡', label: 'Calibrating protocol...'      },
]

export default function AnalyzingScreen() {
  const navigate    = useNavigate()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const intervals = STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 700)
    )
    const finish = setTimeout(() => { setDone(true); navigate('/quiz-2') }, 2600)
    return () => { intervals.forEach(clearTimeout); clearTimeout(finish) }
  }, [])

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: G.hero, padding: 32,
    }}>
      {/* Pulsing ring */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%', marginBottom: 36,
        background: 'rgba(255,215,0,0.12)',
        border: '2px solid rgba(255,215,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 42,
        animation: 'vipulse 1.5s ease-in-out infinite',
      }}>
        🔬
      </div>

      <div style={{ fontSize: 18, fontWeight: 800, color: '#F0D080', marginBottom: 8 }}>
        VI is analysing your profile
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 40, textAlign: 'center' }}>
        Powered by Ayurvedic intelligence
      </div>

      <div style={{ width: '100%', maxWidth: 280 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 0',
            opacity: i <= step ? 1 : 0.2,
            transition: 'opacity 0.4s',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: i <= step ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${i <= step ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{s.icon}</div>
            <div style={{ fontSize: 13, color: i <= step ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
              {s.label}
            </div>
            {i < step && <span style={{ marginLeft: 'auto', color: '#B8860B', fontSize: 14 }}>✓</span>}
          </div>
        ))}
      </div>

      <style>{`@keyframes vipulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.08);opacity:1} }`}</style>
    </div>
  )
}
