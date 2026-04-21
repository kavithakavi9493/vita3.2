/**
 * VI — Referral Screen
 * =====================
 * Full Invite & Earn UI.
 *
 * Features:
 *   - Auto-generates referral code
 *   - Share via WhatsApp (one tap)
 *   - Copy code / copy link
 *   - Earnings counter
 *   - Referral history
 *   - Available credit display
 */

import { useState, useEffect } from 'react'
import { useNavigate }   from 'react-router-dom'
import { getAuth }       from 'firebase/auth'
import { useApp }        from '../context/AppContext'
import { useLanguage }   from '../context/LanguageContext'
import { C, G }          from '../constants/colors'

const API = import.meta.env.VITE_API_URL || ''

async function apiCall(path, method = 'GET', body = null) {
  const auth  = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
  const res   = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed') }
  return res.json()
}

// ── STEP CARD ─────────────────────────────────────────────────
function HowStep({ number, icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FFF', fontSize: 14, fontWeight: 800,
      }}>{number}</div>
      <div>
        <span style={{ fontSize: 18, marginRight: 6 }}>{icon}</span>
        <span style={{ fontSize: 13, color: '#504030' }}>{text}</span>
      </div>
    </div>
  )
}

// ── STAT BOX ──────────────────────────────────────────────────
function StatBox({ label, value, color = '#C9A84C' }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '12px 8px',
      background: '#FAFAF5', borderRadius: 10, border: '1px solid #E0D8C8',
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#A09070', marginTop: 3 }}>{label}</div>
    </div>
  )
}

// ── HISTORY ITEM ──────────────────────────────────────────────
function HistoryItem({ event }) {
  const isPending  = event.status === 'pending'
  const date       = new Date(event.createdAt).toLocaleDateString()
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid #F0EAE0',
    }}>
      <div>
        <div style={{ fontSize: 12, color: '#1A1206' }}>
          Friend {event.refereeId?.substring(0, 8)}...
        </div>
        <div style={{ fontSize: 10, color: '#A09070', marginTop: 2 }}>{date}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: isPending ? '#FF9500' : '#34C759',
        }}>
          {isPending ? '⏳ Pending' : `✓ +₹${event.referrerCredit || 200}`}
        </div>
      </div>
    </div>
  )
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function ReferralScreen() {
  const { state }                  = useApp()
  const { t }                      = useLanguage()
  const navigate                   = useNavigate()
  const [data, setData]            = useState(null)
  const [loading, setLoading]      = useState(true)
  const [copied, setCopied]        = useState(false)
  const [generating, setGenerating]= useState(false)
  const [showHistory, setHistory]  = useState(false)

  const userId = state.userId

  // ── Init: generate code + fetch dashboard ───────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return }

    const init = async () => {
      try {
        // Generate code (idempotent)
        await apiCall('/api/referrals/generate', 'POST')
        // Fetch dashboard
        const dashboard = await apiCall(`/api/referrals/${userId}`)
        setData(dashboard)
      } catch (e) {
        console.error('Referral init error:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [userId])

  const copyCode = () => {
    if (!data?.code) return
    navigator.clipboard.writeText(data.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const copyLink = () => {
    const link = `https://vita.in?ref=${data?.code}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const shareWhatsApp = () => {
    if (!data?.whatsappUrl) return
    window.open(data.whatsappUrl, '_blank')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted }}>
      {t('common.loading')}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: C.bg, padding: '16px 16px 40px' }}>

      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, padding: 0, marginBottom: 12 }}>
        ← {t('common.back')}
      </button>

      {/* Hero */}
      <div style={{
        background:   'linear-gradient(135deg, #1A0800, #3A1800)',
        borderRadius: 20, padding: '24px 20px', marginBottom: 20,
        textAlign:    'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎁</div>
        <h1 style={{ color: '#C9A84C', fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>
          {t('referral.title')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, margin: 0, fontWeight: 600 }}>
          {t('referral.subtitle')}
        </p>

        {/* Reward boxes */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 8px',
          }}>
            <div style={{ color: '#C9A84C', fontSize: 22, fontWeight: 800 }}>
              ₹{data?.rewards?.referrer || 200}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3 }}>
              {t('referral.you_earn')}
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, alignSelf: 'center' }}>+</div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 8px',
          }}>
            <div style={{ color: '#34C759', fontSize: 22, fontWeight: 800 }}>
              ₹{data?.rewards?.referee || 200}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3 }}>
              {t('referral.friend_gets')}
            </div>
          </div>
        </div>
      </div>

      {/* Available credit (if any) */}
      {data?.availableCredit > 0 && (
        <div style={{
          background:   'linear-gradient(135deg, #E8F8EE, #D0F0DC)',
          border:       '1px solid #A0D8B0',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          display:      'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A5A2A' }}>{t('referral.available_credit')}</div>
            <div style={{ fontSize: 11, color: '#3A7A4A', marginTop: 2 }}>{t('referral.use_at_checkout')}</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1A7A3A' }}>
            ₹{data.availableCredit}
          </div>
        </div>
      )}

      {/* Referral Code */}
      <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 16, border: '1px solid #E0D8C8' }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          {t('referral.your_code')}
        </div>

        <div style={{
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          background:   '#F7F3EC',
          border:       '2px dashed #C9A84C',
          borderRadius: 12, padding: '14px 16px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, color: '#5A3D00', fontFamily: 'monospace' }}>
            {data?.code || '------'}
          </span>
          <button onClick={copyCode} style={{
            padding:      '7px 14px',
            background:   copied ? '#34C759' : 'linear-gradient(135deg, #C9A84C, #8B6914)',
            border:       'none', borderRadius: 8, cursor: 'pointer',
            color:        '#FFF', fontSize: 12, fontWeight: 700,
            transition:   'all 0.2s',
          }}>
            {copied ? '✓ ' + t('common.copied') : t('common.copy')}
          </button>
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={shareWhatsApp} style={{
            flex: 1, padding: '12px 0',
            background: '#25D366', border: 'none', borderRadius: 10,
            color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {t('referral.whatsapp_share')}
          </button>
          <button onClick={copyLink} style={{
            flex: 0.5, padding: '12px 0',
            background: '#F7F3EC', border: '1px solid #E0D8C8',
            borderRadius: 10, color: '#5A3D00', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>🔗 Link</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatBox label={t('referral.total_referrals')} value={data?.totalReferrals || 0} />
        <StatBox label={t('referral.successful')} value={data?.successfulReferrals || 0} color="#34C759" />
        <StatBox label={t('referral.total_earned')} value={`₹${data?.totalEarned || 0}`} color="#FF9500" />
      </div>

      {/* How it works */}
      <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 16, border: '1px solid #E0D8C8' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>{t('referral.how_it_works')}</div>
        <HowStep number="1" icon="📤" text={t('referral.step1')} />
        <HowStep number="2" icon="🛒" text={t('referral.step2')} />
        <HowStep number="3" icon="🎉" text={t('referral.step3')} />
        <div style={{ fontSize: 11, color: C.subtle, marginTop: 8 }}>{t('referral.terms')}</div>
      </div>

      {/* History */}
      {data?.recentEvents?.length > 0 && (
        <div style={{ background: C.white, borderRadius: 16, padding: 18, border: '1px solid #E0D8C8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t('referral.history_title')}</div>
          </div>
          {data.recentEvents.map((e, i) => <HistoryItem key={i} event={e} />)}
        </div>
      )}

      {(!data?.recentEvents || data.recentEvents.length === 0) && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 13 }}>
          {t('referral.no_referrals')}
        </div>
      )}
    </div>
  )
}
