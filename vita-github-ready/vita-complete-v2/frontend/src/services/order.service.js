/**
 * VI — Order Service
 * ==================
 * Centralises all order-related logic.
 * Handles both online (Razorpay) and COD orders.
 * Screens call this service — not API directly.
 */

import { ordersApi, paymentsApi, codApi, emailApi, openRazorpay } from '../utils/api'
import { analytics } from '../utils/analytics'

/**
 * Place a Razorpay (online payment) order.
 *
 * Flow:
 *   1. Create order in Firestore (ordersApi.create)
 *   2. Create Razorpay order (paymentsApi.initiate)
 *   3. Open Razorpay checkout
 *   4. On success → verify payment (paymentsApi.verify)
 *   5. Send confirmation email
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string[]} params.products
 * @param {Object} params.shipping
 * @param {string} params.razorpayKeyId
 * @param {string} [params.couponCode]
 * @param {boolean} [params.subscribeAndSave]
 * @param {string} [params.bodyTypeId]
 * @param {string} [params.userName]
 * @param {string} [params.userPhone]
 * @param {string} [params.userEmail]
 * @param {Function} params.onSuccess
 * @param {Function} params.onFailure
 */
export async function placeOnlineOrder({
  userId, products, shipping, razorpayKeyId,
  couponCode = '', subscribeAndSave = false, bodyTypeId = '',
  userName = '', userPhone = '', userEmail = '',
  onSuccess, onFailure,
}) {
  try {
    analytics.checkoutStarted(userId, 0)

    // Step 1: Create order record in Firestore
    const order = await ordersApi.create({
      userId, products, shipping,
      bodyTypeId, couponCode, subscribeAndSave,
      paymentMethod: 'online',
    })

    const { orderId, amount } = order

    // Step 2: Create Razorpay order
    const rzpOrder = await paymentsApi.initiate({
      userId, orderId, amount: amount * 100,  // Convert ₹ to paise
      note: 'product_purchase',
    })

    // Step 3: Open Razorpay checkout
    openRazorpay({
      keyId:    razorpayKeyId,
      orderId:  rzpOrder.razorpayOrderId,
      amount:   amount * 100,
      name:     shipping.name || userName,
      phone:    shipping.phone || userPhone,

      onSuccess: async (response) => {
        try {
          // Step 4: Verify payment
          await paymentsApi.verify({
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderId,
            userId,
          })

          analytics.paymentSuccess(userId, amount, orderId)

          // Step 5: Send confirmation email (non-blocking)
          if (userEmail) {
            emailApi.sendOrderConfirmation({
              userId, orderId, email: userEmail,
              name: userName || shipping.name,
              amount, products, shipping, paymentMethod: 'online',
            }).catch(() => {/* non-blocking */})
          }

          onSuccess?.({ orderId, amount })
        } catch (verifyError) {
          // Payment went through but verification failed — needs manual check
          console.error('Payment verification failed:', verifyError)
          analytics.paymentFailed(userId, 'verification_failed')
          onFailure?.({ error: 'verification_failed', orderId })
        }
      },

      onFailure: (err) => {
        analytics.paymentFailed(userId, err.error || 'dismissed')
        onFailure?.(err)
      },
    })

  } catch (error) {
    console.error('placeOnlineOrder error:', error)
    onFailure?.({ error: error.message })
  }
}


/**
 * Place a Cash on Delivery order.
 * Simpler — no Razorpay, just creates order and shows success.
 *
 * @returns {Promise<{orderId, amount, handlingFee, confirmBy}>}
 */
export async function placeCODOrder({
  userId, products, shipping,
  couponCode = '', bodyTypeId = '',
  userName = '', userEmail = '',
}) {
  analytics.checkoutStarted(userId, 0)

  const result = await codApi.createOrder({
    userId, products, shipping, couponCode, bodyTypeId,
  })

  analytics.paymentSuccess(userId, result.amount, result.orderId)

  // Send confirmation email (non-blocking)
  if (userEmail) {
    emailApi.sendOrderConfirmation({
      userId, orderId: result.orderId, email: userEmail,
      name: userName || shipping.name,
      amount: result.amount, products, shipping, paymentMethod: 'cod',
    }).catch(() => {/* non-blocking */})
  }

  return result
}


/**
 * Check if COD is available for a given pincode and order amount.
 * Call this in CheckoutScreen when user enters address.
 */
export async function checkCODEligibility(pincode, amount) {
  try {
    return await codApi.checkEligibility(pincode, amount)
  } catch {
    return { eligible: false, reason: 'Could not check COD availability' }
  }
}


/**
 * Reorder: fetch previous order and initiate new checkout.
 */
export async function reorder(orderId) {
  return ordersApi.reorder(orderId)
}
