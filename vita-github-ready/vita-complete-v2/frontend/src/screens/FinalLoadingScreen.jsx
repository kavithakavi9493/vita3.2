/**
 * VI — FinalLoadingScreen
 * Calls quizApi.complete() with all collected answers.
 * Backend computes final scores + bodyTypeId server-side.
 * On success: updates state and navigates to /result.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { quizApi } from '../utils/api'
import { C, G } from '../constants/colors'

const MESSAGES = [
  { pct: 10, text: 'Analysing your lifestyle score...' },
  { pct: 30, text: 'Computing physical markers...'     },
  { pct: 55, text: 'Mapping hormonal profile...'       },
  { pct: 75, text: 'Identifying your body type...'     },
  { pct: 90, text: 'Preparing your protocol...'        },
  { pct: 100, text: 'Your results are ready!'          },
]

export default function FinalLoadingScreen() {
  const navigate    = useNavigate()
  const { state, update } = useApp()
  const [progress, setProgress] = useState(0)
  const [message,  setMessage]  = useState(MESSAGES[0].text)
  const [error,    setError]    = useState('')

  useEffect(() => {
    let msgIdx = 0
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress(p => {
        const next = Math.min(p + 2, 95)
        const step = MESSAGES.findLast(m => m.pct <= next)
        if (step && step.text !== message) {
          setMessage(step.text)
          msgIdx++
        }
        return next
      })
    }, 60)

    // Call backend to complete quiz
    const complete = async () => {
      try {
        const payload = {
          userId:           state.userId,
          bodyTypeId:       state.bodyTypeId || 'PEAK_PERFORMANCE',
          recommendedPlan:  'stack',
          vitaScore:        state.vitaScore        || 0,
          lifestyleScore:   state.lifestyleScore   || 0,
          physicalScore:    state.physicalScore    || 0,
          mentalScore:      state.mentalScore      || 0,
          performanceScore: state.performanceScore || 0,
        }
        const result = await quizApi.complete(payload)
        clearInterval(interval)
        setProgress(100)
        setMessage('Your results are ready!')
        // Backend returns server-validated bodyTypeId and scores
        update({
          bodyTypeId:       result.bodyTypeId,
          vitaScore:        result.scores?.vitaScore        || state.vitaScore,
          physicalScore:    result.scores?.physicalScore    || state.physicalScore,
          mentalScore:      result.scores?.mentalScore      || state.mentalScore,
          performanceScore: result.scores?.performanceScore || state.performanceScore,
          hasCompletedQuiz: true,
        })
        setTimeout(() => navigate('/result', { replace: true }), 800)
      } catch (e) {
        clearInterval(interval)
        setError('Something went wrong. Please try again.')
      }
    }

    // Small delay so animation has time to start
    const timer = setTimeout(complete, 400)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [])

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: G.hero, padding: '0 32px',
    }}>
      {/* Logo pulse */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%', marginBottom: 32,
        background: 'rgba(255,215,0,0.1)', border: '2px solid rgba(255,215,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40, animation: 'spin 3s linear infinite',
      }}>⚡</div>

      <div style={{ fontSize: 20, fontWeight: 800, color: '#F0D080', marginBottom: 8, textAlign: 'center' }}>
        VI is reading your profile
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 40, textAlign: 'center' }}>
        {error || message}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 280, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #FFD700, #B8860B)',
          borderRadius: 3, transition: 'width 0.12s linear',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>{progress}%</div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
