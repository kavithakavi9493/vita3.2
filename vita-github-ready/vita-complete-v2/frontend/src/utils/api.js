/**
 * VI V3.2 — Centralised API Client
 * ==================================
 * Added in V3.2:
 *   - codApi           (COD orders)
 *   - emailApi         (transactional email)
 *   - reviewsApi       (social proof)
 *   - logisticsApi     (tracking)
 */

import { getAuth } from 'firebase/auth'

const BASE = import.meta.env.VITE_API_URL || ''

// ── Core fetch wrapper ──────────────────────────────────────────
async function request(path, method = 'GET', body = null, requireAuth = true) {
  const auth  = getAuth()
  const user  = auth.currentUser
  const token = (requireAuth && user) ? await user.getIdToken() : null

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

const get    = (path, auth = true)        => request(path, 'GET',    null, auth)
const post   = (path, body, auth = true)  => request(path, 'POST',   body, auth)
const del    = (path, auth = true)        => request(path, 'DELETE', null, auth)

// ── Razorpay checkout helper ─────────────────────────────────────
export function openRazorpay({ keyId, orderId, amount, currency = 'INR',
                                name, phone, onSuccess, onFailure }) {
  if (!window.Razorpay) {
    console.error('Razorpay script not loaded')
    onFailure?.({ error: 'Razorpay not available' })
    return
  }
  const rzp = new window.Razorpay({
    key:         keyId,
    amount,
    currency,
    order_id:    orderId,
    name:        'VI Vita Intelligence',
    description: name || 'Health Stack',
    prefill:     { contact: phone || '' },
    theme:       { color: '#C9A84C' },
    handler:     (response) => onSuccess?.(response),
    modal:       { ondismiss: () => onFailure?.({ error: 'dismissed' }) },
  })
  rzp.open()
}

// ── V3 Core APIs ────────────────────────────────────────────────
export const productsApi = {
  list:  ()   => get('/api/products/'),
  get:   (id) => get(`/api/products/${id}`, false),
  stack: (bt) => get(`/api/products/recommend/stack?bodyTypeId=${bt}`, false),
}

export const quizApi = {
  save:     (body) => post('/api/quiz/save',    body),
  complete: (body) => post('/api/quiz/complete', body),
  get:      (uid)  => get(`/api/quiz/${uid}`),
  reset:    (uid)  => del(`/api/quiz/${uid}/reset`),
}

export const paymentsApi = {
  initiate:    (body) => post('/api/payments/initiate', body),
  verify:      (body) => post('/api/payments/verify',   body),
  createOrder: (body) => post('/api/payments/initiate', body),
  verifyOrder: (body) => post('/api/payments/verify',   body),
}

export const ordersApi = {
  create:  (body) => post('/api/orders/create',       body),
  list:    (uid)  => get(`/api/orders/${uid}`),
  get:     (oid)  => get(`/api/orders/detail/${oid}`),
  reorder: (oid)  => post(`/api/orders/reorder/${oid}`, {}),
}

export const couponsApi = {
  validate: (code) => get(`/api/coupons/validate/${code}`, false),
}

export const activationsApi = {
  createOrder: (body) => post('/api/activations/create-order', body),
  verify:      (body) => post('/api/activations/verify',       body),
  status:      (uid)  => get(`/api/activations/${uid}`),
}

export const trackingApi = {
  stats:       (uid)       => get(`/api/tracking/stats/${uid}`),
  logDay:      (body)      => post('/api/tracking/log', body),
  todayLog:    (uid)       => get(`/api/tracking/log/${uid}/today`),
  weekReport:  (uid, week) => get(`/api/tracking/report/${uid}/week/${week}`),
  weekCheckin: (body)      => post('/api/tracking/checkin', body),
}

// ── Phase 1: AI Chat ─────────────────────────────────────────────
export const chatApi = {
  send:    (message, history = [], userId = null, language = 'en') =>
    post('/api/chat/', { message, history, userId, language }, false),
  prompts: (language = 'en') =>
    get(`/api/chat/prompts?language=${language}`, false),
}

// ── Phase 1: Subscriptions ───────────────────────────────────────
export const subscriptionsApi = {
  create:  (body)          => post('/api/subscriptions/create',         body),
  get:     (uid)           => get(`/api/subscriptions/${uid}`),
  history: (uid)           => get(`/api/subscriptions/${uid}/history`),
  pause:   (subId, userId) => post(`/api/subscriptions/${subId}/pause`,  { userId }),
  resume:  (subId, userId) => post(`/api/subscriptions/${subId}/resume`, { userId }),
  skip:    (subId, userId) => post(`/api/subscriptions/${subId}/skip`,   { userId }),
  cancel:  (subId, userId, reason = '') =>
    post(`/api/subscriptions/${subId}/cancel`, { userId, reason }),
}

// ── Phase 1: Referrals ───────────────────────────────────────────
export const referralsApi = {
  generate:  ()                 => post('/api/referrals/generate', {}),
  dashboard: (uid)              => get(`/api/referrals/${uid}`),
  apply:     (userId, code)     => post('/api/referrals/apply',      { userId, code }),
  useCredit: (userId, amountRs) => post('/api/referrals/use-credit', { userId, orderAmountRs: amountRs }),
  history:   (uid)              => get(`/api/referrals/${uid}/history`),
}

// ── Phase 2: COD ─────────────────────────────────────────────────
export const codApi = {
  checkEligibility: (pincode, amount = 0) =>
    get(`/api/cod/eligibility?pincode=${pincode}&amount=${amount}`, false),
  createOrder: (body) => post('/api/cod/create-order',   body),
  cancel:      (oid)  => post(`/api/cod/cancel/${oid}`, {}),
}

// ── Phase 2: Logistics ────────────────────────────────────────────
export const logisticsApi = {
  checkServiceability: (pincode, cod = false) =>
    get(`/api/logistics/serviceability?pincode=${pincode}&cod=${cod}`, false),
  trackOrder: (oid) => get(`/api/logistics/track/${oid}`),
}

// ── Phase 2: Email ────────────────────────────────────────────────
export const emailApi = {
  sendOrderConfirmation: (body) => post('/api/email/order-confirmation',   body),
  sendReferralCredit:    (body) => post('/api/email/referral-credit',       body),
}

// ── Phase 2: Reviews ──────────────────────────────────────────────
export const reviewsApi = {
  submit:     (body)               => post('/api/reviews/submit',         body),
  forProduct: (productId, limit = 10) => get(`/api/reviews/product/${productId}?limit=${limit}`, false),
  summary:    (productId)          => get(`/api/reviews/summary/${productId}`, false),
  featured:   (limit = 6)          => get(`/api/reviews/featured?limit=${limit}`, false),
}
