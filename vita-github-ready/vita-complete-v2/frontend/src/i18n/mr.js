/** VI — Marathi Translations (mr) */
const mr = {
  app: { name: 'VI विटा इंटेलिजेन्स', tagline: 'भारताचे पुरुष आरोग्य व्यासपीठ' },
  common: {
    loading: 'लोड होत आहे...', error: 'काहीतरी चुकले', save: 'जतन करा',
    cancel: 'रद्द करा', back: 'मागे', submit: 'सबमिट', confirm: 'पुष्टी करा',
    close: 'बंद', yes: 'हो', no: 'नाही', copy: 'कॉपी', copied: 'कॉपी झाले!',
    share: 'शेअर करा', continue: 'पुढे चालू', done: 'झाले', rupee: '₹', per_month: '/महिना',
  },
  nav: {
    dashboard: 'डॅशबोर्ड', orders: 'ऑर्डर', profile: 'प्रोफाइल',
    subscription: 'सदस्यता', referral: 'रेफर करा', chat: 'VI ला विचारा',
  },
  chat: {
    title: 'VI आरोग्य सहाय्यक', subtitle: 'तुमचा वैयक्तिक आयुर्वेदिक कोच',
    placeholder: 'तुमच्या आरोग्याबद्दल काहीही विचारा...',
    send: 'पाठवा', typing: 'VI विचार करत आहे...', free_label: 'मोफत · AI द्वारे चालवले',
    greeting: 'नमस्कार! मी तुमचा VI आरोग्य कोच आहे. पुरुषांच्या आरोग्याबद्दल काहीही विचारा. 🙏',
    greeting_personalized: 'नमस्कार {{name}}! तुमच्या {{bodyType}} प्रोफाइलवर आधारित (VitaScore {{score}}) मी मदत करण्यासाठी येथे आहे.',
    suggested: 'सुचवलेले प्रश्न',
    prompts: {
      energy: 'माझी ऊर्जा कमी का आहे?', product: 'माझ्यासाठी कोणते उत्पादन सर्वोत्तम आहे?',
      results: 'परिणाम कधी दिसतील?', combine: '2 उत्पादने एकत्र घेता येतात का?',
      missed: '3 दिवस चुकले — आता काय करावे?',
    },
    error: 'उत्तर मिळाले नाही. पुन्हा प्रयत्न करा.',
  },
  subscription: {
    title: 'माझी सदस्यता', subtitle: 'सदस्यता घ्या आणि दरमहा 15% वाचवा',
    badge: 'सर्वोत्तम मूल्य', monthly: 'मासिक',
    status: { active: 'सक्रिय', paused: 'थांबवले', cancelled: 'रद्द', created: 'सक्रिय करायचे', expired: 'मुदत संपली' },
    next_billing: 'पुढील बिलिंग', pause: 'थांबवा', resume: 'पुन्हा सुरू करा', cancel: 'रद्द करा', skip: 'हा महिना वगळा',
    history: 'बिलिंग इतिहास', no_sub: 'कोणतीही सक्रिय सदस्यता नाही',
    subscribe_cta: 'सदस्यता घ्या आणि ₹{{amount}}/महिना वाचवा',
  },
  referral: {
    title: 'रेफर करा आणि कमवा', subtitle: '₹200 द्या. ₹200 मिळवा.',
    your_code: 'तुमचा रेफरल कोड', whatsapp_share: 'WhatsApp वर शेअर करा',
    copy_code: 'कोड कॉपी करा', you_earn: 'तुम्ही कमवाल', friend_gets: 'मित्राला मिळेल',
    available_credit: 'उपलब्ध क्रेडिट', no_referrals: 'अद्याप रेफरल नाही.',
  },
  language: { title: 'भाषा', select: 'भाषा निवडा', changed: 'भाषा अपडेट झाली' },
  body_type: {
    HIGH_STRESS_LOW_VITALITY: 'उच्च तणाव / कमी ऊर्जा', HORMONAL_DECLINE: 'हार्मोनल घट',
    PERFORMANCE_DEFICIT: 'कार्यक्षमता कमतरता', AGE_RELATED_DROP: 'वयाशी संबंधित घट', PEAK_PERFORMANCE: 'शिखर कार्यक्षमता',
  },
}
export default mr
