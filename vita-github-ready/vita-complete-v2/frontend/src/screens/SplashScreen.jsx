import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { C, G } from '../constants/colors'

export default function SplashScreen() {
  const { state } = useApp()
  const navigate  = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.isLoggedIn && state.hasCompletedQuiz) {
        navigate('/dashboard', { replace: true })
      } else if (state.isLoggedIn) {
        navigate('/routine', { replace: true })
      } else {
        navigate('/signup', { replace: true })
      }
    }, 2200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: G.hero,
    }}>
      <div style={{ fontSize: 64, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }}>⚡</div>
      <div style={{
        fontSize: 32, fontWeight: 900, letterSpacing: 6,
        background: G.gold, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>VITA</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, marginTop: 6 }}>
        VITA INTELLIGENCE
      </div>
      <div style={{ marginTop: 48, display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#C9A84C', opacity: 0.3,
            animation: `dotpulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes dotpulse { 0%,60%,100%{opacity:0.3} 30%{opacity:1} }
      `}</style>
    </div>
  )
}
