/**
 * VI V3 — ProductStackScreen
 * Replaces PlanScreen + ProductScreen.
 * Shows personalised product stack → two paths: ₹99 Activation OR direct purchase.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { BODY_TYPES, getBundlePrice } from '../utils/bodyTypes'
import { productsApi } from '../utils/api'
import { C, G } from '../constants/colors'

const ZONE_REASON = {
  brain:        'Targets cortisol + restores neural energy',
  heart:        'Improves blood flow and vascular strength',
  adrenal:      'Rebuilds hormonal output from the source',
  reproductive: 'Directly restores reproductive vitality',
}

export default function ProductStackScreen() {
  const navigate = useNavigate()
  const { state, update } = useApp()
  const bt = BODY_TYPES[state.bodyTypeId] || BODY_TYPES.PEAK_PERFORMANCE

  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [expanded,     setExpanded]     = useState(null)
  const [bundle,       setBundle]       = useState({ bundlePrice: 0, mrpSum: 0, saving: 0 })

  useEffect(() => {
    async function load() {
      try {
        const { products: all } = await productsApi.list()
        const ids   = bt.productIds.slice(0, 4)   // top 4 products
        const stack = ids.map(id => all.find(p => p.numId === id || p.id === String(id))).filter(Boolean)
        setProducts(stack)
        const b = getBundlePrice(stack)
        setBundle(b)
        update({ recommendedStack: stack, stackBundlePrice: b.bundlePrice })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bgMid }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚗️</div>
        <div style={{ color: C.muted, fontSize: 14 }}>Building your protocol...</div>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: C.bgMid, paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: G.hero, padding: '24px 20px 20px' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>
          YOUR PERSONALISED PROTOCOL
        </div>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          {bt.icon} {bt.label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
          {bt.shortDesc}
        </div>
        {/* Urgency badge */}
        {bt.urgency !== 'MODERATE' && (
          <div style={{
            display: 'inline-block', marginTop: 10,
            background: bt.urgency === 'CRITICAL' ? '#7F1D1D' : '#78350F',
            border: `1px solid ${bt.urgency === 'CRITICAL' ? '#DC2626' : '#D97706'}`,
            borderRadius: 20, padding: '4px 12px',
            color: bt.urgency === 'CRITICAL' ? '#FCA5A5' : '#FCD34D',
            fontSize: 11, fontWeight: 700,
          }}>
            {bt.urgency === 'CRITICAL' ? '🚨 CRITICAL — Immediate attention needed'
                                        : '⚠️ HIGH — Start treatment soon'}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Product cards */}
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>
          YOUR {products.length}-PRODUCT STACK
        </div>

        {products.map((p, idx) => {
          const zone   = p.zone || 'adrenal'
          const reason = ZONE_REASON[zone] || 'Selected for your body type'
          const open   = expanded === idx
          return (
            <div key={p.id}
              onClick={() => setExpanded(open ? null : idx)}
              style={{
                background: 'white', borderRadius: 16, padding: '16px',
                marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                border: `1.5px solid ${open ? C.gold : C.border}`,
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Product icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0,
                }}>
                  {p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{p.brand}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>{p.cat}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: C.gold, fontSize: 15, fontWeight: 700 }}>₹{p.price}</div>
                      <div style={{ color: C.muted, fontSize: 11, textDecoration: 'line-through' }}>₹{p.mrp}</div>
                    </div>
                  </div>
                  {/* Why this product */}
                  <div style={{
                    marginTop: 6, background: C.goldBg, borderRadius: 6,
                    padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ color: C.gold, fontSize: 10, fontWeight: 600 }}>✓ {reason}</span>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {open && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {p.benefits.map(b => (
                      <span key={b} style={{
                        background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                        borderRadius: 20, padding: '3px 10px', color: C.gold, fontSize: 11,
                      }}>✓ {b}</span>
                    ))}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>
                    <strong style={{ color: C.text }}>Ingredients:</strong> {p.ingredients}
                  </div>
                  <div style={{ color: C.muted, fontSize: 12 }}>
                    <strong style={{ color: C.text }}>Usage:</strong> {p.usage}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    <span style={{ color: C.gold, fontSize: 12 }}>⭐ {p.rating}</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>({p.reviews.toLocaleString()} reviews)</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Tap to expand hint */}
        <p style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginBottom: 16 }}>
          Tap any product to see ingredients & usage
        </p>

        {/* Bundle pricing card */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '16px',
          border: `2px solid ${C.gold}`, marginBottom: 16,
          boxShadow: '0 4px 20px rgba(184,134,11,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Individual total</span>
            <span style={{ color: C.muted, fontSize: 13, textDecoration: 'line-through' }}>
              ₹{bundle.mrpSum.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#15803D', fontSize: 13, fontWeight: 600 }}>Bundle discount (15%)</span>
            <span style={{ color: '#15803D', fontSize: 13, fontWeight: 600 }}>− ₹{bundle.saving.toLocaleString()}</span>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>Stack Total</span>
            <span style={{ color: C.gold, fontSize: 22, fontWeight: 800 }}>
              ₹{bundle.bundlePrice.toLocaleString()}
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Free delivery · Authentic Ayurvedic formulations</p>
        </div>

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.muted, fontSize: 11 }}>Choose how to start</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* PATH 1: ₹99 Activation (primary CTA) */}
        <div style={{
          background: G.hero, borderRadius: 18, padding: '20px',
          marginBottom: 12, boxShadow: '0 6px 24px rgba(26,14,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>RECOMMENDED</div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>7-Day Activation</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#FFD700', fontSize: 26, fontWeight: 800 }}>₹99</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textDecoration: 'line-through' }}>₹499</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            {['Complete body analysis dashboard', 'Personalised daily supplement protocol',
              'Progress & streak tracking', 'Weekly transformation report',
              'Day 7: full stack delivered to your door'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                <span style={{ color: '#FFD700', fontSize: 12 }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{f}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/activate')}
            style={{
              width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #FFD700, #B8860B)',
              color: '#1A0E00', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,215,0,0.4)',
            }}
          >
            Start 7-Day Activation — ₹99
          </button>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center', marginTop: 8 }}>
            ₹99 adjusts against full stack purchase on Day 7
          </p>
        </div>

        {/* PATH 2: Direct purchase */}
        <div style={{
          background: 'white', borderRadius: 18, padding: '16px',
          border: `1.5px solid ${C.border}`, marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 11 }}>OR</div>
              <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>Buy Full Stack Now</div>
            </div>
            <div style={{ color: C.gold, fontSize: 20, fontWeight: 800 }}>
              ₹{bundle.bundlePrice.toLocaleString()}
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            style={{
              width: '100%', padding: '13px', borderRadius: 12,
              background: 'transparent', border: `2px solid ${C.gold}`,
              color: C.gold, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Order Full Stack →
          </button>
        </div>
      </div>
    </div>
  )
}
