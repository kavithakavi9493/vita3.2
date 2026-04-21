/**
 * VI — Recommendation Engine V2
 * ==============================
 * Upgrades:
 *   1. Every recommendation now includes WHY (personalised explanation)
 *   2. Problem-to-product mapping is explicit and bidirectional
 *   3. Stack builder returns enriched objects (id, name, price, why, urgency)
 */
import { BODY_TYPES } from './bodyTypes'
export { BODY_TYPES }

// ── Problem signals → Product mapping ────────────────────────────
// When user answers quiz with these signals, these products are triggered
export const SYMPTOM_PRODUCT_MAP = {
  low_energy:         ['testosterone_boost', 'night_recovery', 'age_performance'],
  high_stress:        ['stress_calm', 'night_recovery'],
  low_libido:         ['libido_boost', 'testosterone_boost', 'intimacy_shot'],
  poor_sleep:         ['night_recovery', 'stress_calm'],
  timing_issues:      ['timing_control', 'performance_oil'],
  weak_erection:      ['erection_support', 'performance_oil'],
  low_confidence:     ['timing_control', 'erection_support', 'intimacy_shot'],
  hormonal_decline:   ['testosterone_boost', 'libido_boost', 'sperm_health'],
  age_related:        ['age_performance', 'ultra_performance', 'night_recovery'],
  peak_maintenance:   ['testosterone_boost', 'intimacy_shot', 'stress_calm'],
}

// ── WHY explanations per body type + product ─────────────────────
export const RECOMMENDATION_WHY = {
  HIGH_STRESS_LOW_VITALITY: {
    stress_calm: {
      headline: "Your stress is destroying your testosterone.",
      detail:   "High cortisol (the stress hormone) directly suppresses T production. You can't fix energy or libido until you fix this root cause. Manas Veerya breaks the cycle first.",
      urgency:  "high",
    },
    night_recovery: {
      headline: "80% of testosterone is made while you sleep.",
      detail:   "Poor sleep = poor hormone production. Rasayana Shakti with Magnesium Glycinate improves deep sleep phases where hormonal repair happens. Results in 3–5 nights.",
      urgency:  "high",
    },
    testosterone_boost: {
      headline: "Once stress drops, your T needs rebuilding.",
      detail:   "After Manas Veerya calms cortisol, Vajra Veerya with KSM-66 accelerates hormonal recovery. The two work in sequence for maximum effect.",
      urgency:  "medium",
    },
    libido_boost: {
      headline: "Stress is the #1 libido killer for your type.",
      detail:   "Kaam Veerya's Kapikacchu directly targets the dopamine pathway that controls desire — often suppressed by chronic stress. Works alongside stress management.",
      urgency:  "medium",
    },
    intimacy_shot: {
      headline: "On-demand support for when desire is low.",
      detail:   "Even while your body repairs, Kaam Agni Ras provides same-session ignition. Saffron and Shilajit Extract work within 30 minutes.",
      urgency:  "low",
    },
    performance_oil: {
      headline: "Immediate local support, zero internal load.",
      detail:   "Vajra Tailam works topically — no digestion needed. Instant blood flow enhancement while your internal systems rebuild.",
      urgency:  "low",
    },
  },
  HORMONAL_DECLINE: {
    testosterone_boost: {
      headline: "Your quiz shows classic low-T markers.",
      detail:   "Low energy, reduced drive, muscle loss — these are all testosterone. Vajra Veerya with 500mg Shilajit + KSM-66 is clinically shown to support 17% T increase. This is your foundation.",
      urgency:  "high",
    },
    libido_boost: {
      headline: "Low T means low desire — they're the same problem.",
      detail:   "Kaam Veerya's Safed Musli and Gokshura target the hormonal drivers of desire directly. Not just symptom relief — root cause work.",
      urgency:  "high",
    },
    sperm_health: {
      headline: "Hormonal decline affects reproductive health too.",
      detail:   "Beej Shakti's 90-day protocol supports sperm count and motility using Zinc, Selenium, and Kapikacchu. Paired with testosterone support for comprehensive hormonal health.",
      urgency:  "medium",
    },
    night_recovery: {
      headline: "You're losing hormones every night of poor sleep.",
      detail:   "Testosterone production peaks in deep sleep. Rasayana Shakti optimises this window — critical for your body type.",
      urgency:  "medium",
    },
    intimacy_shot: {
      headline: "Immediate support while hormones rebuild.",
      detail:   "Kaam Agni Ras provides the on-demand boost you need while Vajra Veerya does its 4–6 week work. Bridge the gap.",
      urgency:  "medium",
    },
    performance_oil: {
      headline: "Topical support completes the stack.",
      detail:   "Local blood flow enhancement while internal hormonal work continues. Zero system load.",
      urgency:  "low",
    },
  },
  PERFORMANCE_DEFICIT: {
    timing_control: {
      headline: "This is your most urgent fix.",
      detail:   "Sthambhan Shakti's Akarkara and Jaiphal are specifically chosen for timing support. Most users notice a difference from the first use. 2–3 weeks for consistent results.",
      urgency:  "high",
    },
    erection_support: {
      headline: "Firmness issues start in the blood vessels.",
      detail:   "Dridha Stambh improves vascular health at the root. Vidarikanda and Gokshura improve blood flow at the cellular level — not just surface level.",
      urgency:  "high",
    },
    performance_oil: {
      headline: "Immediate 15-minute effect. No waiting.",
      detail:   "Vajra Tailam's Akarkara and Clove Extract enhance local sensitivity and blood flow topically. Works alongside Sthambhan Shakti for best results.",
      urgency:  "high",
    },
    intimacy_shot: {
      headline: "Confidence comes first. Everything else follows.",
      detail:   "When performance anxiety takes over, Kaam Agni Ras provides the mental and physical edge 30 minutes before. Saffron directly reduces performance-related anxiety.",
      urgency:  "medium",
    },
    testosterone_boost: {
      headline: "Low T amplifies performance issues.",
      detail:   "Addressing hormonal root cause removes one more variable from performance anxiety. Vajra Veerya supports the hormonal side while Sthambhan Shakti handles the performance side.",
      urgency:  "medium",
    },
    stress_calm: {
      headline: "Performance anxiety is stress. Treat it as such.",
      detail:   "Manas Veerya with L-Theanine reduces the anxiety response that causes performance issues. Mental calm is a physical performance tool.",
      urgency:  "low",
    },
  },
  AGE_RELATED_DROP: {
    age_performance: {
      headline: "Designed specifically for men 35+.",
      detail:   "Yuva Vajra's Shilajit Resin contains 85+ minerals that decline with age. Clinical studies show significant improvements in energy and drive. This is your foundation product.",
      urgency:  "high",
    },
    testosterone_boost: {
      headline: "Works synergistically with Yuva Vajra.",
      detail:   "Adding Vajra Veerya's KSM-66 to your protocol accelerates recovery. The two products target different pathways — combined effect is greater than either alone.",
      urgency:  "high",
    },
    sperm_health: {
      headline: "Age affects reproductive health significantly.",
      detail:   "Sperm quality declines 1-2% per year after 30. Beej Shakti's 90-day protocol reverses this trajectory with Zinc, Selenium, and Kapikacchu.",
      urgency:  "medium",
    },
    night_recovery: {
      headline: "Recovery slows with age. Compensate for it.",
      detail:   "Men 35+ produce 60% of their testosterone during sleep. Rasayana Shakti maximises this window with Magnesium Glycinate and Tart Cherry.",
      urgency:  "medium",
    },
    ultra_performance: {
      headline: "Maximum support for men serious about reversing the clock.",
      detail:   "Maha Vajra with Swarna Bhasma is premium-tier. For men who want comprehensive support — energy, drive, performance, and stamina — all addressed simultaneously.",
      urgency:  "low",
    },
    libido_boost: {
      headline: "Desire naturally declines with age. It doesn't have to.",
      detail:   "Kaam Veerya's Kapikacchu rebuilds the neural pathways of desire that age suppresses. The difference is felt in weeks 2–4.",
      urgency:  "low",
    },
  },
  PEAK_PERFORMANCE: {
    testosterone_boost: {
      headline: "Maintenance is what separates peak from decline.",
      detail:   "Even men with good baseline levels benefit from Vajra Veerya's support. KSM-66 prevents the natural decline while supporting current peak levels.",
      urgency:  "high",
    },
    intimacy_shot: {
      headline: "Peak performers know the difference between good and exceptional.",
      detail:   "Kaam Agni Ras provides the pre-activity edge that separates your best from your standard. Saffron, Zinc, and Ginseng in one shot.",
      urgency:  "high",
    },
    performance_oil: {
      headline: "The final 10% that most men miss.",
      detail:   "Topical support adds a layer that internal supplements can't provide. Immediate, local, and effective within 15 minutes.",
      urgency:  "medium",
    },
    stress_calm: {
      headline: "High performers are often high-stress. Protect your edge.",
      detail:   "Cortisol attacks even the best-maintained testosterone levels. Manas Veerya prevents stress from eroding what you've built.",
      urgency:  "medium",
    },
    night_recovery: {
      headline: "Performance recovery happens at night. Don't miss this layer.",
      detail:   "Rasayana Shakti optimises the sleep window for hormone production and physical recovery. Top athletes prioritise sleep — this amplifies its effect.",
      urgency:  "medium",
    },
    sperm_health: {
      headline: "Proactive reproductive health for peak men.",
      detail:   "Beej Shakti maintains sperm quality at peak levels. Preventive maintenance, not crisis management.",
      urgency:  "low",
    },
  },
}

// ── Body type detection (unchanged from V1) ───────────────────────
export function detectBodyType(state) {
  const { mentalScore, lifestyleScore, physicalScore, performanceScore,
    ageGroup, vitaScore, stressLevel, anxietyLevel, fatigueLevel,
    libidoLevel, timingControl, erectionQuality } = state

  if (ageGroup === '36-45' || ageGroup === '45+') return BODY_TYPES.AGE_RELATED_DROP

  const stressIndicators = [
    mentalScore < 10, lifestyleScore < 10, stressLevel === 'High',
    anxietyLevel === 'Often', fatigueLevel === 'Frequently',
  ].filter(Boolean).length
  if (stressIndicators >= 3) return BODY_TYPES.HIGH_STRESS_LOW_VITALITY

  const perfIndicators = [
    performanceScore < 10,
    timingControl === 'Often' || timingControl === 'Sometimes',
    erectionQuality === 'Weak' || erectionQuality === 'Moderate',
  ].filter(Boolean).length
  if (perfIndicators >= 2) return BODY_TYPES.PERFORMANCE_DEFICIT

  const hormoneIndicators = [
    physicalScore < 10, libidoLevel === 'Low',
    vitaScore < 55, (mentalScore < 12 && performanceScore < 12),
  ].filter(Boolean).length
  if (hormoneIndicators >= 2) return BODY_TYPES.HORMONAL_DECLINE

  return BODY_TYPES.PEAK_PERFORMANCE
}

// ── Stack maps (unchanged from V1) ────────────────────────────────
export const STACK_MAP = {
  HIGH_STRESS_LOW_VITALITY: ['stress_calm', 'night_recovery', 'testosterone_boost', 'intimacy_shot', 'performance_oil', 'libido_boost'],
  HORMONAL_DECLINE:         ['testosterone_boost', 'libido_boost', 'sperm_health', 'intimacy_shot', 'night_recovery', 'performance_oil'],
  PERFORMANCE_DEFICIT:      ['timing_control', 'erection_support', 'performance_oil', 'testosterone_boost', 'intimacy_shot', 'stress_calm'],
  AGE_RELATED_DROP:         ['age_performance', 'testosterone_boost', 'sperm_health', 'night_recovery', 'ultra_performance', 'libido_boost'],
  PEAK_PERFORMANCE:         ['testosterone_boost', 'intimacy_shot', 'performance_oil', 'stress_calm', 'night_recovery', 'sperm_health'],
}

export const STACK_SIZE = {
  AGE_RELATED_DROP: 5, HIGH_STRESS_LOW_VITALITY: 4,
  HORMONAL_DECLINE: 4, PERFORMANCE_DEFICIT: 4, PEAK_PERFORMANCE: 3,
}

/**
 * Get recommended stack with WHY for each product.
 * Returns enriched objects: { id, name, price, why: { headline, detail, urgency } }
 */
export function getRecommendedStack(bodyTypeId, allProducts) {
  const ids    = STACK_MAP[bodyTypeId]  || STACK_MAP.PEAK_PERFORMANCE
  const size   = STACK_SIZE[bodyTypeId] || 3
  const whyMap = RECOMMENDATION_WHY[bodyTypeId] || {}

  return ids.slice(0, size)
    .map(id => {
      const product = allProducts.find(p => p.id === id)
      if (!product) return null
      return {
        ...product,
        why:        whyMap[id] || null,
        isTopPick:  ids.indexOf(id) === 0,
      }
    })
    .filter(Boolean)
}

/**
 * Get the #1 most important product for a body type with full WHY.
 * Used in result screen hero section.
 */
export function getPrimaryRecommendation(bodyTypeId, allProducts) {
  const topId  = (STACK_MAP[bodyTypeId] || STACK_MAP.PEAK_PERFORMANCE)[0]
  const whyMap = RECOMMENDATION_WHY[bodyTypeId] || {}
  const product = allProducts.find(p => p.id === topId)
  if (!product) return null
  return {
    ...product,
    why:       whyMap[topId] || null,
    isTopPick: true,
  }
}

/**
 * Get cross-sell recommendation for a user who owns specific products.
 * Used in dashboard and chatbot cross-sell logic.
 */
export function getCrossSellRecommendation(bodyTypeId, ownedProductIds, allProducts) {
  const ids    = STACK_MAP[bodyTypeId] || STACK_MAP.PEAK_PERFORMANCE
  const whyMap = RECOMMENDATION_WHY[bodyTypeId] || {}
  const unowned = ids.filter(id => !ownedProductIds.includes(id))

  if (!unowned.length) return null

  const topUnowned = unowned[0]
  const product    = allProducts.find(p => p.id === topUnowned)
  if (!product) return null

  return {
    ...product,
    why:     whyMap[topUnowned] || null,
    message: `Based on your progress, ${whyMap[topUnowned]?.headline || 'this could help your next phase'}`,
  }
}

// Bundle pricing (unchanged)
export function calcBundlePrice(products, subscribeAndSave = false) {
  const individual = products.reduce((s, p) => s + (p.price || 0), 0)
  const mrpSum     = products.reduce((s, p) => s + (p.mrp || p.price || 0), 0)
  let bundled      = products.length >= 2 ? Math.round(individual * 0.85) : individual
  if (subscribeAndSave) bundled = Math.round(bundled * 0.85)
  return { individual, mrpSum, bundled, saving: individual - bundled }
}

export { BODY_TYPES as default }
