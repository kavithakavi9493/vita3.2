/**
 * VI V3 — ActivationScreen
 * ₹99 seven-day activation with Razorpay integration.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { useApp } from '../context/AppContext'
import { activationsApi, openRazorpay } from '../utils/api'
import { BODY_TYPES } from '../utils/bodyTypes'
import { C, G } from '../constants/colors'

const FEATURES = [
  { icon: '🧬', title: 'Full Body Analysis',     desc: 'Complete diagnosis with organ-level breakdown' },
  { icon: '📋', title: 'Daily Protocol',          desc: 'Personalised supplement routine timed to your schedule' },
  { icon: '🔥', title: 'Streak Tracking',         desc: 'Daily habit building with progress visualization' },
  { icon: '📊', title: 'Weekly Report',           desc: 'VitaScore evolution and milestone tracking' },
  { icon: '💬', title: 'Expert Content Library',  desc: 'Videos, guides & Ayurvedic wisdom' },
  { icon: '📦', title: 'Day 7 Stack Delivery',    desc: 'Physical product stack ordered at Day 7 (₹99 adjusted)' },
]

const TESTIMONIALS = [
  { name: 'Rahul M.',  age: 34, text: 'The ₹99 trial changed how I think about this. By day 4 I was already tracking and committed.', stars: 5 },
  { name: 'Vikram S.', age: 41, text: 'Never expected a ₹99 app unlock to show me this much about my body. The avatar scan was eye-opening.', stars: 5 },
]

export default function ActivationScreen() {
  const navigate    = useNavigate()
  const { state, update } = useApp()
  const bt = BODY_TYPES[state.bodyTypeId] || BODY_TYPES.PEAK_PERFORMANCE

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [counter,  setCounter]  = useState(147)   // urgency counter

  // Urgency counter ticks down
  useEffect(() => {
    const t = setInterval(() => setCounter(c => Math.max(c - 1, 82)), 8000)
    return () => clearInterval(t)
  }, [])

  async function handleActivate() {
    setError(''); setLoading(true)
    try {
      const auth  = getAuth()
      const token = await auth.currentUser?.getIdToken()
      const { razorpayOrderId, amount } = await activationsApi.createOrder(state.userId, token)

      openRazorpay({
        orderId:   razorpayOrderId,
        amount,
        userName:  state.userName,
        phone:     state.phone,
        email:     state.email,
        onSuccess: async (resp) => {
          try {
            const verifyRes = await activationsApi.verify({
              userId:            state.userId,
              razorpayOrderId:   resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }, token)
            update({
              isActivated:      true,
              activationExpiry: verifyRes.expiresAt,
              activationDay:    1,
            })
            navigate('/dashboard')
          } catch (e) {
            setError('Payment received but activation failed. Contact support.')
          }
        },
        onFailure: () => {
          setError('Payment cancelled. Try again.')
          setLoading(false)
        },
      })
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0A0A0F', color: 'white', paddingBottom: 32 }}>

      {/* Hero */}
      <div style={{ padding: '28px 20px 20px', textAlign: 'center',
        background: 'linear-gradient(180deg, #1A0E00 0%, #0A0A0F 100%)' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>⚡</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          7-Day Transformation
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 280, margin: '0 auto 16px' }}>
          Unlock your personalised protocol for just ₹99. See real change in 7 days.
        </div>

        {/* Price block */}
        <div style={{
          background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 20, padding: '16px 24px', display: 'inline-block', marginBottom: 16,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'line-through', marginBottom: 2 }}>
            Regular price ₹499
          </div>
          <div style={{ color: '#FFD700', fontSize: 42, fontWeight: 900, lineHeight: 1 }}>₹99</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
            Launch price · 80% OFF
          </div>
        </div>

        {/* Urgency */}
        <div style={{
          background: '#1A0505', border: '1px solid #DC2626',
          borderRadius: 10, padding: '8px 16px', display: 'inline-flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: '#DC2626', fontSize: 12 }}>🔥</span>
          <span style={{ color: '#FCA5A5', fontSize: 12, fontWeight: 600 }}>
            {counter} men activated this today
          </span>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Body type banner */}
        <div style={{
          background: `${bt.color}15`, border: `1px solid ${bt.color}40`,
          borderRadius: 14, padding: '12px 16px', marginBottom: 20, marginTop: 16,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span style={{ fontSize: 24 }}>{bt.icon}</span>
          <div>
            <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{bt.label} Protocol</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              Customised for your exact diagnosis
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600,
            letterSpacing: 1.5, marginBottom: 12 }}>WHAT YOU UNLOCK</div>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{f.icon}</div>
              <div>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600,
            letterSpacing: 1.5, marginBottom: 12 }}>MEN WHO ACTIVATED</div>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{
              background: '#111118', borderRadius: 14, padding: '14px',
              marginBottom: 10, border: '1px solid #ffffff10',
            }}>
              <div style={{ color: '#FFD700', fontSize: 12, marginBottom: 6 }}>
                {'★'.repeat(t.stars)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontStyle: 'italic',
                lineHeight: 1.5, marginBottom: 8 }}>"{t.text}"</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                — {t.name}, {t.age}
              </div>
            </div>
          ))}
        </div>

        {/* 7-day timeline */}
        <div style={{ background: '#111118', borderRadius: 16, padding: '16px', marginBottom: 24 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
            letterSpacing: 1.5, marginBottom: 12 }}>YOUR 7-DAY JOURNEY</div>
          {[
            { day: 'Day 1', label: 'Diagnosis + Protocol Setup' },
            { day: 'Day 2', label: 'First habit loop begins' },
            { day: 'Day 3', label: 'Energy check-in' },
            { day: 'Day 5', label: 'Mid-week progress report' },
            { day: 'Day 7', label: '🎯 Convert → full stack arrives' },
          ].map((d, i) => (
            <div key={d.day} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: d.day === 'Day 7' ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${d.day === 'Day 7' ? '#FFD700' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: d.day === 'Day 7' ? '#FFD700' : 'rgba(255,255,255,0.6)',
              }}>D{i + 1}</div>
              <div>
                <div style={{ color: d.day === 'Day 7' ? '#FFD700' : 'white', fontSize: 12, fontWeight: 600 }}>
                  {d.day}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{d.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#2A0000', border: '1px solid #DC2626', borderRadius: 10,
            padding: '10px 14px', marginBottom: 14, color: '#FCA5A5', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleActivate}
          disabled={loading}
          style={{
            width: '100%', padding: '17px', borderRadius: 14, border: 'none',
            background: loading ? '#555' : 'linear-gradient(135deg, #FFD700, #B8860B)',
            color: '#1A0E00', fontSize: 16, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 6px 24px rgba(255,215,0,0.35)',
          }}
        >
          {loading ? 'Processing...' : 'Activate Now — ₹99'}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          Secure payment via Razorpay · No auto-renewal · Cancel anytime
        </p>
      </div>
    </div>
  )
}
