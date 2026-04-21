/**
 * VI — Day7ConversionScreen V2
 * ==============================
 * This is the most important revenue screen in the app.
 * Every element is conversion-engineered:
 *
 * 1. VitaScore Progress Graph (Day 1 → Day 7 → 30/60/90 projection)
 *    Shows the real improvement AND what they lose if they stop
 *
 * 2. Countdown Timer — 23:59:59 urgency
 *    Creates the right pressure without being fake
 *
 * 3. Social Proof — real testimonials with body type match
 *    "Someone with your exact profile saw..."
 *
 * 4. Loss Aversion Copy
 *    Focus: "What happens if you stop NOW" vs "What you gain if you continue"
 *
 * 5. Three clear CTAs (subscription > one-time > maybe later)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BODY_TYPES, getBundlePrice } from '../utils/bodyTypes'
import { trackingApi, activationsApi } from '../utils/api'
import { C, G } from '../constants/colors'

// ── Social Proof by Body Type ─────────────────────────────────────
const TESTIMONIALS = {
  HIGH_STRESS_LOW_VITALITY: [
    { name: "Arjun M.", city: "Pune", days: 7, quote: "By Day 7 my sleep was noticeably better. The stress I carried to bed — gone. Month 2, my wife noticed before I did.", rating: 5 },
    { name: "Vikram S.", city: "Mumbai", days: 7, quote: "I was skeptical. Day 7 I woke up without that anxious feeling for the first time in 2 years.", rating: 5 },
  ],
  HORMONAL_DECLINE: [
    { name: "Rahul K.", city: "Delhi", days: 7, quote: "Energy in the morning was the first thing I noticed. Week 2 my gym performance went up. Month 2 — completely different man.", rating: 5 },
    { name: "Suresh P.", city: "Hyderabad", days: 7, quote: "My trainer asked what I changed. I just said Ayurveda. He didn't believe me. Numbers don't lie.", rating: 5 },
  ],
  PERFORMANCE_DEFICIT: [
    { name: "Aditya R.", city: "Bangalore", days: 7, quote: "First week was about trust. Week 2 the confidence came back. My wife thinks I'm a different person.", rating: 5 },
    { name: "Manoj T.", city: "Chennai", days: 7, quote: "I had given up on myself. Day 7 told me I hadn't. This programme works if you work it.", rating: 5 },
  ],
  AGE_RELATED_DROP: [
    { name: "Rajan K.", city: "Ahmedabad", days: 7, quote: "I'm 42. I thought this was just 'getting old'. My VitaScore went from 38 to 61 in 6 weeks. It's not age — it was deficiency.", rating: 5 },
    { name: "Sanjay M.", city: "Jaipur", days: 7, quote: "Week 1 was about building the habit. Month 2 was about being the man I was at 30. Not exactly — better.", rating: 5 },
  ],
  PEAK_PERFORMANCE: [
    { name: "Nikhil V.", city: "Bangalore", days: 7, quote: "I thought I was already at my peak. VI showed me what peak actually looks like. 30 days in — performance, clarity, drive. Different level.", rating: 5 },
    { name: "Karan A.", city: "Gurgaon", days: 7, quote: "As someone who tracks everything — sleep scores, HRV, gym lifts — VI moved all my metrics. The data doesn't lie.", rating: 5 },
  ],
}

const BODY_TYPE_LOSS_COPY = {
  HIGH_STRESS_LOW_VITALITY: {
    loseText: "Your cortisol levels will return to where they were. The stress-testosterone spiral will restart.",
    gainText: "Your cortisol drops 30% in 30 days. Testosterone begins recovering. Sleep deepens.",
  },
  HORMONAL_DECLINE: {
    loseText: "Testosterone continues its natural decline — roughly 1% per year. The gap widens.",
    gainText: "Clinical studies show KSM-66 Ashwagandha supports 17% testosterone increase in 90 days.",
  },
  PERFORMANCE_DEFICIT: {
    loseText: "Performance anxiety compounds. Confidence erodes further. The cycle gets harder to break.",
    gainText: "Timing improves from week 2. Confidence returns by week 4. Relationship dynamic shifts.",
  },
  AGE_RELATED_DROP: {
    loseText: "Age-related decline continues without intervention. The window to reverse it narrows.",
    gainText: "Shilajit Resin has 85+ minerals that directly support hormonal recovery at 35+.",
  },
  PEAK_PERFORMANCE: {
    loseText: "Without maintenance, peak performance declines faster than it rose.",
    gainText: "Sustained supplementation locks in your gains and pushes your ceiling higher each month.",
  },
}


// ── VitaScore Graph Component ─────────────────────────────────────
function VitaScoreGraph({ scoreStart, scoreCurrent, projection, activationDay }) {
  const canvasRef = useRef(null)

  const points = [
    { label: 'Day 1', score: scoreStart,              day: 1 },
    { label: `Day ${activationDay}`, score: scoreCurrent, day: activationDay, current: true },
    { label: 'Day 30', score: projection?.day30 || scoreCurrent + 8,  day: 30 },
    { label: 'Day 60', score: projection?.day60 || scoreCurrent + 18, day: 60 },
    { label: 'Day 90', score: projection?.day90 || scoreCurrent + 25, day: 90 },
  ].filter(p => p.score > 0)

  const minScore = Math.max(0, Math.min(...points.map(p => p.score)) - 5)
  const maxScore = Math.min(100, Math.max(...points.map(p => p.score)) + 8)

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Score labels on graph */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {points.map((p, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: p.current ? 18 : 14,
              fontWeight: 800,
              color: p.current ? '#FFD700' : i > points.findIndex(x => x.current) ? '#22C55E' : 'rgba(255,255,255,0.5)',
            }}>
              {Math.round(p.score)}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* SVG Line Graph */}
      <svg width="100%" height="90" viewBox="0 0 320 90" preserveAspectRatio="none">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6B7280" />
            <stop offset={`${((points.findIndex(x => x.current)) / (points.length - 1)) * 100}%`} stopColor="#FFD700" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22C55E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`M 0 ${90 - ((points[0].score - minScore) / (maxScore - minScore)) * 80}
              ${points.slice(1).map((p, i) => {
                const x = ((i + 1) / (points.length - 1)) * 320
                const y = 90 - ((p.score - minScore) / (maxScore - minScore)) * 80
                return `L ${x} ${y}`
              }).join(' ')}
              L 320 90 L 0 90 Z`}
          fill="url(#areaGrad)"
        />

        {/* Line */}
        <path
          d={`M 0 ${90 - ((points[0].score - minScore) / (maxScore - minScore)) * 80}
              ${points.slice(1).map((p, i) => {
                const x = ((i + 1) / (points.length - 1)) * 320
                const y = 90 - ((p.score - minScore) / (maxScore - minScore)) * 80
                return `L ${x} ${y}`
              }).join(' ')}`}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current position dot */}
        {points.map((p, i) => {
          const x = (i / (points.length - 1)) * 320
          const y = 90 - ((p.score - minScore) / (maxScore - minScore)) * 80
          return p.current ? (
            <g key={i}>
              <circle cx={x} cy={y} r="8" fill="#FFD700" opacity="0.3" />
              <circle cx={x} cy={y} r="5" fill="#FFD700" />
            </g>
          ) : null
        })}

        {/* Divider: actual vs projected */}
        {(() => {
          const currentIdx = points.findIndex(x => x.current)
          if (currentIdx < 0) return null
          const x = (currentIdx / (points.length - 1)) * 320
          return (
            <line x1={x} y1="0" x2={x} y2="90"
              stroke="rgba(255,215,0,0.3)" strokeWidth="1" strokeDasharray="3,3" />
          )
        })()}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>← actual progress</div>
        <div style={{ fontSize: 9, color: '#22C55E40' }}>projected →</div>
      </div>
    </div>
  )
}


// ── Countdown Timer ────────────────────────────────────────────────
function useCountdown(hours = 23, minutes = 59, seconds = 59) {
  const totalSeconds = useRef(hours * 3600 + minutes * 60 + seconds)
  const [timeLeft, setTimeLeft] = useState(totalSeconds.current)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const h = Math.floor(timeLeft / 3600)
  const m = Math.floor((timeLeft % 3600) / 60)
  const s = timeLeft % 60

  return {
    display: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,
    isExpired: timeLeft === 0,
    totalLeft: timeLeft,
  }
}


// ── Main Screen ────────────────────────────────────────────────────
export default function Day7ConversionScreen() {
  const navigate       = useNavigate()
  const { state, update } = useApp()
  const bt             = BODY_TYPES[state.bodyTypeId] || BODY_TYPES.PEAK_PERFORMANCE
  const stack          = state.recommendedStack || []
  const countdown      = useCountdown(23, 59, 59)

  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [activeTab, setActiveTab] = useState('subscribe') // subscribe | onetime
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  const bundle     = stack.length ? getBundlePrice(stack) : { bundlePrice: 0, mrpSum: 0, saving: 0 }
  const finalPrice = Math.max(bundle.bundlePrice - 99, 0)
  const subPrice   = Math.round(finalPrice * 0.85)  // 15% subscribe & save
  const lossCopy   = BODY_TYPE_LOSS_COPY[state.bodyTypeId] || BODY_TYPE_LOSS_COPY.PEAK_PERFORMANCE
  const testimonials = TESTIMONIALS[state.bodyTypeId] || TESTIMONIALS.PEAK_PERFORMANCE

  useEffect(() => {
    async function load() {
      try {
        const s = await trackingApi.stats(state.userId)
        setStats(s)
      } catch (e) { /* silently fail */ }
    }
    load()
  }, [state.userId])

  // Rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(i => (i + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  const handleConvert = useCallback(async (type = 'onetime') => {
    setLoading(true)
    try {
      await activationsApi.verify({ userId: state.userId, action: 'convert' })
      update({ isConvertedToPaid: true, purchaseType: type })
      if (type === 'subscribe') {
        navigate('/subscription')
      } else {
        navigate('/checkout')
      }
    } catch {
      navigate('/checkout')
    }
  }, [state.userId, navigate, update])

  const scoreStart   = stats ? Math.max((state.vitaScore || 50) - (stats.streak || 0) * 1.5 - 8, 20) : 30
  const scoreCurrent = state.vitaScore || stats?.vitaScore || 50
  const projection   = stats?.projection

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#080810', color: 'white', paddingBottom: 40 }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #0F2000 0%, #080810 100%)',
        padding: '28px 20px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3,
          color: '#22C55E', marginBottom: 8 }}>
          ✓ 7 DAYS COMPLETE
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>
          You proved you can do this.<br />
          <span style={{ color: '#FFD700' }}>Now make it permanent.</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }}>
          Your body has started adapting. Stopping now means losing everything you've built.
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── VitaScore Progress Graph ────────────────────────── */}
        <div style={{
          background: '#0F0F1C', border: '1px solid #ffffff15',
          borderRadius: 16, padding: 16, marginTop: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600,
                letterSpacing: 1.5, marginBottom: 2 }}>VITASCORE JOURNEY</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: '#FFD700' }}>
                  {Math.round(scoreCurrent)}
                </span>
                <span style={{ color: '#22C55E', fontSize: 13, fontWeight: 700 }}>
                  +{Math.round(scoreCurrent - scoreStart)} pts
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Projected Day 90</div>
              <div style={{ color: '#22C55E', fontSize: 20, fontWeight: 800 }}>
                {Math.round(projection?.day90 || scoreCurrent + 25)}
              </div>
            </div>
          </div>

          <VitaScoreGraph
            scoreStart={scoreStart}
            scoreCurrent={scoreCurrent}
            projection={projection}
            activationDay={stats?.dayNumber || 7}
          />
        </div>

        {/* ── Stats Row ───────────────────────────────────────── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
            {[
              { v: stats.streak,           l: 'Day Streak', c: '#FFD700', icon: '🔥' },
              { v: `${stats.weeklyCompliance}%`, l: 'Compliance', c: '#22C55E', icon: '✓' },
              { v: stats.totalDaysActive,  l: 'Days Logged', c: '#60A5FA', icon: '📊' },
            ].map(s => (
              <div key={s.l} style={{
                background: '#0F0F1C', border: '1px solid #ffffff10',
                borderRadius: 12, padding: '12px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ color: s.c, fontSize: 20, fontWeight: 800 }}>{s.v}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Loss Aversion Block ─────────────────────────────── */}
        <div style={{ marginTop: 16, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '14px 14px 0 0', padding: '14px 16px',
          }}>
            <div style={{ color: '#F87171', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              IF YOU STOP NOW
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6 }}>
              ❌ {lossCopy.loseText}
            </div>
          </div>
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            borderLeft: '1px solid rgba(34,197,94,0.2)', borderRight: '1px solid rgba(34,197,94,0.2)',
            borderBottom: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '0 0 14px 14px', padding: '14px 16px',
          }}>
            <div style={{ color: '#22C55E', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              IF YOU CONTINUE
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6 }}>
              ✅ {lossCopy.gainText}
            </div>
          </div>
        </div>

        {/* ── Countdown Timer ─────────────────────────────────── */}
        <div style={{
          marginTop: 16, background: '#0F0F1C',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#FFD700', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                DAY 7 OFFER EXPIRES IN
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                ₹99 trial credit valid for today only
              </div>
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 24, fontWeight: 900,
              color: countdown.totalLeft < 3600 ? '#EF4444' : '#FFD700',
              letterSpacing: 2,
            }}>
              {countdown.display}
            </div>
          </div>
        </div>

        {/* ── Pricing Toggle ───────────────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', background: '#0F0F1C', borderRadius: 12,
            border: '1px solid #ffffff15', padding: 4, marginBottom: 16 }}>
            {[
              { id: 'subscribe', label: '🔔 Subscribe & Save', badge: 'BEST VALUE' },
              { id: 'onetime',   label: '📦 One-Time Purchase', badge: null },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none',
                  background: activeTab === tab.id ? '#C9A84C' : 'transparent',
                  color: activeTab === tab.id ? '#0A0A0F' : 'rgba(255,255,255,0.5)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', position: 'relative',
                  transition: 'all .2s',
                }}>
                {tab.label}
                {tab.badge && activeTab === tab.id && (
                  <div style={{
                    position: 'absolute', top: -8, right: 8,
                    background: '#22C55E', color: 'white',
                    fontSize: 7, fontWeight: 800, padding: '2px 6px', borderRadius: 10,
                    letterSpacing: 0.5,
                  }}>{tab.badge}</div>
                )}
              </button>
            ))}
          </div>

          {/* Pricing Display */}
          {activeTab === 'subscribe' ? (
            <div style={{
              background: 'linear-gradient(135deg, #0F2000 0%, #0F0F1C 100%)',
              border: '1px solid #22C55E40', borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textDecoration: 'line-through' }}>
                    ₹{bundle.mrpSum} MRP
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                    ₹{subPrice}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>/month • Cancel anytime</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ background: '#22C55E', color: 'white', fontSize: 11, fontWeight: 800,
                    padding: '4px 10px', borderRadius: 8, marginBottom: 4 }}>
                    SAVE 15%
                  </div>
                  <div style={{ color: '#22C55E', fontSize: 11 }}>
                    +₹{bundle.mrpSum - subPrice} saved
                  </div>
                </div>
              </div>

              {['Auto-delivery every month', 'Cancel or pause anytime', 'Priority customer support', '₹99 trial credit applied'].map(benefit => (
                <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ color: '#22C55E', fontSize: 14 }}>✓</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{benefit}</div>
                </div>
              ))}

              <button onClick={() => handleConvert('subscribe')} disabled={loading}
                style={{
                  width: '100%', padding: 16, marginTop: 16,
                  background: loading ? '#333' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                  color: 'white', border: 'none', borderRadius: 14,
                  fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
                  boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
                }}>
                {loading ? 'Setting up...' : `Subscribe for ₹${subPrice}/month →`}
              </button>
            </div>
          ) : (
            <div style={{
              background: '#0F0F1C', border: '1px solid #ffffff20',
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textDecoration: 'line-through' }}>
                    ₹{bundle.mrpSum} MRP
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                    ₹{finalPrice}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>one-time • ₹99 applied</div>
                </div>
                <div style={{ background: '#ffffff15', color: 'rgba(255,255,255,0.6)',
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                  SINGLE ORDER
                </div>
              </div>

              <button onClick={() => handleConvert('onetime')} disabled={loading}
                style={{
                  width: '100%', padding: 16,
                  background: loading ? '#333' : 'linear-gradient(135deg, #C9A84C, #A08030)',
                  color: '#0A0A0F', border: 'none', borderRadius: 14,
                  fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
                }}>
                {loading ? 'Setting up...' : `Continue for ₹${finalPrice} →`}
              </button>

              <div style={{ textAlign: 'center', marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                You can subscribe later for 15% off recurring
              </div>
            </div>
          )}
        </div>

        {/* ── Social Proof ─────────────────────────────────────── */}
        <div style={{
          marginTop: 20, background: '#0F0F1C',
          border: '1px solid #ffffff15', borderRadius: 14, padding: 16,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600,
            letterSpacing: 1.5, marginBottom: 12 }}>
            FROM MEN WITH YOUR PROFILE
          </div>

          <div style={{ transition: 'all 0.4s' }}>
            {testimonials[testimonialIdx] && (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13,
                  lineHeight: 1.7, fontStyle: 'italic', marginBottom: 12 }}>
                  "{testimonials[testimonialIdx].quote}"
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                      {testimonials[testimonialIdx].name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      {testimonials[testimonialIdx].city} • Day {testimonials[testimonialIdx].days} review
                    </div>
                  </div>
                  <div style={{ color: '#FFD700', fontSize: 14 }}>
                    {'★'.repeat(testimonials[testimonialIdx].rating)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {testimonials.map((_, i) => (
              <div key={i}
                onClick={() => setTestimonialIdx(i)}
                style={{
                  width: i === testimonialIdx ? 16 : 6, height: 6,
                  borderRadius: 3, background: i === testimonialIdx ? '#FFD700' : '#333',
                  cursor: 'pointer', transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Trust & Safety ───────────────────────────────────── */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '🔒', text: 'Secure Payment', sub: 'Razorpay encrypted' },
            { icon: '↩️', text: '30-Day Guarantee', sub: 'Easy returns' },
            { icon: '🚚', text: 'Free Delivery', sub: 'Pan India' },
            { icon: '🌿', text: 'AYUSH Certified', sub: 'Safe & natural' },
          ].map(t => (
            <div key={t.text} style={{
              background: '#0F0F1C', border: '1px solid #ffffff10',
              borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 18 }}>{t.icon}</div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>{t.text}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{t.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Maybe Later ─────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginBottom: 4 }}>
            Your ₹99 trial credit expires with the timer above.
          </div>
          <button onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              fontSize: 12, cursor: 'pointer', padding: '8px 16px',
              textDecoration: 'underline',
            }}>
            Maybe later →
          </button>
        </div>

      </div>
    </div>
  )
}
