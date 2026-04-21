/**
 * VI V3 — Success + Failure payment screens
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { analytics } from '../utils/analytics'
import { C, G } from '../constants/colors'

export function SuccessScreen() {
  const navigate = useNavigate()
  const { state } = useApp()

  useEffect(() => {
    analytics.paymentSuccess(state.userId, 0, '')
    const t = setTimeout(() => navigate('/dashboard'), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'linear-gradient(160deg, #0A1A0A, #0A0A0F)', padding:32, textAlign:'center' }}>
      <div style={{ fontSize:72, marginBottom:20, animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
        🎉
      </div>
      <div style={{ color:'#22C55E', fontSize:14, fontWeight:700, letterSpacing:2, marginBottom:8 }}>
        PAYMENT SUCCESSFUL
      </div>
      <div style={{ color:'white', fontSize:24, fontWeight:800, marginBottom:10 }}>
        Your VI Stack Is Ordered!
      </div>
      <div style={{ color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.6,
        maxWidth:280, marginBottom:32 }}>
        We'll dispatch your package within 24 hours. Track delivery in My Orders.
      </div>
      <div style={{ background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.3)',
        borderRadius:16, padding:'16px 24px', marginBottom:28, width:'100%', maxWidth:300 }}>
        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:8 }}>
          DAY 1 — START TODAY
        </div>
        {['Open your daily dashboard','Log your first supplement','Set your routine reminders'].map(s => (
          <div key={s} style={{ display:'flex', gap:8, marginBottom:6, textAlign:'left' }}>
            <span style={{ color:'#22C55E', fontSize:12 }}>✓</span>
            <span style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>{s}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/dashboard')}
        style={{ width:'100%', maxWidth:300, padding:'16px', borderRadius:14, border:'none',
          background: G.gold, color: C.onGold, fontSize:16, fontWeight:800,
          cursor:'pointer', boxShadow:'0 4px 20px rgba(255,215,0,0.35)' }}>
        Go to Dashboard →
      </button>
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginTop:12 }}>
        Redirecting automatically in 5 seconds...
      </p>
      <style>{`@keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}`}</style>
    </div>
  )
}

export function FailureScreen() {
  const navigate = useNavigate()
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'linear-gradient(160deg, #1A0505, #0A0A0F)', padding:32, textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:20 }}>😔</div>
      <div style={{ color:'#EF4444', fontSize:14, fontWeight:700, letterSpacing:2, marginBottom:8 }}>
        PAYMENT FAILED
      </div>
      <div style={{ color:'white', fontSize:22, fontWeight:800, marginBottom:10 }}>
        Something went wrong
      </div>
      <div style={{ color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.6,
        maxWidth:280, marginBottom:32 }}>
        Your payment was not processed. No amount was deducted.
      </div>
      <button onClick={() => navigate(-1)}
        style={{ width:'100%', maxWidth:300, padding:'16px', borderRadius:14, border:'none',
          background: G.gold, color: C.onGold, fontSize:16, fontWeight:800,
          cursor:'pointer', marginBottom:12 }}>
        Try Again →
      </button>
      <button onClick={() => navigate('/dashboard')}
        style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)',
          fontSize:14, cursor:'pointer' }}>
        Back to Dashboard
      </button>
    </div>
  )
}
