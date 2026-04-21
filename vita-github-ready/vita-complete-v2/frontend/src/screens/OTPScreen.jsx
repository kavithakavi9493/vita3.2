/**
 * VI — OTPScreen
 * Firebase phone OTP verification.
 * On success: saves userId, navigates to /routine
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../context/AppContext'
import { GoldBtn, ErrorBanner } from '../components/UI'
import { C, G } from '../constants/colors'

export default function OTPScreen() {
  const navigate      = useNavigate()
  const { state, update } = useApp()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const inputs = useRef([])

  useEffect(() => {
    inputs.current[0]?.focus()
    const t = setInterval(() => setResendTimer(n => n > 0 ? n - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  const handleChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    if (val && idx < 5) inputs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) return setError('Enter the 6-digit OTP')
    if (!window.confirmationResult) return setError('Session expired. Go back and try again.')
    setLoading(true); setError('')
    try {
      const result = await window.confirmationResult.confirm(code)
      const user   = result.user
      await setDoc(doc(db, 'users', user.uid), {
        userId:    user.uid,
        userName:  state.userName || '',
        phone:     state.phone || user.phoneNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true })
      update({ userId: user.uid, isLoggedIn: true })
      navigate('/routine', { replace: true })
    } catch (e) {
      setError('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    navigate('/signup', { replace: true })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 6 }}>Verify OTP</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 36 }}>
          Sent to {state.phone || 'your mobile'}
        </div>

        {error && <ErrorBanner message={error} />}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              value={digit}
              onChange={e => handleChange(e.target.value, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              maxLength={1}
              type="tel"
              style={{
                width: 46, height: 56, textAlign: 'center',
                fontSize: 22, fontWeight: 800, color: C.text,
                border: `2px solid ${digit ? C.gold : C.border}`,
                borderRadius: 12, background: C.white, outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          ))}
        </div>

        <GoldBtn onClick={handleVerify} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify & Continue →'}
        </GoldBtn>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {resendTimer > 0 ? (
            <span style={{ color: C.subtle, fontSize: 13 }}>Resend OTP in {resendTimer}s</span>
          ) : (
            <span onClick={handleResend}
              style={{ color: C.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Resend OTP
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
