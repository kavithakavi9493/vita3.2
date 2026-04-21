/**
 * VI V3 — AdminScreen (/admin)
 * Manage products, orders, users, content, coupons, app config.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { C, G } from '../constants/colors'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function adminFetch(path, { method='GET', body }={}) {
  const auth  = getAuth()
  const token = await auth.currentUser?.getIdToken()
  const res   = await fetch(`${BASE}${path}`, {
    method, headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) { const e = await res.json().catch(()=>({detail:res.statusText})); throw new Error(e.detail) }
  return res.json()
}

// ── Tab nav ───────────────────────────────────────────────
const TABS = [
  { id:'summary',  icon:'📊', label:'Dashboard' },
  { id:'orders',   icon:'📦', label:'Orders'    },
  { id:'products', icon:'💊', label:'Products'  },
  { id:'users',    icon:'👥', label:'Users'     },
  { id:'content',  icon:'🎬', label:'Content'   },
  { id:'coupons',  icon:'🎟', label:'Coupons'   },
  { id:'config',   icon:'⚙️', label:'Config'    },
]

// ── Summary Tab ───────────────────────────────────────────
function SummaryTab() {
  const [data, setData] = useState(null)
  useEffect(() => { adminFetch('/api/admin/summary').then(setData).catch(console.error) }, [])
  if (!data) return <div style={{ padding:24, color: C.muted }}>Loading...</div>
  const stats = [
    { l:'Total Users',     v: data.totalUsers,       icon:'👥' },
    { l:'Total Orders',    v: data.totalOrders,       icon:'📦' },
    { l:'Paid Orders',     v: data.paidOrders,        icon:'✅' },
    { l:'Activations',     v: data.activations,       icon:'⚡' },
    { l:'Revenue',         v:`₹${(data.totalRevenue||0).toLocaleString()}`, icon:'💰' },
    { l:'Pending Ship',    v: data.pendingShipments,  icon:'🚚' },
  ]
  return (
    <div style={{ padding:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {stats.map(s => (
          <div key={s.l} style={{ background:'white', borderRadius:14, padding:'14px',
            border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
            <div style={{ color: C.gold, fontSize:22, fontWeight:800 }}>{s.v}</div>
            <div style={{ color: C.muted, fontSize:11 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Orders Tab ────────────────────────────────────────────
function OrdersTab() {
  const [orders,  setOrders]  = useState([])
  const [filter,  setFilter]  = useState('')
  const [sel,     setSel]     = useState(null)   // selected order for tracking update
  const [tracking,setTracking]= useState({ trackingId:'', trackingUrl:'', courierName:'', orderStatus:'' })
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  useEffect(() => {
    const url = filter ? `/api/admin/orders?status=${filter}` : '/api/admin/orders'
    adminFetch(url).then(r => setOrders(r.orders || [])).catch(console.error)
  }, [filter])

  async function saveTracking(orderId) {
    setSaving(true); setMsg('')
    try {
      await adminFetch(`/api/admin/orders/${orderId}/tracking`, { method:'PUT', body: tracking })
      setMsg('✅ Tracking updated. WhatsApp queued.')
      setSel(null)
      adminFetch('/api/admin/orders').then(r => setOrders(r.orders || []))
    } catch (e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  const STATUS_COLORS = {
    placed:'#3B82F6', processing:'#8B5CF6', shipped:'#F59E0B',
    out_for_delivery:'#EF4444', delivered:'#22C55E', cancelled:'#9CA3AF'
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:'flex', gap:8, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
        {['','placed','shipped','out_for_delivery','delivered'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding:'6px 14px', borderRadius:20, border:'none', whiteSpace:'nowrap',
              background: filter===s ? C.gold : 'white', color: filter===s ? C.onGold : C.muted,
              fontWeight:600, fontSize:12, cursor:'pointer' }}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {msg && <div style={{ background:'#F0FDF4', borderRadius:8, padding:'8px 12px',
        marginBottom:10, fontSize:13, color:'#15803D' }}>{msg}</div>}
      {orders.map(o => (
        <div key={o.id} style={{ background:'white', borderRadius:12, padding:'12px',
          marginBottom:8, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ color: C.muted, fontSize:11 }}>#{o.id?.slice(-8).toUpperCase()}</div>
            <div style={{ color: STATUS_COLORS[o.orderStatus] || C.muted, fontSize:12, fontWeight:700 }}>
              {o.orderStatus?.toUpperCase() || 'PLACED'}
            </div>
          </div>
          <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>
            {o.shipping?.name} · {o.shipping?.phone}
          </div>
          <div style={{ color: C.muted, fontSize:12 }}>{o.shipping?.city}, {o.shipping?.state}</div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <span style={{ color: C.gold, fontWeight:700 }}>₹{o.amount?.toLocaleString()}</span>
            <button onClick={() => { setSel(o.id); setTracking({ trackingId:o.trackingId||'', trackingUrl:o.trackingUrl||'', courierName:o.courierName||'', orderStatus:o.orderStatus||'placed' }) }}
              style={{ padding:'4px 12px', borderRadius:8, border:`1px solid ${C.gold}`,
                background:'transparent', color: C.gold, fontSize:12, cursor:'pointer' }}>
              Update Tracking
            </button>
          </div>

          {/* Inline tracking form */}
          {sel === o.id && (
            <div style={{ marginTop:10, background: C.bgMid, borderRadius:10, padding:12 }}>
              {[['Courier Name','courierName'],['Tracking ID','trackingId'],['Tracking URL','trackingUrl']].map(([l,k]) => (
                <div key={k} style={{ marginBottom:8 }}>
                  <div style={{ color: C.muted, fontSize:11, marginBottom:3 }}>{l}</div>
                  <input value={tracking[k]} onChange={e => setTracking(t=>({...t,[k]:e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`,
                      fontSize:13, boxSizing:'border-box', outline:'none' }} />
                </div>
              ))}
              <div style={{ marginBottom:8 }}>
                <div style={{ color: C.muted, fontSize:11, marginBottom:3 }}>Order Status</div>
                <select value={tracking.orderStatus} onChange={e => setTracking(t=>({...t,orderStatus:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`,
                    fontSize:13, boxSizing:'border-box' }}>
                  {['placed','processing','shipped','out_for_delivery','delivered'].map(s =>
                    <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => saveTracking(o.id)} disabled={saving}
                  style={{ flex:1, padding:'9px', borderRadius:8, border:'none',
                    background: C.gold, color: C.onGold, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {saving ? 'Saving...' : 'Save & Notify'}
                </button>
                <button onClick={() => setSel(null)}
                  style={{ padding:'9px 16px', borderRadius:8, border:`1px solid ${C.border}`,
                    background:'white', color: C.muted, fontSize:13, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Products Tab ──────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([])
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    adminFetch('/api/admin/products').then(r => setProducts(r.products||[])).catch(console.error)
  }, [])

  async function save(id) {
    setSaving(true); setMsg('')
    try {
      await adminFetch(`/api/products/${id}`, { method:'POST', body: { id, ...form } })
      setMsg('✅ Product updated')
      setEditing(null)
      adminFetch('/api/admin/products').then(r => setProducts(r.products||[]))
    } catch (e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding:16 }}>
      {msg && <div style={{ background:'#F0FDF4', borderRadius:8, padding:'8px 12px',
        marginBottom:10, fontSize:13, color:'#15803D' }}>{msg}</div>}
      {products.map(p => (
        <div key={p.id} style={{ background:'white', borderRadius:12, padding:'12px',
          marginBottom:8, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:22 }}>{p.icon}</span>
              <div>
                <div style={{ color: C.text, fontSize:13, fontWeight:700 }}>{p.brand}</div>
                <div style={{ color: C.muted, fontSize:11 }}>{p.id}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ color: C.gold, fontWeight:700, fontSize:14 }}>₹{p.price}</span>
              <button onClick={() => { setEditing(p.id); setForm({ price:p.price, mrp:p.mrp, active:p.active }) }}
                style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${C.gold}`,
                  background:'transparent', color: C.gold, fontSize:12, cursor:'pointer' }}>
                Edit
              </button>
            </div>
          </div>
          {editing === p.id && (
            <div style={{ marginTop:10, background: C.bgMid, borderRadius:10, padding:12 }}>
              {[['Price (₹)','price'],['MRP (₹)','mrp']].map(([l,k]) => (
                <div key={k} style={{ marginBottom:8 }}>
                  <div style={{ color: C.muted, fontSize:11, marginBottom:3 }}>{l}</div>
                  <input type="number" value={form[k]||''} onChange={e => setForm(f=>({...f,[k]:parseInt(e.target.value)||0}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`,
                      fontSize:13, boxSizing:'border-box', outline:'none' }} />
                </div>
              ))}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => save(p.id)} disabled={saving}
                  style={{ flex:1, padding:'9px', borderRadius:8, border:'none',
                    background: C.gold, color: C.onGold, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(null)}
                  style={{ padding:'9px 16px', borderRadius:8, border:`1px solid ${C.border}`,
                    background:'white', color: C.muted, fontSize:13, cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Config Tab ────────────────────────────────────────────
function ConfigTab() {
  const [config, setConfig] = useState(null)
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    adminFetch('/api/admin/config').then(d => { setConfig(d); setForm({ amountPaise: d.amountPaise, days: d.days }) }).catch(console.error)
  }, [])

  async function save() {
    setSaving(true); setMsg('')
    try {
      await adminFetch('/api/admin/config/activation', { method:'PATCH', body: form })
      setMsg('✅ Config updated')
    } catch (e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding:16 }}>
      {msg && <div style={{ background:'#F0FDF4', borderRadius:8, padding:'8px 12px',
        marginBottom:10, fontSize:13, color:'#15803D' }}>{msg}</div>}
      <div style={{ background:'white', borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
        <div style={{ color: C.text, fontSize:15, fontWeight:700, marginBottom:14 }}>
          ₹99 Activation Config
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ color: C.muted, fontSize:12, marginBottom:4 }}>Amount (paise — 9900 = ₹99)</div>
          <input type="number" value={form.amountPaise||9900}
            onChange={e => setForm(f=>({...f,amountPaise:parseInt(e.target.value)||9900}))}
            style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${C.border}`,
              fontSize:14, boxSizing:'border-box', outline:'none' }} />
          <div style={{ color: C.muted, fontSize:11, marginTop:4 }}>
            Display: ₹{Math.round((form.amountPaise||9900)/100)}
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ color: C.muted, fontSize:12, marginBottom:4 }}>Activation Days</div>
          <input type="number" value={form.days||7}
            onChange={e => setForm(f=>({...f,days:parseInt(e.target.value)||7}))}
            style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${C.border}`,
              fontSize:14, boxSizing:'border-box', outline:'none' }} />
        </div>
        <button onClick={save} disabled={saving}
          style={{ width:'100%', padding:'12px', borderRadius:10, border:'none',
            background: C.gold, color: C.onGold, fontWeight:700, fontSize:14, cursor:'pointer' }}>
          {saving ? 'Saving...' : 'Save Config'}
        </button>
      </div>
    </div>
  )
}

// ── Users Tab (read-only) ─────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  useEffect(() => { adminFetch('/api/admin/users').then(r => setUsers(r.users||[])).catch(console.error) }, [])
  return (
    <div style={{ padding:16 }}>
      {users.map(u => (
        <div key={u.id} style={{ background:'white', borderRadius:12, padding:'12px',
          marginBottom:8, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>
              <div style={{ color: C.text, fontSize:13, fontWeight:700 }}>{u.userName || 'Unknown'}</div>
              <div style={{ color: C.muted, fontSize:12 }}>📱 {u.phone}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color: u.isActivated ? '#22C55E' : C.muted, fontSize:11, fontWeight:600 }}>
                {u.isActivated ? '✅ Activated' : '⭕ Not activated'}
              </div>
              <div style={{ color: u.hasActivePlan ? C.gold : C.subtle, fontSize:11 }}>
                {u.hasActivePlan ? '💊 Purchased' : ''}
              </div>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize:11, marginTop:4 }}>
            VitaScore: {u.vitaScore || '--'} · {u.bodyTypeId || 'Quiz incomplete'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Content Tab ───────────────────────────────────────────
function ContentTab() {
  const [content, setContent] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type:'video', title:'', url:'', expert:'', duration:'', category:'', description:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { adminFetch('/api/admin/content').then(r => setContent(r.content||[])).catch(console.error) }, [])

  async function create() {
    setSaving(true); setMsg('')
    try {
      await adminFetch('/api/admin/content', { method:'POST', body: { ...form, active:true } })
      setMsg('✅ Content added')
      setShowForm(false)
      adminFetch('/api/admin/content').then(r => setContent(r.content||[]))
    } catch (e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding:16 }}>
      {msg && <div style={{ background:'#F0FDF4', borderRadius:8, padding:'8px 12px',
        marginBottom:10, fontSize:13 }}>{msg}</div>}
      <button onClick={() => setShowForm(!showForm)}
        style={{ width:'100%', padding:'12px', borderRadius:10, marginBottom:14, border:'none',
          background: showForm ? '#EEE' : C.gold, color: showForm ? C.muted : C.onGold,
          fontWeight:700, fontSize:14, cursor:'pointer' }}>
        {showForm ? 'Cancel' : '+ Add Video / Article'}
      </button>
      {showForm && (
        <div style={{ background:'white', borderRadius:14, padding:16,
          border:`1px solid ${C.border}`, marginBottom:14 }}>
          {[['Type','type',['video','article']],['Title','title'],['URL','url'],
            ['Expert','expert'],['Duration','duration'],['Category','category'],
            ['Description','description']].map(([l,k,opts]) => (
            <div key={k} style={{ marginBottom:10 }}>
              <div style={{ color: C.muted, fontSize:12, marginBottom:3 }}>{l}</div>
              {opts ? (
                <select value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`,
                    fontSize:13, boxSizing:'border-box', outline:'none' }} />
              )}
            </div>
          ))}
          <button onClick={create} disabled={saving}
            style={{ width:'100%', padding:'10px', borderRadius:8, border:'none',
              background: C.gold, color: C.onGold, fontWeight:700, cursor:'pointer' }}>
            {saving ? 'Saving...' : 'Add Content'}
          </button>
        </div>
      )}
      {content.map(c => (
        <div key={c.id} style={{ background:'white', borderRadius:12, padding:'12px',
          marginBottom:8, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', gap:10 }}>
            <span style={{ fontSize:20 }}>{c.type === 'video' ? '🎬' : '📄'}</span>
            <div>
              <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>{c.title}</div>
              <div style={{ color: C.muted, fontSize:11 }}>{c.expert} · {c.duration}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Admin Screen ─────────────────────────────────────
export default function AdminScreen() {
  const navigate = useNavigate()
  const [tab, setTab]     = useState('summary')
  const [auth, setAuth]   = useState(null)
  const [checking,setCk]  = useState(true)

  useEffect(() => {
    const fbAuth = getAuth()
    const unsub  = fbAuth.onAuthStateChanged(async user => {
      if (!user) { navigate('/'); return }
      try {
        // Check admin access
        await adminFetch('/api/admin/summary')
        setAuth(user)
      } catch {
        navigate('/')   // Not admin
      } finally { setCk(false) }
    })
    return unsub
  }, [])

  if (checking) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      background: C.bg }}>
      <div style={{ color: C.muted, fontSize:14 }}>Verifying admin access...</div>
    </div>
  )

  const TAB_CONTENT = {
    summary: <SummaryTab />, orders: <OrdersTab />, products: <ProductsTab />,
    users: <UsersTab />, content: <ContentTab />, config: <ConfigTab />,
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background: C.bgMid }}>
      {/* Header */}
      <div style={{ background: C.onGold === '#1A0E00' ? '#1A0E00' : '#1A0E00',
        padding:'16px 16px 0', flexShrink:0 }}>
        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, letterSpacing:2, marginBottom:4 }}>
          VI ADMIN PANEL
        </div>
        <div style={{ color:'white', fontSize:18, fontWeight:700, marginBottom:12 }}>
          Control Centre
        </div>
        {/* Tab bar */}
        <div style={{ display:'flex', gap:2, overflowX:'auto', paddingBottom:0 }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'8px 14px', cursor:'pointer', whiteSpace:'nowrap',
                borderBottom: tab===t.id ? '2px solid #FFD700' : '2px solid transparent',
                color: tab===t.id ? '#FFD700' : 'rgba(255,255,255,0.5)',
                fontSize:12, fontWeight:tab===t.id ? 700 : 400 }}>
              {t.icon} {t.label}
            </div>
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {TAB_CONTENT[tab] || <ContentTab />}
      </div>
    </div>
  )
}
