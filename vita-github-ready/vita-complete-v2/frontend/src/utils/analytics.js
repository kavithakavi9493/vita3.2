/**
 * VI V3 — Analytics (Firebase Analytics wrapper)
 * Swap provider later by changing this file only.
 */
import { getAnalytics, logEvent as fbLog } from 'firebase/analytics'
import { getApp } from 'firebase/app'

let _analytics = null
function ga() {
  if (!_analytics) { try { _analytics = getAnalytics(getApp()) } catch { return null } }
  return _analytics
}

function track(eventName, params = {}) {
  try {
    const a = ga()
    if (a) fbLog(a, eventName, params)
    if (import.meta.env.DEV) console.log('[Analytics]', eventName, params)
  } catch (e) { /* non-blocking */ }
}

export const analytics = {
  // Quiz
  quizStarted:     (userId)             => track('quiz_started',          { userId }),
  quizCompleted:   (userId, vitaScore, bodyTypeId) =>
                                           track('quiz_completed',         { userId, vitaScore, bodyTypeId }),
  // Activation
  activationViewed:(userId)             => track('activation_viewed',     { userId }),
  activationStarted:(userId)            => track('activation_started',    { userId }),
  activationSuccess:(userId)            => track('activation_success',    { userId }),

  // Payment
  checkoutStarted: (userId, amount)     => track('checkout_started',      { userId, amount }),
  paymentSuccess:  (userId, amount, orderId) =>
                                           track('payment_success',       { userId, amount, orderId }),
  paymentFailed:   (userId, reason)     => track('payment_failed',        { userId, reason }),

  // Engagement
  dailyCheckin:    (userId, streak)     => track('daily_checkin',         { userId, streak }),
  taskCompleted:   (userId, taskId)     => track('task_completed',        { userId, taskId }),
  weeklyReport:    (userId, weekNum)    => track('weekly_report_viewed',  { userId, weekNum }),
  bodyAvatarViewed:(userId, bodyType)   => track('body_avatar_viewed',    { userId, bodyType }),
  day7Conversion:  (userId)             => track('day7_conversion_viewed',{ userId }),
  reorderClicked:  (userId, orderId)    => track('reorder_clicked',       { userId, orderId }),

  // Content
  videoPlayed:     (userId, videoId)    => track('video_played',          { userId, videoId }),
  articleOpened:   (userId, articleId)  => track('article_opened',        { userId, articleId }),

  // Screen
  screenView:      (screenName)         => track('screen_view',           { screen_name: screenName }),
}
