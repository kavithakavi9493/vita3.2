import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../context/AppContext'
import { GoldBtn, ErrorBanner } from '../components/UI'
import { C, G } from '../constants/colors'

export default function SignupScreen() {
  const navigate      = useNavigate()
  const { update }    = useApp()
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSend = async () => {
    if (!name.trim())           return setError('Please enter your name')
    if (phone.length < 10)      return setError('Enter a valid 10-digit mobile number')
    setLoading(true); setError('')
    try {
      const auth = getAuth()
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      }
      const result = await signInWithPhoneNumber(auth, '+91' + phone, window.recaptchaVerifier)
      window.confirmationResult = result
      update({ userName: name.trim(), phone: '+91' + phone })
      navigate('/otp')
    } catch (e) {
      setError(e.message || 'Failed to send OTP')
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 6 }}>Welcome 👋</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 36 }}>Your transformation starts here</div>
        {error && <ErrorBanner message={error} />}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Full Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 15, background: C.white, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Mobile Number</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '14px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 15, flexShrink: 0 }}>+91</div>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
              placeholder="9999999999" type="tel" maxLength={10}
              style={{ flex: 1, padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 15, background: C.white, color: C.text, outline: 'none' }} />
          </div>
        </div>
        <GoldBtn onClick={handleSend} disabled={loading}>
          {loading ? 'Sending OTP...' : 'Get OTP →'}
        </GoldBtn>
        <div id="recaptcha-container" />
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: C.subtle }}>
          By continuing, you agree to our Terms & Privacy Policy
        </div>
      </div>
    </div>
  )
}
