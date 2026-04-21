/** VI — Telugu Translations (te) */
const te = {
  app: { name: 'VI విటా ఇంటెలిజెన్స్', tagline: 'భారతదేశ పురుషుల ఆరోగ్య వేదిక' },
  common: {
    loading: 'లోడ్ అవుతోంది...', error: 'ఏదో తప్పు జరిగింది', save: 'సేవ్ చేయి',
    cancel: 'రద్దు', back: 'వెనక్కి', submit: 'సబ్మిట్', confirm: 'నిర్ధారించు',
    close: 'మూసివేయి', yes: 'అవును', no: 'కాదు', copy: 'కాపీ', copied: 'కాపీ అయింది!',
    share: 'షేర్', continue: 'కొనసాగించు', done: 'పూర్తయింది', rupee: '₹', per_month: '/నెల',
  },
  nav: {
    dashboard: 'డాష్‌బోర్డ్', orders: 'ఆర్డర్లు', profile: 'ప్రొఫైల్',
    subscription: 'సబ్‌స్క్రిప్షన్', referral: 'రెఫర్ చేయండి', chat: 'VI ని అడగండి',
  },
  chat: {
    title: 'VI ఆరోగ్య సహాయకుడు', subtitle: 'మీ వ్యక్తిగత ఆయుర్వేదిక కోచ్',
    placeholder: 'మీ ఆరోగ్యం గురించి ఏదైనా అడగండి...',
    send: 'పంపు', typing: 'VI ఆలోచిస్తోంది...', free_label: 'ఉచిత · AI ఆధారిత',
    greeting: 'నమస్కారం! నేను మీ VI ఆరోగ్య కోచ్ని. పురుషుల ఆరోగ్యం గురించి ఏదైనా అడగండి. 🙏',
    greeting_personalized: 'నమస్కారం {{name}}! మీ {{bodyType}} ప్రొఫైల్ ఆధారంగా (VitaScore {{score}}) నేను సహాయం చేయడానికి ఇక్కడ ఉన్నాను.',
    suggested: 'సూచించిన ప్రశ్నలు',
    prompts: {
      energy: 'నా శక్తి తక్కువగా ఎందుకు ఉంది?', product: 'నాకు ఏ ఉత్పత్తి బాగా పని చేస్తుంది?',
      results: 'ఫలితాలు ఎప్పుడు కనిపిస్తాయి?', combine: '2 ఉత్పత్తులు కలిపి తీసుకోవచ్చా?',
      missed: '3 రోజులు మిస్ అయ్యాను — ఏమి చేయాలి?',
    },
    error: 'సమాధానం రాలేదు. మళ్ళీ ప్రయత్నించండి.',
  },
  subscription: {
    title: 'నా సబ్‌స్క్రిప్షన్', subtitle: 'సబ్‌స్క్రైబ్ చేసి నెలకు 15% ఆదా చేయండి',
    badge: 'అత్యుత్తమ విలువ', monthly: 'నెలవారీ',
    status: { active: 'సక్రియంగా ఉంది', paused: 'నిలిపివేయబడింది', cancelled: 'రద్దు చేయబడింది', created: 'సక్రియం చేయాలి', expired: 'గడువు ముగిసింది' },
    next_billing: 'తదుపరి బిల్లింగ్', pause: 'నిలిపివేయండి', resume: 'పునఃప్రారంభించండి', cancel: 'రద్దు చేయండి', skip: 'ఈ నెల స్కిప్ చేయండి',
    history: 'బిల్లింగ్ చరిత్ర', no_sub: 'సక్రియ సబ్‌స్క్రిప్షన్ లేదు',
    subscribe_cta: 'సబ్‌స్క్రైబ్ చేసి ₹{{amount}}/నెల ఆదా చేయండి',
  },
  referral: {
    title: 'రెఫర్ చేసి సంపాదించండి', subtitle: '₹200 ఇవ్వండి. ₹200 పొందండి.',
    your_code: 'మీ రెఫరల్ కోడ్', whatsapp_share: 'WhatsApp లో షేర్ చేయండి',
    copy_code: 'కోడ్ కాపీ చేయండి', you_earn: 'మీరు సంపాదిస్తారు', friend_gets: 'మీ స్నేహితుడికి దొరుకుతుంది',
    available_credit: 'అందుబాటులో ఉన్న క్రెడిట్', no_referrals: 'ఇంకా రెఫరల్స్ లేవు.',
  },
  language: { title: 'భాష', select: 'భాష ఎంచుకోండి', changed: 'భాష అప్‌డేట్ అయింది' },
  body_type: {
    HIGH_STRESS_LOW_VITALITY: 'అధిక ఒత్తిడి / తక్కువ శక్తి', HORMONAL_DECLINE: 'హార్మోనల్ తగ్గుదల',
    PERFORMANCE_DEFICIT: 'పనితీరు లోపం', AGE_RELATED_DROP: 'వయసుకు సంబంధించిన తగ్గుదల', PEAK_PERFORMANCE: 'గరిష్ట పనితీరు',
  },
}
export default te
