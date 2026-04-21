/**
 * VI V3 — ResultScreen (navigates to /body-avatar instead of old plan flow)
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BODY_TYPES } from '../utils/bodyTypes'
import { analytics } from '../utils/analytics'
import { SmallRing } from '../components/UI'
import { C, G } from '../constants/colors'

const SCORE_SEGMENTS = [
  { min:0,  max:35, label:'Critical', color:'#DC2626', bg:'#FEF2F2' },
  { min:35, max:55, label:'Low',      color:'#D97706', bg:'#FFFBEB' },
  { min:55, max:70, label:'Moderate', color:'#CA8A04', bg:'#FEFCE8' },
  { min:70, max:85, label:'Good',     color:'#16A34A', bg:'#F0FDF4' },
  { min:85, max:101,label:'Excellent',color:'#15803D', bg:'#F0FDF4' },
]
function getSegment(score) {
  return SCORE_SEGMENTS.find(s => score >= s.min && score < s.max) || SCORE_SEGMENTS[0]
}

export default function ResultScreen() {
  const navigate  = useNavigate()
  const { state } = useApp()
  const bt        = BODY_TYPES[state.bodyTypeId] || BODY_TYPES.PEAK_PERFORMANCE
  const seg       = getSegment(state.vitaScore)

  const [phase, setPhase] = useState(0)   // 0=scores, 1=bodytype, 2=cta

  useEffect(() => {
    analytics.quizCompleted(state.userId, state.vitaScore, state.bodyTypeId)
    const t1 = setTimeout(() => setPhase(1), 1200)
    const t2 = setTimeout(() => setPhase(2), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const scores = [
    { l:'Lifestyle', v: state.lifestyleScore,   c:'#3B82F6' },
    { l:'Physical',  v: state.physicalScore,     c:'#8B5CF6' },
    { l:'Mental',    v: state.mentalScore,       c:'#EC4899' },
    { l:'Performance',v:state.performanceScore,  c:'#F59E0B' },
  ]

  return (
    <div style={{ height:'100%', overflowY:'auto', background: C.bg, paddingBottom:100 }}>
      {/* VitaScore hero */}
      <div style={{ background: G.hero, padding:'36px 24px 28px', textAlign:'center' }}>
        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, letterSpacing:2, marginBottom:12 }}>
          YOUR VITASCORE
        </div>
        <SmallRing score={state.vitaScore} size={130} />
        <div style={{ marginTop:16 }}>
          <div style={{ color: seg.color, background: seg.bg, display:'inline-block',
            borderRadius:20, padding:'4px 16px', fontSize:14, fontWeight:700 }}>
            {seg.label}
          </div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:8 }}>
            out of 100 possible points
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px' }}>
        {/* Score breakdown */}
        <div style={{ background:'white', borderRadius:20, padding:20, marginBottom:14,
          border:`1px solid ${C.border}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ color: C.text, fontSize:15, fontWeight:700, marginBottom:14 }}>Score Breakdown</div>
          {scores.map(s => (
            <div key={s.l} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color: C.muted, fontSize:13 }}>{s.l}</span>
                <span style={{ color: C.text, fontSize:13, fontWeight:600 }}>{s.v}/25</span>
              </div>
              <div style={{ background: C.bgMid, borderRadius:6, height:8, overflow:'hidden' }}>
                <div style={{ height:'100%', background:s.c, borderRadius:6,
                  width:`${Math.min((s.v/25)*100,100)}%`,
                  transition:'width 1s ease',
                  opacity: phase >= 0 ? 1 : 0 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Body type card */}
        <div style={{ background:`${bt.color}10`, border:`2px solid ${bt.color}40`,
          borderRadius:20, padding:20, marginBottom:14,
          opacity: phase >= 1 ? 1 : 0, transition:'opacity 0.5s ease',
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(16px)',
        }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ fontSize:36 }}>{bt.icon}</div>
            <div>
              <div style={{ color: bt.color, fontSize:11, fontWeight:700,
                letterSpacing:1.5, marginBottom:3 }}>YOUR BODY TYPE</div>
              <div style={{ color: C.text, fontSize:17, fontWeight:800 }}>{bt.label}</div>
              <div style={{ color: C.muted, fontSize:13, marginTop:3 }}>{bt.shortDesc}</div>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize:13, lineHeight:1.6, marginBottom:12 }}>
            {bt.description}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {bt.coreIssues.map(i => (
              <div key={i} style={{ background: `${bt.color}15`, border:`1px solid ${bt.color}30`,
                borderRadius:20, padding:'4px 12px', color: bt.color, fontSize:11, fontWeight:600 }}>
                {i}
              </div>
            ))}
          </div>
        </div>

        {/* Timer urgency */}
        {bt.urgency !== 'MODERATE' && (
          <div style={{ background:'#1A0505', border:'1px solid #DC262620',
            borderRadius:14, padding:'12px 16px', marginBottom:14,
            display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ color:'#FCA5A5', fontSize:13, fontWeight:700 }}>
                {bt.urgency === 'CRITICAL' ? 'Critical — Immediate action needed' : 'High priority — Start soon'}
              </div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:2 }}>
                {bt.whatHappens}
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ opacity: phase >= 2 ? 1 : 0, transition:'opacity 0.5s ease',
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)' }}>
          <button onClick={() => navigate('/body-avatar')}
            style={{ width:'100%', padding:'17px', borderRadius:14, border:'none',
              background: G.gold, color: C.onGold, fontSize:16, fontWeight:800,
              cursor:'pointer', boxShadow:'0 4px 20px rgba(184,134,11,0.3)', marginBottom:10 }}>
            See Your Body Scan →
          </button>
          <p style={{ color: C.muted, fontSize:12, textAlign:'center' }}>
            Visual diagnosis of affected areas
          </p>
        </div>
      </div>
    </div>
  )
}
