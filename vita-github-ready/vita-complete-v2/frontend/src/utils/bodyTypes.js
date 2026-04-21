/**
 * VI V3 — Centralised body type definitions (string product IDs)
 */
export const ZONES = {
  brain:        { label: 'Brain & HPA Axis',    color: '#DC2626', glow: '#FF6B6B' },
  heart:        { label: 'Cardiovascular',       color: '#7C3AED', glow: '#A78BFA' },
  adrenal:      { label: 'Adrenal & Hormones',   color: '#D97706', glow: '#FCD34D' },
  reproductive: { label: 'Reproductive System',  color: '#B91C1C', glow: '#F87171' },
}

export const BODY_TYPES = {
  HIGH_STRESS_LOW_VITALITY: {
    id: 'HIGH_STRESS_LOW_VITALITY', label: 'High Stress / Low Vitality',
    icon: '🧠', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA',
    urgency: 'HIGH', zones: ['brain','adrenal'],
    shortDesc: 'Chronic stress is draining your life force',
    description: 'Your nervous system is in overdrive. Elevated cortisol is directly suppressing testosterone and depleting your body\'s vital Ojas (life force). Most urgent pattern to address.',
    coreIssues: ['Cortisol overload','Testosterone suppression','Chronic fatigue','Sleep disruption'],
    whatHappens: 'Without treatment: stress → low sleep → lower testosterone → more fatigue → more stress. You\'re in a compounding loop.',
    productIds: ['stress_calm','night_recovery','testosterone_boost','intimacy_shot','performance_oil','libido_boost'],
  },
  HORMONAL_DECLINE: {
    id: 'HORMONAL_DECLINE', label: 'Hormonal Decline',
    icon: '⚗️', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE',
    urgency: 'HIGH', zones: ['adrenal','reproductive'],
    shortDesc: 'Your hormonal system needs targeted support',
    description: 'Your body\'s hormonal production is running below optimal. Low testosterone creates a cascade — reduced libido, declining performance, and depleted energy.',
    coreIssues: ['Low testosterone','Reduced libido','Hormonal imbalance','Performance decline'],
    whatHappens: 'Hormonal decline at this stage is silent but compounding. Without intervention, every month pushes the baseline lower.',
    productIds: ['testosterone_boost','libido_boost','sperm_health','intimacy_shot','night_recovery','performance_oil'],
  },
  PERFORMANCE_DEFICIT: {
    id: 'PERFORMANCE_DEFICIT', label: 'Performance Deficit',
    icon: '⚡', color: '#D97706', bgColor: '#FFFBEB', borderColor: '#FDE68A',
    urgency: 'HIGH', zones: ['heart','reproductive'],
    shortDesc: 'Performance issues affecting confidence & intimacy',
    description: 'Your vascular function and neuromuscular coordination need targeted support. The ancient Siddha masters had precise formulas for exactly this pattern.',
    coreIssues: ['Timing control','Erection strength','Stamina','Low confidence'],
    whatHappens: 'Performance issues create a psychological loop — anxiety reduces performance, which increases anxiety. Early intervention breaks this cycle.',
    productIds: ['timing_control','erection_support','performance_oil','testosterone_boost','intimacy_shot','stress_calm'],
  },
  AGE_RELATED_DROP: {
    id: 'AGE_RELATED_DROP', label: 'Age-Related Decline',
    icon: '🕐', color: '#1E3A5F', bgColor: '#EEF2F8', borderColor: '#BFDBFE',
    urgency: 'CRITICAL', zones: ['brain','heart','adrenal','reproductive'],
    shortDesc: 'Natural testosterone decline accelerating after 35',
    description: 'After 35, testosterone drops 3–5% every year. Without targeted support this compounds into fatigue, performance decline, and reduced vitality.',
    coreIssues: ['3–5% annual testosterone drop','Slower recovery','Reduced drive','Compound decline'],
    whatHappens: 'This is biology — but not inevitable. Rasayana protocols were specifically developed for men at exactly this crossroads.',
    productIds: ['age_performance','testosterone_boost','sperm_health','night_recovery','ultra_performance','libido_boost'],
  },
  PEAK_PERFORMANCE: {
    id: 'PEAK_PERFORMANCE', label: 'Optimisation Mode',
    icon: '🏆', color: '#15803D', bgColor: '#F0FDF4', borderColor: '#BBF7D0',
    urgency: 'MODERATE', zones: [],
    shortDesc: 'Strong foundation — push to peak performance',
    description: 'Your vitality foundation is solid. A precision VI stack will push you from good to extraordinary — maximising energy, performance, and drive.',
    coreIssues: ['Performance plateau','Untapped potential','Optimisation','Peak maintenance'],
    whatHappens: 'Most men at this stage plateau and slowly decline. The right stack locks in your gains and raises the ceiling.',
    productIds: ['testosterone_boost','intimacy_shot','performance_oil','stress_calm','night_recovery','sperm_health'],
  },
}

export function getStackSize(bodyTypeId) {
  return { AGE_RELATED_DROP:5, HIGH_STRESS_LOW_VITALITY:4, HORMONAL_DECLINE:4, PERFORMANCE_DEFICIT:4, PEAK_PERFORMANCE:3 }[bodyTypeId] || 3
}

export function getBundlePrice(products, subscribeAndSave = false) {
  const total  = products.reduce((s,p) => s + p.price, 0)
  const mrpSum = products.reduce((s,p) => s + p.mrp,   0)
  let bundlePrice = products.length >= 2 ? Math.round(total * 0.85) : total
  if (subscribeAndSave) bundlePrice = Math.round(bundlePrice * 0.85)
  return { total, mrpSum, bundlePrice, saving: total - bundlePrice }
}
