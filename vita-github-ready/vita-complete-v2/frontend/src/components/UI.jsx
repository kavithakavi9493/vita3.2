/**
 * VI V3 — UI Component Library
 * Includes LockedFeature overlay for post-trial locking.
 */
import { useNavigate } from 'react-router-dom'
import { C, G } from '../constants/colors'

// ── Screen wrapper ────────────────────────────────────────
export function ScreenWrapper({ children, style = {} }) {
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      overflowY:'auto', background: C.bg, ...style }}>
      {children}
    </div>
  )
}

// ── Gold button ───────────────────────────────────────────
export function GoldBtn({ children, onClick, disabled, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', padding:'16px', borderRadius:14, border:'none',
      background: disabled ? '#ccc' : G.gold,
      color: C.onGold, fontSize:16, fontWeight:800,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 16px rgba(184,134,11,0.3)',
      ...style,
    }}>
      {children}
    </button>
  )
}

// ── Section title ─────────────────────────────────────────
export function SectionTitle({ children }) {
  return (
    <div style={{ color: C.muted, fontSize:11, fontWeight:700,
      letterSpacing:1.5, marginBottom:10 }}>
      {children}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style={} }) {
  return (
    <div style={{ background:'white', borderRadius:20, padding:20,
      border:`1px solid ${C.border}`,
      boxShadow:'0 2px 12px rgba(0,0,0,0.06)', ...style }}>
      {children}
    </div>
  )
}

// ── VitaScore ring ────────────────────────────────────────
export function SmallRing({ score = 0, size = 90 }) {
  const r = size * 0.38, circ = 2 * Math.PI * r, progress = Math.min(score/100, 1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth={size*0.06} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#FFD700" strokeWidth={size*0.06}
        strokeDasharray={`${circ*progress} ${circ}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+5} textAnchor="middle"
        fontSize={size*0.25} fontWeight="800" fill="#FFD700">{score}</text>
    </svg>
  )
}

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ value, onChange, label, sub }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0' }}>
      <div>
        <div style={{ color: C.text, fontSize:14, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ color: C.muted, fontSize:12, marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{
        width:46, height:26, borderRadius:13, cursor:'pointer',
        background: value ? C.gold : C.border, transition:'background .2s',
        position:'relative',
      }}>
        <div style={{
          width:20, height:20, borderRadius:'50%', background:'white',
          position:'absolute', top:3,
          left: value ? 23 : 3, transition:'left .2s',
          boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'12px 0' }}>
      <div style={{ flex:1, height:1, background: C.border }} />
      {label && <span style={{ color: C.subtle, fontSize:11 }}>{label}</span>}
      <div style={{ flex:1, height:1, background: C.border }} />
    </div>
  )
}

// ── Loading spinner ───────────────────────────────────────
export function Spinner({ size = 40, color = C.gold }) {
  return (
    <div style={{ width:size, height:size, border:`${size*0.1}px solid ${color}30`,
      borderTopColor: color, borderRadius:'50%',
      animation:'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Error banner ──────────────────────────────────────────
export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
      padding:'10px 14px', marginBottom:14, color:'#DC2626', fontSize:13,
      display:'flex', gap:8, alignItems:'flex-start' }}>
      <span>⚠️</span><span>{message}</span>
    </div>
  )
}

// ── 🔒 LOCKED FEATURE OVERLAY (post-7-day trial) ─────────
export function LockedFeature({ message = "Your progress is paused. Continue your 30-day program to unlock full tracking." }) {
  const navigate = useNavigate()
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:50,
      background:'rgba(10,10,15,0.85)',
      backdropFilter:'blur(4px)',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:32, textAlign:'center',
    }}>
      <div style={{ fontSize:44, marginBottom:16 }}>🔒</div>
      <div style={{ color:'white', fontSize:17, fontWeight:700, marginBottom:10 }}>
        Progress Paused
      </div>
      <div style={{ color:'rgba(255,255,255,0.65)', fontSize:14, lineHeight:1.6,
        maxWidth:280, marginBottom:24 }}>
        {message}
      </div>
      <button onClick={() => navigate('/upgrade')} style={{
        padding:'14px 28px', borderRadius:14, border:'none',
        background: G.gold, color: C.onGold,
        fontSize:15, fontWeight:800, cursor:'pointer',
        boxShadow:'0 4px 20px rgba(255,215,0,0.35)',
      }}>
        Continue 30-Day Program →
      </button>
      <button onClick={() => navigate('/product-stack')} style={{
        marginTop:12, background:'none', border:'none',
        color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer',
      }}>
        View products
      </button>
    </div>
  )
}
