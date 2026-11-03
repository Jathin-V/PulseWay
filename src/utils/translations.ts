import type { LanguageCode } from './clinicalLogic';

export interface SurvivalProtocol {
  id: string;
  category: string;
  title: Record<LanguageCode, string>;
  windowText: Record<LanguageCode, string>;
  aloneSteps: Record<LanguageCode, string[]>;
  assistedSteps: Record<LanguageCode, string[]>;
}

export const SURVIVAL_PROTOCOLS: SurvivalProtocol[] = [
  {
    id: 'cardiac',
    category: 'Cardiac Arrest / Severe Chest Pain',
    title: {
      en: 'Heart Attack & Acute Chest Pain',
      kn: 'ಹೃದಯಾಘಾತ ಮತ್ತು ತೀವ್ರ ಎದೆ ನೋವು',
      hi: 'हार्ट अटैक और तेज सीने में दर्द',
    },
    windowText: {
      en: 'Golden Window: First 60 Minutes',
      kn: 'ಸುವರ್ಣ ಸಮಯ: ಮೊದಲ 60 ನಿಮಿಷಗಳು',
      hi: 'गोल्डन विंडो: पहले 60 मिनट',
    },
    aloneSteps: {
      en: [
        'Stop all movement immediately; sit leaning at a 45° angle against a wall or sofa.',
        'Unlock your front door immediately so paramedics can enter if you feel faint.',
        'Chew 1 tablet of Aspirin 300mg (Disprin) slowly if not allergic; do NOT swallow whole with water.',
      ],
      kn: [
        'ತಕ್ಷಣವೇ ಎಲ್ಲಾ ಚಟುವಟಿಕೆ ನಿಲ್ಲಿಸಿ; ಗೋಡೆಗೆ ಒರಗಿ 45° ಕೋನದಲ್ಲಿ ಕುಳಿತುಕೊಳ್ಳಿ.',
        'ಪ್ಯಾರಾಮೆಡಿಕ್ಸ್ ಒಳಬರಲು ಸುಲಭವಾಗುವಂತೆ ಮನೆಯ ಮುಖ್ಯ ಬಾಗಿಲನ್ನು ತೆರೆದಿಡಿ.',
        'ಅಲರ್ಜಿ ಇಲ್ಲದಿದ್ದರೆ ಆಸ್ಪಿರಿನ್ 300mg (Disprin) ಮಾತ್ರೆಯನ್ನು ನಿಧಾನವಾಗಿ ಜಗಿಯಿರಿ.',
      ],
      hi: [
        'तुरंत हर गतिविधि रोकें; दीवार के सहारे 45° के कोण पर बैठ जाएं।',
        'घर का मुख्य दरवाजा तुरंत अनलॉक करें ताकि पैरामेडिक्स आसानी से अंदर आ सकें।',
        'यदि एलर्जी न हो तो एस्पिरिन 300mg (Disprin) की 1 गोली चबाएं।',
      ],
    },
    assistedSteps: {
      en: [
        'Keep the patient semi-seated; loosen tight shirt collars, ties, and waist belts.',
        'If the patient becomes unresponsive and stops breathing, begin hands-only CPR (100–120/min).',
        'Keep past ECG reports or medication strips ready for the ALS paramedic.',
      ],
      kn: [
        'ರೋಗಿಯನ್ನು ಅರೆ-ಕುಳಿತುಕೊಳ್ಳುವ ಭಂಗಿಯಲ್ಲಿ ಇರಿಸಿ; ಬಿಗಿಯಾದ ಬಟ್ಟೆಗಳನ್ನು ಸಡಿಲಗೊಳಿಸಿ.',
        'ರೋಗಿಯು ಪ್ರಜ್ಞೆ ತಪ್ಪಿ ಉಸಿರಾಟ ನಿಲ್ಲಿಸಿದರೆ ತಕ್ಷಣವೇ ಎದೆಯ ಮಧ್ಯಭಾಗದಲ್ಲಿ CPR ಪ್ರಾರಂಭಿಸಿ.',
        'ಹಳೆಯ ವೈದ್ಯಕೀಯ ವರದಿ ಮತ್ತು ಮಾತ್ರೆಗಳ ಪಟ್ಟಿಯನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.',
      ],
      hi: [
        'मरीज को आधी बैठी मुद्रा में रखें और तंग कपड़े ढीले करें।',
        'यदि मरीज बेहोश हो जाए और सांस रुक जाए, तो तुरंत छाती के बीच में CPR शुरू करें।',
        'मरीज की पुरानी दवाइयां और रिपोर्ट पैरामेडिक को दिखाने के लिए तैयार रखें।',
      ],
    },
  },
  {
    id: 'labour',
    category: 'Active Labour & Obstetric Delivery',
    title: {
      en: 'Active Labour & Emergency Childbirth',
      kn: 'ತುರ್ತು ಹೆರಿಗೆ ನೋವು (Active Labour)',
      hi: 'प्रसव पीड़ा और आपातकालीन डिलीवरी',
    },
    windowText: {
      en: 'Maternal & Neonatal Safe Protocol',
      kn: 'ತಾಯಿ ಮತ್ತು ಮಗುವಿನ ಸುರಕ್ಷತಾ ಕ್ರಮ',
      hi: 'मातृ एवं नवजात सुरक्षा प्रोटोकॉल',
    },
    aloneSteps: {
      en: [
        'Lie down on your left side over a clean bedsheet or pillows; never stay standing.',
        'Practice slow rhythmic breathing and avoid pushing early.',
        'Unlock your door and keep two clean dry towels and a warm blanket beside you.',
      ],
      kn: [
        'ಸ್ವಚ್ಛವಾದ ಹಾಸಿಗೆಯ ಮೇಲೆ ಎಡಭಾಗಕ್ಕೆ ತಿರುಗಿ ಮಲಗಿ; ನಿಲ್ಲಬೇಡಿ.',
        'ನಿಧಾನವಾಗಿ ಉಸಿರಾಡಿ ಮತ್ತು ವೈದ್ಯಕೀಯ ಸಿಬ್ಬಂದಿ ಬರುವವರೆಗೆ ಜೋರಾಗಿ ತಳ್ಳಬೇಡಿ.',
        'ಬಾಗಿಲು ತೆರೆದಿಡಿ ಹಾಗೂ ಎರಡು ಸ್ವಚ್ಛವಾದ ಟವೆಲ್ ಪಕ್ಕದಲ್ಲಿಟ್ಟುಕೊಳ್ಳಿ.',
      ],
      hi: [
        'साफ चादर पर बाईं करवट लेकर लेट जाएं; खड़ी न रहें।',
        'धीमी और गहरी सांस लें; पैरामेडिक्स के आने से पहले जोर न लगाएं।',
        'दरवाजा खुला रखें और पास में दो साफ तौलिए व गर्म कंबल रखें।',
      ],
    },
    assistedSteps: {
      en: [
        'Position the mother on her left side; time the minutes between contractions.',
        'If the baby’s head crowns before the ambulance arrives, support gently with clean hands—never pull.',
        'Keep clean warm towels ready to wrap the newborn immediately.',
      ],
      kn: [
        'ತಾಯಿಯನ್ನು ಎಡಭಾಗಕ್ಕೆ ಮಲಗಿಸಿ; ಸಂಕೋಚನಗಳ ನಡುವಿನ ಸಮಯವನ್ನು ಗುರುತಿಸಿ.',
        'ಮಗುವಿನ ತಲೆ ಕಾಣಿಸಿಕೊಂಡರೆ ಸ್ವಚ್ಛ ಕೈಗಳಿಂದ ನಿಧಾನವಾಗಿ ಆಧಾರ ನೀಡಿ (ಎಳೆಯಬೇಡಿ).',
        'ಮಗುವನ್ನು ಒಣಗಿಸಿ ತಾಯಿಯ ಎದೆಯ ಮೇಲಿಟ್ಟು ಬೆಚ್ಚಗಿನ ಬಟ್ಟೆಯಿಂದ ಹೊದಿಸಿ.',
      ],
      hi: [
        'माँ को बाईं करवट लिटाएं और संकुचन (Contractions) के बीच का समय नोट करें।',
        'यदि शिशु का सिर दिखने लगे, तो साफ हाथों से हल्का सहारा दें (खींचें नहीं)।',
        'डिलीवरी होने पर शिशु को तुरंत साफ कपड़े से पोंछकर गर्म कंबल ओढ़ाएं।',
      ],
    },
  },
  {
    id: 'stroke',
    category: 'Acute Stroke (BE-FAST)',
    title: {
      en: 'Acute Brain Stroke (BE-FAST Protocol)',
      kn: 'ಪಾರ್ಶ್ವವಾಯು / ಸ್ಟ್ರೋಕ್ (BE-FAST)',
      hi: 'ब्रेन स्ट्रोक / लकवा (BE-FAST)',
    },
    windowText: {
      en: 'Golden Thrombolysis Window: < 4.5 Hours',
      kn: 'ಚಿಕಿತ್ಸೆಯ ಸುವರ್ಣ ಸಮಯ: 4.5 ಗಂಟೆಯೊಳಗೆ',
      hi: 'गोल्डन विंडो: 4.5 घंटे के भीतर',
    },
    aloneSteps: {
      en: [
        'Lie down immediately on your side with your head supported at 30 degrees.',
        'Do NOT attempt to drink water, eat food, or take any oral tablets.',
        'Unlock the door immediately and request an ALS Stroke Unit.',
      ],
      kn: [
        'ತಲೆಯ ಕೆಳಗೆ ದಿಂಬನ್ನು ಇಟ್ಟು ಒಂದು ಬದಿಗೆ ತಿರುಗಿ ಮಲಗಿ.',
        'ನೀರು, ಆಹಾರ ಅಥವಾ ಯಾವುದೇ ಮಾತ್ರೆಯನ್ನು ನುಂಗಲು ಪ್ರಯತ್ನಿಸಬೇಡಿ.',
        'ತಕ್ಷಣ ಬಾಗಿಲು ತೆರೆದು ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆಸಿ.',
      ],
      hi: [
        'सिर के नीचे तकिया रखकर तुरंत करवट लेकर लेट जाएं।',
        'पानी, खाना या कोई भी दवा निगलने की कोशिश न करें।',
        'तुरंत दरवाजा खोलें और स्ट्रोक एम्बुलेंस बुलाएं।',
      ],
    },
    assistedSteps: {
      en: [
        'Check BE-FAST: Balance, Eyes, Face drooping, Arm weakness, Speech, Time.',
        'Record the exact minute symptoms were first noticed.',
        'Keep the patient on their side (recovery position) and monitor breathing.',
      ],
      kn: [
        'ಮುಖ ವಕ್ರವಾಗುವುದು, ಕೈ ಕಾಲು ಶಕ್ತಿ ಕಳೆದುಕೊಳ್ಳುವುದು ಮತ್ತು ಮಾತು ತೊದಲುವುದನ್ನು ಗಮನಿಸಿ.',
        'ಲಕ್ಷಣಗಳು ಪ್ರಾರಂಭವಾದ ನಿಖರವಾದ ಸಮಯವನ್ನು ಬರೆದಿಟ್ಟುಕೊಳ್ಳಿ.',
        'ರೋಗಿಯನ್ನು ಒಂದು ಬದಿಗೆ ಮಲಗಿಸಿ ಉಸಿರಾಟವನ್ನು ಗಮನಿಸುತ್ತಿರಿ.',
      ],
      hi: [
        'चेहरा टेढ़ा होना, हाथ में कमजोरी और आवाज लड़खड़ाने की जांच करें।',
        'लक्षण शुरू होने का सटीक समय नोट करें।',
        'मरीज को करवट से लिटाएं और सांस की निगरानी करें।',
      ],
    },
  },
];

export const UI_TRANSLATIONS: Record<
  LanguageCode,
  {
    citizenPortalTitle: string;
    falseReportWarning: string;
    dropdownPlaceholder: string;
    chatPlaceholder: string;
    sendBtn: string;
    dispatchAlsBtn: string;
    categories: Array<{ label: string; prompt: string; critical: boolean }>;
    awaitingHospitalTitle: string;
    awaitingHospitalSub: string;
    ambulanceDispatchedTitle: string;
    familyNotifiedBadge: string;
    voicePlayedOnceBadge: string;
    survivalGuideTitle: string;
    chatHistoryTitle: string;
    accountSettingsTitle: string;
    aloneMode: string;
    assistedMode: string;
    logout: string;
  }
> = {
  en: {
    citizenPortalTitle: 'PulseWay Mobile SOS',
    falseReportWarning:
      'Warning: Filing false reports or prank submissions is strictly prohibited and subject to legal penalties.',
    dropdownPlaceholder: 'Select an emergency or symptom from list...',
    chatPlaceholder: 'Type emergency or symptom...',
    sendBtn: 'Send',
    dispatchAlsBtn: 'Request ALS Ambulance Now',
    categories: [
      { label: '🚨 Active Labour / Contractions', prompt: 'Patient is having active labour contractions every 3 minutes and water broke', critical: true },
      { label: '🚨 Severe Chest Pain / Cardiac Arrest', prompt: 'Severe crushing chest pain radiating to left arm with heavy sweating', critical: true },
      { label: '🚨 Brain Stroke / Slurred Speech', prompt: 'Sudden face drooping, right arm weakness, and slurred speech', critical: true },
      { label: '🚨 Major Road Accident / Severe Bleeding', prompt: 'Road accident victim with heavy bleeding and fracture', critical: true },
      { label: '🚨 Acute Breathing Failure / Choking', prompt: 'Severe difficulty breathing and gasping for air', critical: true },
      { label: '🚨 Unconscious / Seizure Emergency', prompt: 'Patient collapsed suddenly and is unconscious with seizures', critical: true },
    ],
    awaitingHospitalTitle: 'Waiting for Nearest Hospital Approval & Ambulance Allotment',
    awaitingHospitalSub:
      'Your emergency medical profile and live location have been sent to the nearest hospital. The ambulance will be dispatched as soon as the hospital allots a unit.',
    ambulanceDispatchedTitle: 'ALS Ambulance Allotted & En Route',
    familyNotifiedBadge: 'Alert sent to Emergency Contacts (Mom, Dad) via WhatsApp & Messenger',
    voicePlayedOnceBadge: 'Pre-recorded automated voice reassurance announced (Played 1x)',
    survivalGuideTitle: 'Survival Guide',
    chatHistoryTitle: 'AI Chat & Solved Emergency History (Read-Only)',
    accountSettingsTitle: 'Account Settings',
    aloneMode: 'If Alone',
    assistedMode: 'Assisted',
    logout: 'Log Out',
  },
  kn: {
    citizenPortalTitle: 'PulseWay ಮೊಬೈಲ್ SOS',
    falseReportWarning:
      'Warning: Filing false reports or prank submissions is strictly prohibited and subject to legal penalties.',
    dropdownPlaceholder: 'ಪ್ರಮುಖ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ...',
    chatPlaceholder: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...',
    sendBtn: 'ಕಳುಹಿಸಿ',
    dispatchAlsBtn: 'ತಕ್ಷಣವೇ ALS ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆಸಿ',
    categories: [
      { label: '🚨 ತುರ್ತು ಹೆರಿಗೆ ನೋವು (Active Labour)', prompt: 'ಗರ್ಭಿಣಿಗೆ ತೀವ್ರ ಹೆರಿಗೆ ನೋವು (active labour contractions) ಪ್ರಾರಂಭವಾಗಿದೆ', critical: true },
      { label: '🚨 ತೀವ್ರ ಎದೆ ನೋವು / ಹೃದಯಾಘಾತ (Cardiac)', prompt: 'ತೀವ್ರ ಎದೆ ನೋವು ಮತ್ತು ಬೆವರುವಿಕೆ ಕಾಣಿಸಿಕೊಂಡಿದೆ (severe chest pain)', critical: true },
      { label: '🚨 ಪಾರ್ಶ್ವವಾಯು / ಸ್ಟ್ರೋಕ್ (Stroke)', prompt: 'ಹಠಾತ್ ಮಾತು ತೊದಲುವಿಕೆ ಮತ್ತು ಕೈ ಕಾಲು ನಿಶ್ಶಕ್ತಿ (stroke symptoms)', critical: true },
      { label: '🚨 ಭೀಕರ ರಸ್ತೆ ಅಪಘಾತ / ತೀವ್ರ ರಕ್ತಸ್ರಾವ', prompt: 'ರಸ್ತೆ ಅಪಘಾತವಾಗಿ ತೀವ್ರ ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆ (road accident bleeding)', critical: true },
      { label: '🚨 ತೀವ್ರ ಉಸಿರಾಟದ ತೊಂದರೆ', prompt: 'ಉಸಿರಾಡಲು ತೀವ್ರ ತೊಂದರೆಯಾಗುತ್ತಿದೆ (difficulty breathing)', critical: true },
      { label: '🚨 ಪ್ರಜ್ಞಾಹೀನ ಸ್ಥಿತಿ (Unconscious)', prompt: 'ರೋಗಿಯು ಹಠಾತ್ ಪ್ರಜ್ಞೆ ತಪ್ಪಿ ಬಿದ್ದಿದ್ದಾರೆ (unconscious emergency)', critical: true },
    ],
    awaitingHospitalTitle: 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಯ ಅನುಮೋದನೆ ಮತ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್ ಹಂಚಿಕೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ',
    awaitingHospitalSub:
      'ಆಸ್ಪತ್ರೆಯ ಕಮಾಂಡ್ ಸೆಂಟರ್ ಆಂಬ್ಯುಲೆನ್ಸ್ ಅನ್ನು ನಿಯೋಜಿಸಿದ ತಕ್ಷಣವೇ ಆಂಬ್ಯುಲೆನ್ಸ್ ಹೊರಡುತ್ತದೆ.',
    ambulanceDispatchedTitle: 'ALS ಆಂಬ್ಯುಲೆನ್ಸ್ ನಿಯೋಜಿಸಲಾಗಿದೆ ಮತ್ತು ಹೊರಟಿದೆ',
    familyNotifiedBadge: 'Alert sent to Emergency Contacts (Mom, Dad) via WhatsApp & Messenger',
    voicePlayedOnceBadge: 'ಧ್ವನಿ ಅಭಯ ಸಂದೇಶವನ್ನು ಒಮ್ಮೆ ಪ್ಲೇ ಮಾಡಲಾಗಿದೆ (Played 1x)',
    survivalGuideTitle: 'ಜೀವ ರಕ್ಷಕ ಮಾರ್ಗದರ್ಶಿ (Survival Guide)',
    chatHistoryTitle: 'AI ಚಾಟ್ ಮತ್ತು ತುರ್ತು ಇತಿಹಾಸ (ಅಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ)',
    accountSettingsTitle: 'ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    aloneMode: 'ಒಬ್ಬರೇ ಇದ್ದಾಗ',
    assistedMode: 'ಸಹಾಯಕರೊಂದಿಗೆ',
    logout: 'ಲಾಗ್ ಔಟ್',
  },
  hi: {
    citizenPortalTitle: 'PulseWay मोबाइल SOS',
    falseReportWarning:
      'Warning: Filing false reports or prank submissions is strictly prohibited and subject to legal penalties.',
    dropdownPlaceholder: 'सूची से प्रमुख आपातकालीन स्थिति चुनें...',
    chatPlaceholder: 'आपातकालीन लक्षण यहाँ लिखें...',
    sendBtn: 'भेजें',
    dispatchAlsBtn: 'तुरंत ALS एम्बुलेंस बुलाएं',
    categories: [
      { label: '🚨 प्रसव पीड़ा / डिलीवरी (Active Labour)', prompt: 'गर्भवती महिला को तेज प्रसव पीड़ा (active labour contractions) हो रही है', critical: true },
      { label: '🚨 तेज सीने में दर्द / हार्ट अटैक (Cardiac)', prompt: 'सीने में तेज दर्द और पसीना आ रहा है (severe chest pain)', critical: true },
      { label: '🚨 लकवा / ब्रेन स्ट्रोक (Stroke)', prompt: 'अचानक बोलने में तकलीफ और चेहरे/हाथ में सुन्नपन (stroke)', critical: true },
      { label: '🚨 गंभीर सड़क दुर्घटना / रक्तस्राव', prompt: 'सड़क दुर्घटना में गंभीर चोट और खून बह रहा है (accident bleeding)', critical: true },
      { label: '🚨 सांस लेने में गंभीर तकलीफ', prompt: 'सांस लेने में गंभीर तकलीफ हो रही है (difficulty breathing)', critical: true },
      { label: '🚨 बेहोशी / दौरा पड़ना (Unconscious)', prompt: 'मरीज अचानक बेहोश होकर गिर गया है (unconscious emergency)', critical: true },
    ],
    awaitingHospitalTitle: 'नजदीकी अस्पताल को सूचित किया गया — एम्बुलेंस आवंटन की प्रतीक्षा',
    awaitingHospitalSub:
      'जैसे ही अस्पताल कमांड सेंटर एम्बुलेंस आवंटित करेगा, लाइव ट्रैकिंग शुरू हो जाएगी।',
    ambulanceDispatchedTitle: 'ALS एम्बुलेंस आवंटित और रवाना',
    familyNotifiedBadge: 'Alert sent to Emergency Contacts (Mom, Dad) via WhatsApp & Messenger',
    voicePlayedOnceBadge: 'पूर्व-रिकॉर्डेड वॉयस संदेश एक बार चलाया गया (Played 1x)',
    survivalGuideTitle: 'जीवन रक्षा गाइड (Survival Guide)',
    chatHistoryTitle: 'AI चैट इतिहास (हटाया नहीं जा सकता)',
    accountSettingsTitle: 'अकाउंट सेटिंग्स',
    aloneMode: 'अकेले होने पर',
    assistedMode: 'मददगार के साथ',
    logout: 'लॉग आउट',
  },
};

function createReassuranceWavBlobUrl(): string {
  const sampleRate = 22050;
  const durationSec = 1.6;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = t < 0.5 ? 523.25 : t < 1.0 ? 659.25 : 783.99;
    const env = Math.sin(Math.min(1, (t % 0.5) * 6) * Math.PI) * 0.25;
    const sample = Math.max(-1, Math.min(1, Math.sin(2 * Math.PI * freq * t) * env));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Plays the pre-recorded WAV reassurance audio EXCLUSIVELY in the Citizen App,
 * and STRICTLY ONCE when the hospital dispatches an ambulance to that citizen.
 * Never replays on refresh, navigation, or subsequent updates.
 */
export function playPreRecordedCitizenAnnouncementOnce(incidentId: string): boolean {
  if (typeof window === 'undefined' || !incidentId) return false;

  const storageKey = `pulseway_prerecorded_voice_played_${incidentId}`;
  try {
    if (localStorage.getItem(storageKey) === 'true') {
      return false; // Already played once for this incident — never replay
    }
    localStorage.setItem(storageKey, 'true');

    const wavUrl = createReassuranceWavBlobUrl();
    const audio = new Audio(wavUrl);
    audio.volume = 0.85;
    audio.onended = () => URL.revokeObjectURL(wavUrl);
    audio.play().catch(() => {
      URL.revokeObjectURL(wavUrl);
    });
    return true;
  } catch {
    return false;
  }
}
