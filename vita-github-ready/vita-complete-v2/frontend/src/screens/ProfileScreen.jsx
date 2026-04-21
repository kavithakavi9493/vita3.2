/**
 * VI V3 — ProfileScreen (Edit button working, dynamic member since date)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, updateProfile } from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useApp } from '../context/AppContext'
import { Toggle, ScreenWrapper, Divider, ErrorBanner } from '../components/UI'
import { analytics } from '../utils/analytics'
import { C, G } from '../constants/colors'

export default function ProfileScreen() {
  const navigate      = useNavigate()
  const { state, update, reset } = useApp()
  const { userName, phone, email, vitaScore, lifestyleScore,
          mentalScore, performanceScore, planType, ageGroup, userId } = state

  const [editing,     setEditing]    = useState(false)
  const [editName,    setEditName]   = useState(userName || '')
  const [editEmail,   setEditEmail]  = useState(email    || '')
  const [saving,      setSaving]     = useState(false)
  const [saveMsg,     setSaveMsg]    = useState('')
  const [error,       setError]      = useState('')
  const [notifs, setNotifs] = useState({ daily:true, session:true, prog:true, offers:false })
  const [showLogout,  setShowLogout] = useState(false)
  const [showDelete,  setShowDelete] = useState(false)

  // Member since — read from activation date, fall back to today
  const memberSince = (() => {
    if (state.activationExpiry) {
      try {
        const d = new Date(state.activationExpiry)
        d.setDate(d.getDate() - 7)
        return d.toLocaleDateString('en-IN', { month:'short', year:'numeric' })
      } catch { /* */ }
    }
    return new Date().toLocaleDateString('en-IN', { month:'short', year:'numeric' })
  })()

  async function saveProfile() {
    if (!editName.trim()) { setError('Name cannot be empty'); return }
    setSaving(true); setError('')
    try {
      const fbAuth = getAuth()
      if (fbAuth.currentUser) await updateProfile(fbAuth.currentUser, { displayName: editName.trim() })
      await updateDoc(doc(db, 'users', userId), {
        userName: editName.trim(),
        email:    editEmail.trim(),
      })
      update({ userName: editName.trim(), email: editEmail.trim() })
      setSaveMsg('Profile updated ✓')
      setEditing(false)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) {
      setError(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await signOut(auth)
    reset()
    navigate('/', { replace: true })
  }

  async function handleDelete() {
    try {
      if (userId) {
        await deleteDoc(doc(db, 'users', userId))
        await deleteDoc(doc(db, 'user_responses', userId))
      }
      await signOut(auth)
      reset()
      navigate('/', { replace: true })
    } catch (e) {
      setError('Delete failed. Please contact support.')
    }
  }

  const Row = ({ icon, label, sub, value, chevron=true, danger=false, onPress }) => (
    <div onClick={onPress}
      style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 0',
        borderBottom:`1px solid ${C.border}`, cursor: onPress ? 'pointer' : 'default' }}>
      <div style={{ width:36, height:36, borderRadius:'50%',
        background: danger ? '#2A0000' : C.goldBg,
        border:`1px solid ${danger ? C.red : C.goldBorder}`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ color: danger ? C.red : C.text, fontSize:14, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ color: C.muted, fontSize:11, marginTop:1 }}>{sub}</div>}
      </div>
      {value   && <div style={{ color: C.gold, fontSize:12, fontWeight:600 }}>{value}</div>}
      {chevron && !value && <div style={{ color: C.muted, fontSize:16 }}>›</div>}
    </div>
  )

  return (
    <ScreenWrapper>
      {/* Hero */}
      <div style={{ background: C.bgMid, padding:'20px 20px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <button onClick={() => navigate(-1)}
            style={{ background:'none', border:'none', color: C.text, fontSize:22, cursor:'pointer' }}>←</button>
          <div style={{ color: C.text, fontSize:18, fontWeight:700 }}>My Profile</div>
          {!editing ? (
            <div onClick={() => { setEditing(true); setEditName(userName||''); setEditEmail(email||'') }}
              style={{ border:`1px solid ${C.gold}`, borderRadius:20, padding:'4px 14px',
                color: C.gold, fontSize:12, cursor:'pointer' }}>Edit</div>
          ) : (
            <div onClick={() => setEditing(false)}
              style={{ color: C.muted, fontSize:12, cursor:'pointer' }}>Cancel</div>
          )}
        </div>

        {/* Avatar */}
        <div style={{ textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background: C.gold,
            border:`2px solid ${C.goldDark}`, display:'flex', alignItems:'center',
            justifyContent:'center', margin:'0 auto 10px',
            fontSize:32, fontWeight:700, color: C.onGold,
            boxShadow:'0 0 20px rgba(255,215,0,0.3)' }}>
            {(userName||'U')[0].toUpperCase()}
          </div>

          {/* Editable fields */}
          {editing ? (
            <div style={{ maxWidth:280, margin:'0 auto' }}>
              <input value={editName}  onChange={e => setEditName(e.target.value)}
                placeholder="Your name"
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, marginBottom:8,
                  border:`1px solid ${C.gold}`, background:'white', color: C.text,
                  fontSize:16, fontWeight:700, textAlign:'center', boxSizing:'border-box', outline:'none' }} />
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                placeholder="Email address"
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, marginBottom:12,
                  border:`1px solid ${C.border}`, background:'white', color: C.text,
                  fontSize:14, textAlign:'center', boxSizing:'border-box', outline:'none' }} />
              <ErrorBanner message={error} />
              <button onClick={saveProfile} disabled={saving}
                style={{ width:'100%', padding:'12px', borderRadius:12, border:'none',
                  background: G.gold, color: C.onGold, fontWeight:700, fontSize:15,
                  cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ color: C.text, fontSize:22, fontWeight:700 }}>{userName||'User'}</div>
              <div style={{ color: C.muted, fontSize:14 }}>📱 +91 {phone}</div>
              {email && <div style={{ color: C.muted, fontSize:14 }}>✉ {email}</div>}
              <div style={{ background: C.goldBg, border:`1px solid ${C.gold}`, borderRadius:20,
                padding:'4px 14px', color: C.gold, fontSize:12,
                display:'inline-block', marginTop:8 }}>
                {state.isActivated ? '⚡ Activated' : '📱 App User'} · Member since {memberSince}
              </div>
            </>
          )}
          {saveMsg && <div style={{ color:'#15803D', fontSize:13, marginTop:8 }}>{saveMsg}</div>}
        </div>
      </div>

      {/* Score strip */}
      <div style={{ margin:'14px 20px', background: C.card,
        border:`1px solid ${C.gold}`, borderRadius:12, padding:'13px 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
          {[{ v:vitaScore,       l:'VitaScore', c: C.text  },
            { v:lifestyleScore,  l:'Lifestyle', c: C.gold  },
            { v:mentalScore,     l:'Mental',    c: C.purple },
            { v:performanceScore,l:'Perform',   c: C.gold  }].map((s,i) => (
            <div key={s.l} style={{ textAlign:'center',
              borderLeft: i>0 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ color:s.c, fontSize:17, fontWeight:700 }}>{s.v||0}</div>
              <div style={{ color: C.muted, fontSize:10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 20px 40px' }}>
        {/* My Orders */}
        <Row icon="📦" label="My Orders"  sub="Track your VI stack delivery"   onPress={() => navigate('/my-orders')} />
        <Row icon="📊" label="Progress"   sub="View your full transformation"  onPress={() => navigate('/dashboard')} />
        <Row icon="🔄" label="Retake Quiz" sub="Update your health assessment" onPress={() => navigate('/routine')} />

        <Divider label="Notifications" />
        <div style={{ padding:'4px 0' }}>
          {[{ k:'daily',   l:'Daily supplement reminders',  s:'Timed to your schedule'     },
            { k:'session', l:'Expert session alerts',       s:'Before your consultations'  },
            { k:'prog',    l:'Weekly progress reports',     s:'Every Sunday'               },
            { k:'offers',  l:'Special offers',              s:'New products and discounts' }].map(n => (
            <div key={n.k} style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ color: C.text, fontSize:14, fontWeight:500 }}>{n.l}</div>
                <div style={{ color: C.muted, fontSize:11 }}>{n.s}</div>
              </div>
              <div onClick={() => setNotifs(p=>({...p,[n.k]:!p[n.k]}))}
                style={{ width:44, height:24, borderRadius:12, cursor:'pointer', flexShrink:0,
                  background: notifs[n.k] ? C.gold : C.border, transition:'background .2s',
                  position:'relative' }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background:'white',
                  position:'absolute', top:3, left: notifs[n.k] ? 23 : 3,
                  transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          ))}
        </div>

        <Divider label="Account" />
        <Row icon="🔒" label="Privacy Policy"  chevron onPress={() => window.open('https://vitaintelligence.com/privacy','_blank')} />
        <Row icon="📄" label="Terms of Service" chevron onPress={() => window.open('https://vitaintelligence.com/terms','_blank')} />
        <Row icon="💬" label="Contact Support"  sub="WhatsApp / Email" chevron
             onPress={() => window.open('https://wa.me/919999999999','_blank')} />

        <Divider />
        <Row icon="🚪" label="Logout" danger onPress={() => setShowLogout(true)} chevron={false} />
        <Row icon="🗑️" label="Delete Account" sub="This cannot be undone" danger
             onPress={() => setShowDelete(true)} chevron={false} />
      </div>

      {/* Logout modal */}
      {showLogout && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'white', width:'100%', borderTopLeftRadius:24,
            borderTopRightRadius:24, padding:28 }}>
            <div style={{ color: C.text, fontSize:18, fontWeight:700, marginBottom:8 }}>Log Out?</div>
            <div style={{ color: C.muted, fontSize:14, marginBottom:20 }}>
              You'll need to log back in to access your dashboard.
            </div>
            <button onClick={handleLogout}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:'none',
                background:'#DC2626', color:'white', fontWeight:700, fontSize:15,
                cursor:'pointer', marginBottom:10 }}>Log Out</button>
            <button onClick={() => setShowLogout(false)}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:`1px solid ${C.border}`,
                background:'transparent', color: C.muted, fontWeight:600, cursor:'pointer' }}>
              Cancel</button>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDelete && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'white', width:'100%', borderTopLeftRadius:24,
            borderTopRightRadius:24, padding:28 }}>
            <div style={{ color:'#DC2626', fontSize:18, fontWeight:700, marginBottom:8 }}>
              Delete Account?
            </div>
            <div style={{ color: C.muted, fontSize:14, marginBottom:20, lineHeight:1.5 }}>
              All your data, progress, and history will be permanently deleted.
              This cannot be undone.
            </div>
            <button onClick={handleDelete}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:'none',
                background:'#DC2626', color:'white', fontWeight:700, fontSize:15,
                cursor:'pointer', marginBottom:10 }}>
              Yes, Delete My Account</button>
            <button onClick={() => setShowDelete(false)}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:`1px solid ${C.border}`,
                background:'transparent', color: C.muted, fontWeight:600, cursor:'pointer' }}>
              Cancel</button>
          </div>
        </div>
      )}
    </ScreenWrapper>
  )
}
