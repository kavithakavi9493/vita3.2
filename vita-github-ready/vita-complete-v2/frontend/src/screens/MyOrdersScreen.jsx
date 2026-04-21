/**
 * VI V3 — MyOrdersScreen
 * Order tracking + reorder button + WhatsApp tracking updates.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { useApp } from '../context/AppContext'
import { ordersApi } from '../utils/api'
import { analytics } from '../utils/analytics'
import { C, G } from '../constants/colors'

const STATUS_CONFIG = {
  placed:           { label:'Order Placed',        icon:'📋', color:'#3B82F6', step:1 },
  processing:       { label:'Processing',           icon:'⚙️', color:'#8B5CF6', step:2 },
  shipped:          { label:'Shipped',              icon:'🚚', color:'#F59E0B', step:3 },
  out_for_delivery: { label:'Out for Delivery',     icon:'📍', color:'#EF4444', step:4 },
  delivered:        { label:'Delivered',            icon:'✅', color:'#22C55E', step:5 },
  cancelled:        { label:'Cancelled',            icon:'❌', color:'#9CA3AF', step:0 },
}

function OrderCard({ order, onReorder }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed
  const steps  = ['placed','processing','shipped','out_for_delivery','delivered']
  const date   = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN',
    { day:'numeric', month:'short', year:'numeric' }) : ''

  return (
    <div style={{ background:'white', borderRadius:16, marginBottom:12,
      border:`1px solid ${C.border}`, overflow:'hidden',
      boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>

      {/* Order header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding:'14px 16px', cursor:'pointer',
          borderBottom: expanded ? `1px solid ${C.border}` : 'none' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div>
            <div style={{ color: C.muted, fontSize:11 }}>Order #{order.id?.slice(-8).toUpperCase()}</div>
            <div style={{ color: C.text, fontSize:14, fontWeight:700, marginTop:2 }}>
              {order.productDetails?.map(p => p.brand).join(', ') || `${order.products?.length} products`}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color: C.gold, fontSize:15, fontWeight:700 }}>₹{order.amount?.toLocaleString()}</div>
            <div style={{ color: C.muted, fontSize:11, marginTop:2 }}>{date}</div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6,
            background:`${status.color}15`, border:`1px solid ${status.color}40`,
            borderRadius:20, padding:'4px 12px' }}>
            <span style={{ fontSize:13 }}>{status.icon}</span>
            <span style={{ color: status.color, fontSize:12, fontWeight:700 }}>{status.label}</span>
          </div>
          <span style={{ color: C.muted, fontSize:18 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding:'14px 16px' }}>

          {/* Progress stepper */}
          {order.orderStatus !== 'cancelled' && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                {steps.map((s, i) => {
                  const sc   = STATUS_CONFIG[s]
                  const done = status.step > sc.step
                  const cur  = status.step === sc.step
                  return (
                    <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%',
                          background: done ? '#22C55E' : cur ? status.color : C.border,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, marginBottom:4 }}>
                          {done ? '✓' : <span style={{ color: cur ? 'white' : C.subtle }}>{i+1}</span>}
                        </div>
                        <div style={{ color: cur ? status.color : done ? '#22C55E' : C.subtle,
                          fontSize:8, textAlign:'center', lineHeight:1.2 }}>
                          {sc.label.split(' ').slice(0,2).join('\n')}
                        </div>
                      </div>
                      {i < steps.length-1 && (
                        <div style={{ height:2, flex:0.5, flexShrink:0, marginTop:-16,
                          background: done ? '#22C55E' : C.border }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tracking info */}
          {order.trackingId && (
            <div style={{ background: C.bgMid, borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ color: C.muted, fontSize:11, fontWeight:600, marginBottom:4 }}>TRACKING</div>
              <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>
                {order.courierName} — {order.trackingId}
              </div>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                  style={{ color: C.gold, fontSize:13, fontWeight:600 }}>
                  Track Package →
                </a>
              )}
            </div>
          )}

          {/* Shipping address */}
          {order.shipping && (
            <div style={{ background: C.bgMid, borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ color: C.muted, fontSize:11, fontWeight:600, marginBottom:4 }}>DELIVERY TO</div>
              <div style={{ color: C.text, fontSize:13, lineHeight:1.5 }}>
                {order.shipping.name}, {order.shipping.addressLine1},
                {order.shipping.addressLine2 ? ` ${order.shipping.addressLine2},` : ''}
                {` ${order.shipping.city}, ${order.shipping.state} — ${order.shipping.pincode}`}
              </div>
            </div>
          )}

          {/* Reorder button */}
          {order.orderStatus === 'delivered' && (
            <button onClick={() => onReorder(order.id)}
              style={{ width:'100%', padding:'12px', borderRadius:10,
                background: G.gold, border:'none', color: C.onGold,
                fontWeight:700, fontSize:14, cursor:'pointer' }}>
              🔄 Reorder This Stack
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyOrdersScreen() {
  const navigate    = useNavigate()
  const { state }   = useApp()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const auth  = getAuth()
        const token = await auth.currentUser?.getIdToken()
        const res   = await ordersApi.list(state.userId, token)
        setOrders(res.orders || [])
      } catch (e) {
        setError('Could not load orders. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [state.userId])

  async function handleReorder(orderId) {
    analytics.reorderClicked(state.userId, orderId)
    try {
      const auth  = getAuth()
      const token = await auth.currentUser?.getIdToken()
      const res   = await ordersApi.reorder(orderId, token)
      navigate('/checkout')
    } catch (e) {
      alert('Could not initiate reorder. Please try again.')
    }
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', background: C.bgMid }}>
      {/* Header */}
      <div style={{ background:'white', padding:'20px 20px 16px',
        borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none',
          color: C.text, fontSize:22, cursor:'pointer' }}>←</button>
        <div style={{ color: C.text, fontSize:18, fontWeight:700 }}>My Orders</div>
      </div>

      <div style={{ padding:'16px', paddingBottom:40 }}>
        {loading && (
          <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}>
            <div style={{ color: C.muted, fontSize:14 }}>Loading orders...</div>
          </div>
        )}
        {error && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
            padding:'12px 16px', color:'#DC2626', fontSize:14 }}>
            ⚠️ {error}
          </div>
        )}
        {!loading && !error && orders.length === 0 && (
          <div style={{ textAlign:'center', paddingTop:60 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
            <div style={{ color: C.text, fontSize:17, fontWeight:700, marginBottom:8 }}>No Orders Yet</div>
            <div style={{ color: C.muted, fontSize:14, marginBottom:24 }}>
              Your VI stack is waiting for you.
            </div>
            <button onClick={() => navigate('/product-stack')}
              style={{ padding:'14px 28px', borderRadius:14, border:'none',
                background: G.gold, color: C.onGold, fontWeight:700, fontSize:15, cursor:'pointer' }}>
              View Your Stack →
            </button>
          </div>
        )}
        {orders.map(o => (
          <OrderCard key={o.id} order={o} onReorder={handleReorder} />
        ))}
      </div>
    </div>
  )
}
