import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BODY_TYPES, ZONES } from '../utils/bodyTypes'
import { C, G } from '../constants/colors'

// ── Animated SVG Body Avatar ──────────────────────────────
function BodyAvatar({ bodyTypeId, scanDone, showZones }) {
  const bt     = BODY_TYPES[bodyTypeId] || BODY_TYPES.PEAK_PERFORMANCE
  const zones  = bt.zones

  const zoneActive = (z) => zones.includes(z) && showZones
  const zColor     = (z) => zoneActive(z) ? ZONES[z].color  : 'transparent'
  const zGlow      = (z) => zoneActive(z) ? ZONES[z].glow   : 'transparent'
  const opacity    = (z) => zoneActive(z) ? 1 : 0

  const bodyFill = '#F4D0A8'
  const bodyStroke = '#C8A882'

  return (
    <div style={{ position: 'relative', width: 200, height: 460, margin: '0 auto' }}>
      {/* Scan line animation */}
      {!scanDone && (
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10,
          background: 'linear-gradient(90deg, transparent, #00CFFF, transparent)',
          boxShadow: '0 0 12px #00CFFF',
          animation: 'scanLine 2.2s linear forwards',
        }} />
      )}

      <svg viewBox="0 0 200 460" width="200" height="460" style={{ overflow: 'visible' }}>
        <defs>
          {/* Zone glow filters */}
          {Object.entries(ZONES).map(([id, z]) => (
            <filter key={id} id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
          {/* Pulse animation filter */}
          <filter id="pulse-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Body silhouette ───────────────────────────── */}
        {/* Head */}
        <ellipse cx="100" cy="48" rx="30" ry="34"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Neck */}
        <rect x="90" y="80" width="20" height="18" rx="4"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Shoulders */}
        <path d="M 55 100 Q 48 108 46 125 L 60 127 Q 62 115 68 110 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        <path d="M 145 100 Q 152 108 154 125 L 140 127 Q 138 115 132 110 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Torso */}
        <path d="M 68 98 Q 60 105 58 160 Q 57 210 62 240 L 138 240 Q 143 210 142 160 Q 140 105 132 98 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Left arm */}
        <path d="M 58 102 Q 44 128 41 175 Q 40 195 44 210 L 54 207 Q 50 192 52 172 Q 55 130 66 108 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Left forearm / hand */}
        <path d="M 44 210 Q 42 230 44 248 Q 46 255 50 255 L 54 248 Q 52 238 53 218 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Right arm */}
        <path d="M 142 102 Q 156 128 159 175 Q 160 195 156 210 L 146 207 Q 150 192 148 172 Q 145 130 134 108 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Right forearm / hand */}
        <path d="M 156 210 Q 158 230 156 248 Q 154 255 150 255 L 146 248 Q 148 238 147 218 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Hips */}
        <path d="M 62 238 Q 58 256 60 272 L 140 272 Q 142 256 138 238 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Left leg */}
        <path d="M 62 270 Q 58 310 58 350 Q 58 390 60 420 L 78 420 Q 80 390 80 350 Q 80 310 82 270 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Left foot */}
        <ellipse cx="70" cy="426" rx="12" ry="6"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Right leg */}
        <path d="M 118 270 Q 120 310 120 350 Q 120 390 122 420 L 140 420 Q 142 390 142 350 Q 142 310 138 270 Z"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
        {/* Right foot */}
        <ellipse cx="130" cy="426" rx="12" ry="6"
          fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />

        {/* ── Organ zones (appear after scan) ─────────── */}

        {/* BRAIN zone */}
        <g style={{ opacity: opacity('brain'), transition: 'opacity 0.8s ease 0.2s' }}>
          <ellipse cx="100" cy="40" rx="20" ry="22"
            fill={zColor('brain')} fillOpacity="0.35"
            stroke={zGlow('brain')} strokeWidth="2"
            filter="url(#glow-brain)"
            style={zoneActive('brain') ? { animation: 'orgPulse 2s ease-in-out infinite' } : {}} />
          <text x="100" y="44" textAnchor="middle" fontSize="14">🧠</text>
        </g>

        {/* HEART zone */}
        <g style={{ opacity: opacity('heart'), transition: 'opacity 0.8s ease 0.5s' }}>
          <ellipse cx="91" cy="140" rx="14" ry="16"
            fill={zColor('heart')} fillOpacity="0.4"
            stroke={zGlow('heart')} strokeWidth="2"
            filter="url(#glow-heart)"
            style={zoneActive('heart') ? { animation: 'orgPulse 1.4s ease-in-out infinite' } : {}} />
          <text x="91" y="144" textAnchor="middle" fontSize="11">❤️</text>
        </g>

        {/* ADRENAL zone (above kidneys / mid-back area) */}
        <g style={{ opacity: opacity('adrenal'), transition: 'opacity 0.8s ease 0.7s' }}>
          <ellipse cx="100" cy="185" rx="22" ry="16"
            fill={zColor('adrenal')} fillOpacity="0.35"
            stroke={zGlow('adrenal')} strokeWidth="2"
            filter="url(#glow-adrenal)"
            style={zoneActive('adrenal') ? { animation: 'orgPulse 2.2s ease-in-out infinite' } : {}} />
          <text x="100" y="189" textAnchor="middle" fontSize="11">⚗️</text>
        </g>

        {/* REPRODUCTIVE zone */}
        <g style={{ opacity: opacity('reproductive'), transition: 'opacity 0.8s ease 1s' }}>
          <ellipse cx="100" cy="255" rx="20" ry="14"
            fill={zColor('reproductive')} fillOpacity="0.4"
            stroke={zGlow('reproductive')} strokeWidth="2"
            filter="url(#glow-reproductive)"
            style={zoneActive('reproductive') ? { animation: 'orgPulse 1.8s ease-in-out infinite' } : {}} />
          <text x="100" y="259" textAnchor="middle" fontSize="11">🔥</text>
        </g>

        {/* PEAK PERFORMANCE — full body green aura */}
        {bt.id === 'PEAK_PERFORMANCE' && showZones && (
          <rect x="45" y="14" width="110" height="420" rx="55"
            fill="none" stroke="#22C55E" strokeWidth="3" strokeOpacity="0.5"
            style={{ animation: 'orgPulse 2s ease-in-out infinite' }} />
        )}

        {/* Zone callout lines + labels */}
        {showZones && zones.map((z, i) => {
          const positions = {
            brain:        { lx1: 130, ly1: 40,  lx2: 158, ly2: 35,  tx: 162, ty: 38  },
            heart:        { lx1: 77,  ly1: 140, lx2: 48,  ly2: 138, tx: 8,   ty: 141 },
            adrenal:      { lx1: 122, ly1: 185, lx2: 152, ly2: 183, tx: 155, ty: 186 },
            reproductive: { lx1: 120, ly1: 255, lx2: 150, ly2: 260, tx: 153, ty: 263 },
          }
          const p = positions[z]
          if (!p) return null
          return (
            <g key={z} style={{ opacity: 1, transition: `opacity 0.5s ease ${i * 0.3 + 1.2}s` }}>
              <line x1={p.lx1} y1={p.ly1} x2={p.lx2} y2={p.ly2}
                stroke={ZONES[z].color} strokeWidth="1.5" strokeDasharray="3,2" />
              <circle cx={p.lx2} cy={p.ly2} r="3" fill={ZONES[z].color} />
            </g>
          )
        })}
      </svg>

      {/* CSS keyframes injected via style tag */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 0;    opacity: 1; }
          90%  { top: 460px; opacity: 0.8; }
          100% { top: 460px; opacity: 0; display: none; }
        }
        @keyframes orgPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  )
}

// ── Zone Label Cards ──────────────────────────────────────
function ZoneCard({ zoneId, bodyTypeId }) {
  const z  = ZONES[zoneId]
  const bt = BODY_TYPES[bodyTypeId]
  const labels = {
    brain:        'Elevated cortisol disrupting sleep & testosterone',
    heart:        'Reduced blood flow affecting performance',
    adrenal:      'Hormonal production running below optimal',
    reproductive: 'Reproductive system requires targeted support',
  }
  return (
    <div style={{
      background: 'white', border: `1.5px solid ${z.color}30`,
      borderLeft: `3px solid ${z.color}`, borderRadius: 10,
      padding: '10px 14px', marginBottom: 8,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: z.color, marginTop: 4, flexShrink: 0,
        boxShadow: `0 0 6px ${z.glow}`, animation: 'orgPulse 2s ease-in-out infinite' }} />
      <div>
        <div style={{ color: z.color, fontSize: 12, fontWeight: 700 }}>{z.label}</div>
        <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{labels[zoneId]}</div>
      </div>
    </div>
  )
}

// ── Main Screen ───────────────────────────────────────────
export default function BodyAvatarScreen() {
  const navigate = useNavigate()
  const { state } = useApp()
  const bt = BODY_TYPES[state.bodyTypeId] || BODY_TYPES.PEAK_PERFORMANCE

  const [phase, setPhase] = useState('scanning')  // scanning → reveal → zones → cta
  const [showZones, setShowZones] = useState(false)
  const [scanDone,  setScanDone]  = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [showCta,   setShowCta]   = useState(false)

  useEffect(() => {
    // Phase sequence timed to build drama
    const t1 = setTimeout(() => { setScanDone(true);   setPhase('reveal') },    2400)
    const t2 = setTimeout(() => { setShowZones(true);  setPhase('zones')  },    2800)
    const t3 = setTimeout(() => { setShowCards(true)                       },    3600)
    const t4 = setTimeout(() => { setShowCta(true);    setPhase('cta')    },    4800)
    return () => [t1,t2,t3,t4].forEach(clearTimeout)
  }, [])

  const isPeak = bt.id === 'PEAK_PERFORMANCE'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0A0A0F', color: 'white', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>
          VI BODY SCAN
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
          {phase === 'scanning' ? '🔬 Analysing your body...' :
           phase === 'reveal'   ? '⚠️ Issues detected' :
           phase === 'zones'    ? `${bt.icon} ${bt.label}` :
                                  `Your Diagnosis Is Ready`}
        </div>
        {phase !== 'scanning' && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            VitaScore: <span style={{ color: '#FFD700', fontWeight: 700 }}>{state.vitaScore}/100</span>
          </div>
        )}
      </div>

      {/* Body avatar */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center',
        alignItems: 'flex-start', paddingTop: 12, position: 'relative' }}>

        {/* Scan background ambiance */}
        <div style={{
          position: 'absolute', inset: 0,
          background: phase === 'scanning'
            ? 'radial-gradient(ellipse at center, #001428 0%, #0A0A0F 70%)'
            : isPeak
              ? 'radial-gradient(ellipse at center, #002800 0%, #0A0A0F 70%)'
              : 'radial-gradient(ellipse at center, #280000 0%, #0A0A0F 70%)',
          transition: 'background 1.5s ease',
        }} />

        <BodyAvatar bodyTypeId={state.bodyTypeId} scanDone={scanDone} showZones={showZones} />
      </div>

      {/* Zone cards + description */}
      <div style={{
        background: '#111118', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '20px 20px 24px',
        transform: showCards ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {isPeak ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36 }}>🏆</div>
            <div style={{ color: '#22C55E', fontSize: 16, fontWeight: 700, margin: '8px 0 4px' }}>
              Excellent Vitality Foundation
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Your systems are functioning well. A precision stack will push you to peak levels most men never reach.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
                letterSpacing: 1.5, marginBottom: 8 }}>AFFECTED SYSTEMS</div>
              {bt.zones.map(z => (
                <ZoneCard key={z} zoneId={z} bodyTypeId={state.bodyTypeId} />
              ))}
            </div>
            <div style={{
              background: '#1A1A22', borderRadius: 12, padding: '12px 14px', marginBottom: 14,
              border: `1px solid ${bt.color}30`,
            }}>
              <div style={{ color: bt.color, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                ⚠️ What happens if untreated
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>
                {bt.whatHappens}
              </div>
            </div>
          </>
        )}

        {/* CTA */}
        {showCta && (
          <div style={{ opacity: 1, animation: 'fadeUp 0.5s ease' }}>
            <button
              onClick={() => navigate('/product-stack')}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${bt.color}, ${bt.color}CC)`,
                color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 20px ${bt.color}50`,
              }}
            >
              See Your Custom Protocol →
            </button>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 10 }}>
              Ancient Ayurvedic formulas matched to your exact body type
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  )
}
