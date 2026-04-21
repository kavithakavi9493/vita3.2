/**
 * VI V3 — CheckoutScreen
 * Coupon input, Subscribe & Save toggle, manual shipping, server-side pricing.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { useApp } from '../context/AppContext'
import { ordersApi, paymentsApi, couponsApi, openRazorpay } from '../utils/api'
import { getBundlePrice } from '../utils/bodyTypes'
import { GoldBtn, ErrorBanner, Spinner, Toggle } from '../components/UI'
import { analytics } from '../utils/analytics'
import { C, G } from '../constants/colors'

const INDIAN_STATES = ['Andhra Pradesh','Assam','Bihar','Delhi','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal']

function Field({ label, value, onChange, type='text', placeholder='', options=null }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: C.muted, fontSize: 12, fontWeight: 600,
        display: 'block', marginBottom: 5 }}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width:'100%', padding:'12px 14px', borderRadius:10,
            border:`1px solid ${C.border}`, background:'white',
            color: value ? C.text : C.subtle, fontSize:14, outline:'none' }}>
          <option value="">Select {label}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width:'100%', padding:'12px 14px', borderRadius:10,
            border:`1px solid ${C.border}`, background:'white',
            color: C.text, fontSize:14, outline:'none', boxSizing:'border-box' }} />
      )}
    </div>
  )
}

export default function CheckoutScreen() {
  const navigate  = useNavigate()
  const { state } = useApp()
  const stack     = state.recommendedStack || []

  const [subscribeAndSave, setSubscribeAndSave] = useState(false)
  const [selectedProducts, setSelectedProducts]   = useState(stack.map(p => p.id))
  const [couponCode,  setCouponCode]  = useState('')
  const [couponValid, setCouponValid] = useState(null)   // null | {valid, discount, type, message}
  const [couponApplied, setCouponApplied] = useState('')
  const [couponSaving, setCouponSaving] = useState(0)
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const [name,     setName]    = useState(state.userName || '')
  const [phone,    setPhone]   = useState(state.phone    || '')
  const [addr1,    setAddr1]   = useState('')
  const [addr2,    setAddr2]   = useState('')
  const [city,     setCity]    = useState('')
  const [stateSel, setStateSel]= useState('')
  const [pincode,  setPincode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const activeProducts = stack.filter(p => selectedProducts.includes(p.id))
  const bundle         = getBundlePrice(activeProducts, subscribeAndSave)
  const displayPrice   = Math.max(bundle.bundlePrice - couponSaving, 0)

  function toggleProduct(id) {
    if (selectedProducts.includes(id) && selectedProducts.length === 1) return  // min 1
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setCouponApplied('')
    setCouponSaving(0)
    setCouponValid(null)
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCheckingCoupon(true)
    setCouponValid(null)
    try {
      const res = await couponsApi.validate(couponCode)
      setCouponValid(res)
      if (res.valid) {
        const saving = res.type === 'percent'
          ? Math.round(bundle.bundlePrice * res.discount / 100)
          : Math.min(res.discount, bundle.bundlePrice)
        setCouponSaving(saving)
        setCouponApplied(couponCode.toUpperCase())
      } else {
        setCouponSaving(0)
        setCouponApplied('')
      }
    } catch (e) {
      setCouponValid({ valid: false, message: 'Could not validate coupon' })
    } finally {
      setCheckingCoupon(false)
    }
  }

  async function handleOrder() {
    setError('')
    if (!name || !phone || !addr1 || !city || !stateSel || !pincode) {
      setError('Please fill in all shipping fields'); return
    }
    if (activeProducts.length === 0) {
      setError('Select at least 1 product'); return
    }
    setLoading(true)
    analytics.checkoutStarted(state.userId, displayPrice)
    try {
      const auth  = getAuth()
      const token = await auth.currentUser?.getIdToken()

      const orderRes = await ordersApi.create({
        userId:    state.userId,
        products:  selectedProducts,
        bodyTypeId:state.bodyTypeId,
        couponCode: couponApplied,
        subscribeAndSave,
        shipping:  { name, phone, addressLine1:addr1, addressLine2:addr2, city, state:stateSel, pincode },
      }, token)

      const payRes = await paymentsApi.initiate({
        userId:  state.userId,
        orderId: orderRes.orderId,
        amount:  orderRes.amount * 100,   // to paise
        note:    'product_purchase',
      }, token)

      openRazorpay({
        orderId:   payRes.razorpayOrderId,
        amount:    payRes.amount,
        userName:  name,
        phone,
        email:     state.email,
        onSuccess: async (resp) => {
          try {
            await paymentsApi.verify({
              userId:            state.userId,
              orderId:           orderRes.orderId,
              razorpayOrderId:   resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }, token)
            analytics.paymentSuccess(state.userId, orderRes.amount, orderRes.orderId)
            navigate('/success')
          } catch {
            navigate('/failure')
          }
        },
        onFailure: () => { setError('Payment cancelled.'); setLoading(false) },
      })
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', background: C.bgMid, paddingBottom:100 }}>
      {/* Header */}
      <div style={{ background:'white', padding:'20px 20px 16px',
        borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none',
          color: C.text, fontSize:22, cursor:'pointer' }}>←</button>
        <div style={{ color: C.text, fontSize:18, fontWeight:700 }}>Checkout</div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Product selection */}
        <div style={{ color: C.muted, fontSize:11, fontWeight:700,
          letterSpacing:1.5, marginBottom:10 }}>YOUR STACK</div>
        {stack.map(p => {
          const active = selectedProducts.includes(p.id)
          const isLast = selectedProducts.length === 1 && active
          return (
            <div key={p.id} onClick={() => toggleProduct(p.id)}
              style={{ background:'white', borderRadius:14, padding:'12px 14px',
                marginBottom:8, border:`1.5px solid ${active ? C.gold : C.border}`,
                display:'flex', gap:12, alignItems:'center', cursor: isLast ? 'default' : 'pointer',
                opacity: active ? 1 : 0.5, transition:'all .2s' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
                background: active ? C.gold : 'transparent',
                border: active ? 'none' : `2px solid ${C.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:12 }}>{active ? '✓' : ''}</div>
              <span style={{ fontSize:20 }}>{p.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>{p.brand}</div>
                <div style={{ color: C.muted, fontSize:11 }}>{p.cat}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color: C.gold, fontSize:14, fontWeight:700 }}>₹{p.price}</div>
                <div style={{ color: C.subtle, fontSize:11, textDecoration:'line-through' }}>₹{p.mrp}</div>
              </div>
            </div>
          )
        })}
        {activeProducts.length < stack.length && (
          <p style={{ color: C.muted, fontSize:11, marginBottom:8 }}>
            * Deselected products removed from bundle
          </p>
        )}

        {/* Subscribe & Save */}
        <div style={{ background:'white', borderRadius:14, padding:'12px 16px',
          marginBottom:14, border:`1px solid ${C.border}` }}>
          <Toggle
            value={subscribeAndSave}
            onChange={setSubscribeAndSave}
            label="Subscribe & Save 15%"
            sub="Auto-reorder every month. Cancel anytime."
          />
        </div>

        {/* Coupon */}
        <div style={{ background:'white', borderRadius:14, padding:'16px',
          marginBottom:14, border:`1px solid ${C.border}` }}>
          <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>
            🎟 Have a coupon?
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponValid(null) }}
              placeholder="Enter code (e.g. VI20)"
              style={{ flex:1, padding:'11px 14px', borderRadius:10,
                border:`1px solid ${couponValid?.valid ? '#22C55E' : couponValid?.valid === false ? '#DC2626' : C.border}`,
                color: C.text, fontSize:14, outline:'none' }}
            />
            <button onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim()}
              style={{ padding:'11px 18px', borderRadius:10, border:'none',
                background: C.gold, color:'white', fontWeight:700, fontSize:13,
                cursor: checkingCoupon ? 'wait' : 'pointer',
                opacity: !couponCode.trim() ? 0.5 : 1 }}>
              {checkingCoupon ? '...' : 'Apply'}
            </button>
          </div>
          {couponValid && (
            <div style={{ marginTop:8, color: couponValid.valid ? '#15803D' : '#DC2626', fontSize:13 }}>
              {couponValid.valid ? `✓ ${couponValid.message} — saving ₹${couponSaving}` : `✗ ${couponValid.message}`}
            </div>
          )}
        </div>

        {/* Price summary */}
        <div style={{ background:'white', borderRadius:14, padding:'16px',
          border:`2px solid ${C.gold}`, marginBottom:20,
          boxShadow:'0 4px 20px rgba(184,134,11,0.12)' }}>
          {bundle.saving > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color: C.muted, fontSize:13 }}>Bundle savings</span>
              <span style={{ color:'#15803D', fontSize:13, fontWeight:600 }}>− ₹{bundle.saving}</span>
            </div>
          )}
          {subscribeAndSave && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color: C.muted, fontSize:13 }}>Subscribe & Save</span>
              <span style={{ color:'#15803D', fontSize:13, fontWeight:600 }}>15% off</span>
            </div>
          )}
          {couponSaving > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color: C.muted, fontSize:13 }}>Coupon ({couponApplied})</span>
              <span style={{ color:'#15803D', fontSize:13, fontWeight:600 }}>− ₹{couponSaving}</span>
            </div>
          )}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:4,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color: C.text, fontSize:16, fontWeight:700 }}>Total</span>
            <span style={{ color: C.gold, fontSize:24, fontWeight:800 }}>
              ₹{displayPrice.toLocaleString()}
            </span>
          </div>
          <p style={{ color: C.muted, fontSize:11, marginTop:4 }}>
            Free delivery · Authentic Ayurvedic · 30-day satisfaction guarantee
          </p>
        </div>

        {/* Shipping form */}
        <div style={{ color: C.muted, fontSize:11, fontWeight:700,
          letterSpacing:1.5, marginBottom:14 }}>DELIVERY DETAILS</div>
        <div style={{ background:'white', borderRadius:14, padding:'16px',
          border:`1px solid ${C.border}`, marginBottom:20 }}>
          <Field label="Full Name *"    value={name}     onChange={setName}    placeholder="Rahul Sharma" />
          <Field label="Phone *"        value={phone}    onChange={setPhone}   placeholder="9876543210" type="tel" />
          <Field label="Address Line 1 *" value={addr1}  onChange={setAddr1}   placeholder="House/Flat No, Street" />
          <Field label="Address Line 2" value={addr2}    onChange={setAddr2}   placeholder="Area, Landmark (optional)" />
          <Field label="City *"         value={city}     onChange={setCity}    placeholder="Bangalore" />
          <Field label="State *"        value={stateSel} onChange={setStateSel} options={INDIAN_STATES} />
          <Field label="Pincode *"      value={pincode}  onChange={setPincode} placeholder="560001" type="number" />
        </div>

        <ErrorBanner message={error} />

        <GoldBtn onClick={handleOrder} disabled={loading || activeProducts.length === 0}>
          {loading ? 'Processing...' : `Pay ₹${displayPrice.toLocaleString()} →`}
        </GoldBtn>
        <p style={{ color: C.subtle, fontSize:11, textAlign:'center', marginTop:10 }}>
          🔒 Secure payment via Razorpay · UPI · Cards · Net Banking
        </p>
      </div>
    </div>
  )
}
