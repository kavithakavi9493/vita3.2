/** VI — Tamil Translations (ta) */
const ta = {
  app: { name: 'VI விட்டா இன்டெலிஜென்ஸ்', tagline: 'இந்தியாவின் ஆண்கள் சுகாதார தளம்' },
  common: {
    loading: 'ஏற்றுகிறது...', error: 'ஏதோ தவறு நடந்தது', save: 'சேமி',
    cancel: 'ரத்து', back: 'பின்னால்', submit: 'சமர்ப்பி', confirm: 'உறுதிப்படுத்து',
    close: 'மூடு', yes: 'ஆம்', no: 'இல்லை', copy: 'நகல்', copied: 'நகலெடுக்கப்பட்டது!',
    share: 'பகிர்', continue: 'தொடர்', done: 'முடிந்தது', rupee: '₹', per_month: '/மாதம்',
  },
  nav: {
    dashboard: 'டாஷ்போர்டு', orders: 'ஆர்டர்கள்', profile: 'சுயவிவரம்',
    subscription: 'சந்தா', referral: 'பரிந்துரை', chat: 'VI கேளுங்கள்',
  },
  chat: {
    title: 'VI சுகாதார உதவியாளர்', subtitle: 'உங்கள் தனிப்பட்ட ஆயுர்வேத பயிற்சியாளர்',
    placeholder: 'உங்கள் சுகாதாரம் பற்றி எதுவும் கேளுங்கள்...',
    send: 'அனுப்பு', typing: 'VI யோசிக்கிறது...', free_label: 'இலவசம் · AI இயக்கப்படுகிறது',
    greeting: 'வணக்கம்! நான் உங்கள் VI சுகாதார பயிற்சியாளர். ஆண்கள் சுகாதாரம் பற்றி எதுவும் கேளுங்கள். 🙏',
    greeting_personalized: 'வணக்கம் {{name}}! உங்கள் {{bodyType}} சுயவிவரம் (VitaScore {{score}}) அடிப்படையில் நான் உதவ இங்கே இருக்கிறேன்.',
    suggested: 'பரிந்துரைக்கப்பட்ட கேள்விகள்',
    prompts: {
      energy: 'என் சக்தி குறைவாக இருக்கிறது ஏன்?', product: 'எனக்கு எந்த தயாரிப்பு சிறந்தது?',
      results: 'முடிவுகள் எப்போது தெரியும்?', combine: '2 தயாரிப்புகளை சேர்த்து எடுக்கலாமா?',
      missed: '3 நாட்கள் தவறவிட்டேன் — என்ன செய்வது?',
    },
    error: 'பதில் கிடைக்கவில்லை. மீண்டும் முயற்சி செய்யுங்கள்.',
  },
  subscription: {
    title: 'என் சந்தா', subtitle: 'சந்தா செலுத்தி மாதம் 15% சேமியுங்கள்',
    badge: 'சிறந்த மதிப்பு', monthly: 'மாதாந்திர',
    status: { active: 'செயலில்', paused: 'இடைநிறுத்தப்பட்டது', cancelled: 'ரத்து செய்யப்பட்டது', created: 'செயல்படுத்தப்படவில்லை', expired: 'காலாவதியானது' },
    next_billing: 'அடுத்த பில்லிங்', pause: 'இடைநிறுத்து', resume: 'மீண்டும் தொடங்கு', cancel: 'ரத்து செய்', skip: 'இம்மாதம் தவிர்',
    history: 'பில்லிங் வரலாறு', no_sub: 'செயலில் சந்தா இல்லை',
    subscribe_cta: 'சந்தா செலுத்தி ₹{{amount}}/மாதம் சேமியுங்கள்',
  },
  referral: {
    title: 'பரிந்துரைத்து சம்பாதியுங்கள்', subtitle: '₹200 கொடுங்கள். ₹200 பெறுங்கள்.',
    your_code: 'உங்கள் பரிந்துரை குறியீடு', whatsapp_share: 'WhatsApp இல் பகிரவும்',
    copy_code: 'குறியீடு நகல்', you_earn: 'நீங்கள் சம்பாதிப்பீர்கள்', friend_gets: 'உங்கள் நண்பருக்கு கிடைக்கும்',
    available_credit: 'கிடைக்கக்கூடிய கடன்', no_referrals: 'இன்னும் பரிந்துரைகள் இல்லை.',
  },
  language: { title: 'மொழி', select: 'மொழி தேர்ந்தெடுங்கள்', changed: 'மொழி புதுப்பிக்கப்பட்டது' },
  body_type: {
    HIGH_STRESS_LOW_VITALITY: 'அதிக மன அழுத்தம் / குறைந்த சக்தி', HORMONAL_DECLINE: 'ஹார்மோன் குறைவு',
    PERFORMANCE_DEFICIT: 'செயல்திறன் குறைபாடு', AGE_RELATED_DROP: 'வயது தொடர்பான சரிவு', PEAK_PERFORMANCE: 'உச்சகட்ட செயல்திறன்',
  },
}
export default ta
