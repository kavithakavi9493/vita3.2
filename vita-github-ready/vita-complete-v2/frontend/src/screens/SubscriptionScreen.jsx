/**
 * VI — Subscription Screen
 * ==========================
 * Full subscription management portal.
 *
 * States:
 *   1. No subscription → Upsell to subscribe
 *   2. Active          → Manage (pause, skip, cancel)
 *   3. Paused          → Resume
 *   4. Cancelled       → Re-subscribe
 *
 * Uses Razorpay checkout for subscription initiation.
 */

import { useState, useEffect } from 'react'
import { useNavigate }    from 'react-router-dom'
import { getAuth }        from 'firebase/auth'
import { useApp }         from '../context/AppContext'
import { useLanguage }    from '../context/LanguageContext'
import { C, G }           from '../constants/colors'

const API = import.meta.env.VITE_API_URL || ''

// ── API helpers ───────────────────────────────────────────────
async function apiCall(path, method = 'GET', body = null) {
  const auth  = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
  const res   = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── STATUS BADGE ──────────────────────────────────────────────
const STATUS_COLORS = {
  active:     { bg: '#E8F8EE', text: '#1A7A3A', dot: '#34C759' },
  paused:     { bg: '#FFF8E6', text: '#7A5A00', dot: '#FF9500' },
  cancelled:  { bg: '#FFF0F0', text: '#7A1A1A', dot: '#FF3B30' },
  created:    { bg: '#EEF4FF', text: '#1A3A7A', dot: '#007AFF' },
  expired:    { bg: '#F5F5F5', text: '#606060', dot: '#999'    },
}

function StatusBadge({ status, t }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.created
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: colors.bg, color: colors.text,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot }} />
      {t(`subscription.status.${status}`) || status}
    </span>
  )
}

// ── FEATURE CARD ──────────────────────────────────────────────
function FeatureRow({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#504030' }}>{text}</span>
    </div>
  )
}

// ── CONFIRM MODAL ─────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, t, inputPlaceholder }) {
  const [reason, setReason] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 16,
    }}>
      <div style={{
        background: C.white, borderRadius: 16, padding: 24,
        maxWidth: 340, width: '100%',
        boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>{message}</div>
        {inputPlaceholder && (
          <textarea
            placeholder={inputPlaceholder}
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: 10, fontSize: 13, borderRadius: 8,
              border: '1px solid #E0D8C8', marginBottom: 16, resize: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', background: '#F7F3EC',
            border: '1px solid #E0D8C8', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          }}>{t('common.cancel')}</button>
          <button onClick={() => onConfirm(reason)} style={{
            flex: 1, padding: '10px 0', background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
            border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            color: '#FFF', fontWeight: 700,
          }}>{t('common.confirm')}</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function SubscriptionScreen() {
  const { state }                  = useApp()
  const { t }                      = useLanguage()
  const navigate                   = useNavigate()
  const [sub, setSub]              = useState(null)
  const [history, setHistory]      = useState([])
  const [loading, setLoading]      = useState(true)
  const [actionLoading, setAction] = useState(false)
  const [modal, setModal]          = useState(null)   // 'pause'|'cancel'|'skip'|null
  const [toast, setToast]          = useState('')

  const userId = state.userId

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Fetch subscription ──────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    Promise.all([
      apiCall(`/api/subscriptions/${userId}`),
      apiCall(`/api/subscriptions/${userId}/history`),
    ]).then(([subData, histData]) => {
      setSub(subData.subscription)
      setHistory(histData.history || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  // ── Subscribe (open Razorpay) ────────────────────────────────
  const subscribe = async (products) => {
    setAction(true)
    try {
      const data = await apiCall('/api/subscriptions/create', 'POST', {
        userId, products,
        name:  state.userName || '',
        phone: state.phoneNumber || '',
      })

      const options = {
        key:            data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name:           'VI Vita Intelligence',
        description:    'Monthly Health Stack — Subscribe & Save 15%',
        handler:        (response) => {
          showToast('🎉 Subscription activated!')
          apiCall(`/api/subscriptions/${userId}`)
            .then(d => setSub(d.subscription))
        },
        prefill: {
          contact: state.phoneNumber || '',
        },
        theme: { color: '#C9A84C' },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      showToast('❌ ' + (err.message || 'Could not start subscription'))
    } finally {
      setAction(false)
    }
  }

  // ── Pause ────────────────────────────────────────────────────
  const doPause = async () => {
    setAction(true)
    try {
      await apiCall(`/api/subscriptions/${sub.subscriptionId}/pause`, 'POST', { userId })
      setSub(prev => ({ ...prev, status: 'paused' }))
      showToast('⏸ ' + t('subscription.paused_message'))
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setAction(false); setModal(null)
    }
  }

  // ── Resume ───────────────────────────────────────────────────
  const doResume = async () => {
    setAction(true)
    try {
      await apiCall(`/api/subscriptions/${sub.subscriptionId}/resume`, 'POST', { userId })
      setSub(prev => ({ ...prev, status: 'active' }))
      showToast('▶️ Subscription resumed!')
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setAction(false)
    }
  }

  // ── Skip ─────────────────────────────────────────────────────
  const doSkip = async () => {
    setAction(true)
    try {
      const data = await apiCall(`/api/subscriptions/${sub.subscriptionId}/skip`, 'POST', { userId })
      setSub(prev => ({ ...prev, status: 'paused' }))
      showToast(`⏭ Skipped! Next charge ${new Date(data.nextBillingDate).toLocaleDateString()}`)
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setAction(false); setModal(null)
    }
  }

  // ── Cancel ───────────────────────────────────────────────────
  const doCancel = async (reason) => {
    setAction(true)
    try {
      await apiCall(`/api/subscriptions/${sub.subscriptionId}/cancel`, 'POST', { userId, reason })
      setSub(prev => ({ ...prev, status: 'cancelled' }))
      showToast('Subscription cancelled.')
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setAction(false); setModal(null)
    }
  }

  // ── Recommended products from user's body type ───────────────
  const recommendedProducts = (() => {
    const STACK_MAP = {
      HIGH_STRESS_LOW_VITALITY: ['stress_calm', 'night_recovery', 'testosterone_boost'],
      HORMONAL_DECLINE:         ['testosterone_boost', 'libido_boost', 'night_recovery'],
      PERFORMANCE_DEFICIT:      ['timing_control', 'erection_support', 'performance_oil'],
      AGE_RELATED_DROP:         ['age_performance', 'testosterone_boost', 'night_recovery'],
      PEAK_PERFORMANCE:         ['testosterone_boost', 'intimacy_shot', 'stress_calm'],
    }
    return STACK_MAP[state.bodyTypeId] || STACK_MAP.PEAK_PERFORMANCE
  })()

  const GoldBtn = ({ children, onClick, disabled, outlined }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 24px', borderRadius: 12,
      background: outlined ? 'transparent' : disabled ? '#E0D8C8' : 'linear-gradient(135deg, #C9A84C, #8B6914)',
      border: outlined ? '1px solid #C9A84C' : 'none',
      color: outlined ? '#8B6914' : disabled ? '#A09070' : '#FFF',
      fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
      width: '100%', transition: 'opacity 0.15s',
    }}>{disabled ? <span>⏳ {t('common.loading')}</span> : children}</button>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted }}>
      {t('common.loading')}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: C.bg, padding: '16px 16px 32px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1A1206', color: '#FFF', padding: '10px 20px', borderRadius: 20,
          fontSize: 13, zIndex: 3000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>{toast}</div>
      )}

      {/* Modals */}
      {modal === 'pause' && (
        <ConfirmModal t={t} title={t('subscription.pause')} message={t('subscription.pause_confirm')}
          onConfirm={doPause} onCancel={() => setModal(null)} />
      )}
      {modal === 'skip' && (
        <ConfirmModal t={t} title={t('subscription.skip')} message={t('subscription.skip_confirm')}
          onConfirm={doSkip} onCancel={() => setModal(null)} />
      )}
      {modal === 'cancel' && (
        <ConfirmModal t={t} title={t('subscription.cancel')} message={t('subscription.cancel_confirm')}
          inputPlaceholder={t('subscription.cancel_reason')}
          onConfirm={doCancel} onCancel={() => setModal(null)} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, padding: 0, marginBottom: 12 }}>
          ← {t('common.back')}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{t('subscription.title')}</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{t('subscription.subtitle')}</p>
      </div>

      {/* ── NO SUBSCRIPTION → UPSELL ─────────────────────────── */}
      {!sub && (
        <div>
          {/* Value card */}
          <div style={{
            background: 'linear-gradient(135deg, #1A0800, #3A1800)',
            borderRadius: 16, padding: 20, marginBottom: 16, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
              color: '#FFF', fontSize: 9, fontWeight: 800, letterSpacing: 1,
              padding: '3px 8px', borderRadius: 10,
            }}>{t('subscription.badge')}</div>
            <div style={{ color: '#C9A84C', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Save 15%</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 }}>
              On every monthly order. Cancel anytime.
            </div>
            <FeatureRow icon="💰" text={t('subscription.features.discount')} />
            <FeatureRow icon="🔄" text={t('subscription.features.auto_renew')} />
            <FeatureRow icon="⏸"  text={t('subscription.features.pause')} />
            <FeatureRow icon="✕"  text={t('subscription.features.cancel')} />
          </div>

          {/* Recommended stack */}
          <div style={{ background: C.white, borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E0D8C8' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Your Recommended Stack</div>
            {recommendedProducts.map(pid => (
              <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0EAE0' }}>
                <span style={{ fontSize: 13, color: C.text }}>{pid.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <span style={{ fontSize: 11, color: '#34C759', fontWeight: 600 }}>✓ Included</span>
              </div>
            ))}
          </div>

          <GoldBtn onClick={() => subscribe(recommendedProducts)} disabled={actionLoading}>
            🔔 Subscribe & Save 15% Every Month
          </GoldBtn>
        </div>
      )}

      {/* ── ACTIVE SUBSCRIPTION ──────────────────────────────── */}
      {sub && sub.status !== 'cancelled' && (
        <div>
          {/* Status card */}
          <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, border: '1px solid #E0D8C8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('subscription.title')}</div>
                <StatusBadge status={sub.status} t={t} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>
                  ₹{Math.round((sub.totalAmountPaise || 0) / 100)}
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>{t('common.per_month')}</div>
              </div>
            </div>

            {sub.nextBillingDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #F0EAE0' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{t('subscription.next_billing')}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  {typeof sub.nextBillingDate === 'number'
                    ? new Date(sub.nextBillingDate * 1000).toLocaleDateString()
                    : new Date(sub.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {sub.cycleCount !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{t('subscription.cycle', { count: sub.cycleCount })}</span>
                <div style={{ height: 6, width: 120, background: '#F0EAE0', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(sub.cycleCount / 12) * 100}%`, background: 'linear-gradient(90deg, #C9A84C, #8B6914)', borderRadius: 3 }} />
                </div>
              </div>
            )}
          </div>

          {/* Products in subscription */}
          {sub.products?.length > 0 && (
            <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid #E0D8C8' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Subscribed Products</div>
              {sub.products.map(pid => (
                <div key={pid} style={{ fontSize: 13, color: C.text, padding: '4px 0' }}>
                  💊 {pid.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {sub.status === 'active' && (
              <>
                <button onClick={() => setModal('skip')} style={{
                  padding: '11px', borderRadius: 10, border: '1px solid #E0D8C8',
                  background: '#F7F3EC', color: C.text, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                }}>⏭ {t('subscription.skip')}</button>
                <button onClick={() => setModal('pause')} style={{
                  padding: '11px', borderRadius: 10, border: '1px solid #E0D8C8',
                  background: '#F7F3EC', color: C.text, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                }}>⏸ {t('subscription.pause')}</button>
              </>
            )}
            {sub.status === 'paused' && (
              <GoldBtn onClick={doResume} disabled={actionLoading}>
                ▶️ {t('subscription.resume')}
              </GoldBtn>
            )}
            <button onClick={() => setModal('cancel')} style={{
              padding: '11px', borderRadius: 10, border: '1px solid #FFCCCC',
              background: '#FFF8F8', color: '#CC3333', fontSize: 12, cursor: 'pointer',
            }}>✕ {t('subscription.cancel')}</button>
          </div>

          {/* Billing History */}
          {history.length > 0 && (
            <div style={{ background: C.white, borderRadius: 12, padding: 14, border: '1px solid #E0D8C8' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{t('subscription.history')}</div>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < history.length - 1 ? '1px solid #F0EAE0' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.text }}>Payment #{i + 1}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{new Date(h.paidAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>₹{Math.round((h.amount || 0) / 100)}</div>
                    <div style={{ fontSize: 10, color: '#34C759' }}>✓ Paid</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CANCELLED ────────────────────────────────────────── */}
      {sub?.status === 'cancelled' && (
        <div>
          <div style={{ textAlign: 'center', padding: '24px 0', marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Subscription Cancelled</div>
            <div style={{ fontSize: 13, color: C.muted }}>Resubscribe anytime to get back your 15% discount</div>
          </div>
          <GoldBtn onClick={() => subscribe(recommendedProducts)} disabled={actionLoading}>
            🔔 Resubscribe & Save 15%
          </GoldBtn>
        </div>
      )}
    </div>
  )
}
