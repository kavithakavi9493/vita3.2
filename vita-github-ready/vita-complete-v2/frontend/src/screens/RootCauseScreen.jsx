/**
 * VI — RootCauseScreen
 * Displays the user's identified body type root cause with
 * a detailed breakdown of contributing factors.
 * Navigates to /body-avatar.
 */
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BODY_TYPES } from '../utils/bodyTypes'
import { GoldBtn } from '../components/UI'
import { C, G } from '../constants/colors'

const ROOT_CAUSE_DATA = {
  HIGH_STRESS_LOW_VITALITY: {
    title:   'Stress-Driven Vitality Drain',
    icon:    '🧠',
    color:   '#7C3AED',
    summary: 'Chronic stress is suppressing your testosterone and depleting your energy reserves.',
    causes: [
      { icon: '😰', label: 'Cortisol overload',     desc: 'High stress hormone is blocking testosterone production' },
      { icon: '😴', label: 'Poor recovery',         desc: 'Your body isn\'t repairing overnight as it should' },
      { icon: '⚡', label: 'Depleted energy stores', desc: 'Adrenal fatigue from sustained stress response' },
    ],
    solution: 'Your protocol will focus on cortisol control, deep sleep, and stress-protective adaptogens.',
  },
  HORMONAL_DECLINE: {
    title:   'Hormonal Imbalance',
    icon:    '⚗️',
    color:   '#DC2626',
    summary: 'Your testosterone and key hormones are declining, affecting energy, drive, and performance.',
    causes: [
      { icon: '📉', label: 'Low testosterone',      desc: 'Primary male hormone dropping below optimal levels' },
      { icon: '🔥', label: 'Reduced libido',        desc: 'Hormonal imbalance directly impacts sexual desire' },
      { icon: '💤', label: 'Sleep disruption',      desc: 'Poor sleep further suppresses hormone production' },
    ],
    solution: 'Your protocol will restore testosterone naturally with proven Ayurvedic compounds.',
  },
  PERFORMANCE_DEFICIT: {
    title:   'Performance & Circulation Issue',
    icon:    '⚡',
    color:   '#B8860B',
    summary: 'Blood flow and neurovascular function are affecting your intimate performance.',
    causes: [
      { icon: '🩸', label: 'Reduced blood flow',    desc: 'Circulation to key areas is compromised' },
      { icon: '⏱️', label: 'Timing challenges',     desc: 'Neural pathways affecting control and duration' },
      { icon: '😟', label: 'Performance anxiety',   desc: 'Mental pressure compounding physical issues' },
    ],
    solution: 'Your protocol targets blood flow, vascular health, and confidence simultaneously.',
  },
  AGE_RELATED_DROP: {
    title:   'Age-Related Hormone Decline',
    icon:    '👑',
    color:   '#15803D',
    summary: 'Natural age-related changes are reducing your testosterone and overall vitality.',
    causes: [
      { icon: '📅', label: 'Natural andropause',    desc: 'Testosterone declines ~1% per year after 30' },
      { icon: '💪', label: 'Muscle & energy loss',  desc: 'Reduced anabolic hormones affecting physique' },
      { icon: '🔋', label: 'Recovery slowdown',     desc: 'Cellular repair and regeneration taking longer' },
    ],
    solution: 'Your age-reversal protocol combines the most potent Ayurvedic testosterone restorers.',
  },
  PEAK_PERFORMANCE: {
    title:   'Optimisation Opportunity',
    icon:    '🏆',
    color:   '#B8860B',
    summary: 'You have a strong foundation. The goal is to take your performance to the next level.',
    causes: [
      { icon: '📈', label: 'Headroom for growth',   desc: 'Your baseline is good — optimisation will show fast results' },
      { icon: '⚡', label: 'Fine-tuning needed',    desc: 'Small improvements in key areas yield big results' },
      { icon: '🔬', label: 'Prevention first',      desc: 'Getting ahead of age-related decline now is smart' },
    ],
    solution: 'Your optimisation stack will enhance what\'s already working and elevate every area.',
  },
}

export default function RootCauseScreen() {
  const navigate    = useNavigate()
  const { state }   = useApp()
  const bodyTypeId  = state.bodyTypeId || 'PEAK_PERFORMANCE'
  const bodyType    = BODY_TYPES[bodyTypeId] || BODY_TYPES['PEAK_PERFORMANCE']
  const data        = ROOT_CAUSE_DATA[bodyTypeId] || ROOT_CAUSE_DATA['PEAK_PERFORMANCE']

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Dark hero header */}
      <div style={{ padding: '28px 20px 24px', background: G.hero }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 10 }}>
          ROOT CAUSE IDENTIFIED
        </div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{data.icon}</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#F0D080', lineHeight: 1.3, marginBottom: 8 }}>
          {data.title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          {data.summary}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {/* Contributing factors */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          What's causing this
        </div>

        {data.causes.map((cause, i) => (
          <div key={i} style={{
            display: 'flex', gap: 14, padding: '14px 16px', marginBottom: 10,
            background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{cause.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{cause.label}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{cause.desc}</div>
            </div>
          </div>
        ))}

        {/* Solution preview */}
        <div style={{
          marginTop: 8, padding: '16px',
          background: 'linear-gradient(135deg, #1A0E00, #2C1810)',
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,215,0,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            VI Protocol
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
            {data.solution}
          </div>
        </div>

        {/* VitaScore chip */}
        <div style={{
          marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 16px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
        }}>
          <span style={{ fontSize: 13, color: C.muted }}>Your VitaScore</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>{state.vitaScore || 0}</span>
          <span style={{ fontSize: 13, color: C.subtle }}>/100</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 32px', borderTop: `1px solid ${C.border}`, background: C.white }}>
        <GoldBtn onClick={() => navigate('/body-avatar')}>
          See Your Body Map →
        </GoldBtn>
      </div>
    </div>
  )
}
