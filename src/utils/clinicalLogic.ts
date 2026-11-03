export type LanguageCode = 'en' | 'kn' | 'hi';
export type SeverityLevel = 'CRITICAL' | 'MINOR';

export interface TriageEvaluation {
  severity: SeverityLevel;
  emergencyGroup: string;
  targetWard: string;
  requiresAmbulance: boolean;
  responseTitle: string;
  immediateSteps: string[];
  otcMedicines?: string[];
  warningSigns?: string[];
  clinicalSummary: string;
}

export interface PreArrivalAllocation {
  bedCode: string;
  doctorName: string;
  targetWard: string;
  ambulanceVehicleNo: string;
  paramedicName: string;
  paramedicPhone: string;
}

const CRITICAL_KEYWORDS: Array<{
  pattern: RegExp;
  group: string;
  ward: string;
  typeKey: 'cardiac' | 'labour' | 'stroke' | 'trauma' | 'respiratory' | 'general_critical';
}> = [
  {
    pattern: /(labour|labor|contraction|contractions|pregnant|pregnancy|water broke|delivery|maternity|childbirth|ಹೆರಿಗೆ|ಗರ್ಭಿಣಿ|प्रसव|गर्भवती|लेबर)/i,
    group: 'Obstetric / Active Labour Emergency',
    ward: 'Maternal & Obstetric ICU (NICU Ready)',
    typeKey: 'labour',
  },
  {
    pattern: /(chest pain|heart attack|cardiac|angina|palpitation|sweating heavily|left arm pain|ಎದೆ ನೋವು|ಹೃದಯಾಘಾತ|हृदय|सीने में दर्द|हार्ट अटैक)/i,
    group: 'Acute Coronary / Cardiac Emergency',
    ward: 'Cardiac Cath Lab & CCU',
    typeKey: 'cardiac',
  },
  {
    pattern: /(stroke|paralysis|slurred speech|face droop|numbness|seizure|unconscious|fainted|coma|ಪಾರ್ಶ್ವವಾಯು|ಪ್ರಜ್ಞೆ|लकवा|स्ट्रोक|बेहोश)/i,
    group: 'Neurological / Acute Stroke Alert',
    ward: 'Neuro-Trauma & Stroke ICU',
    typeKey: 'stroke',
  },
  {
    pattern: /(breathing|breathless|choking|asthma|suffocating|oxygen|cyanosis|ಉಸಿರಾಟ|सांस|दम घुटना)/i,
    group: 'Acute Respiratory Distress',
    ward: 'Respiratory & Critical Care ICU',
    typeKey: 'respiratory',
  },
  {
    pattern: /(bleeding|hemorrhage|accident|crash|fracture|head injury|burn|snake|poison|trauma|blood loss|ಅಪಘಾತ|ರಕ್ತಸ್ರಾವ|दुर्घटना|खून|चोट)/i,
    group: 'Severe Polytrauma & Hemorrhage',
    ward: 'Level-1 Trauma Resuscitation Bay',
    typeKey: 'trauma',
  },
  {
    pattern: /(ambulance|emergency|critical|help now|sos|dying|severe pain|ಆಂಬ್ಯುಲೆನ್ಸ್|ತುರ್ತು|एम्बुलेंस|आपातकालीन)/i,
    group: 'High-Priority Medical Emergency',
    ward: 'Emergency Resuscitation ICU',
    typeKey: 'general_critical',
  },
];

const MINOR_KEYWORDS: Array<{
  pattern: RegExp;
  group: string;
  typeKey: 'fever_headache' | 'cold_cough' | 'gastric' | 'sprain' | 'general_minor';
}> = [
  {
    pattern: /(headache|migraine|fever|temperature|body ache|chills|ತಲೆನೋವು|ಜ್ವರ|सिरदर्द|बुखार)/i,
    group: 'Mild Pyrexia / Cephalalgia (Minor)',
    typeKey: 'fever_headache',
  },
  {
    pattern: /(cold|cough|sore throat|runny nose|sneezing|flu|ಶೀತ|ಕೆಮ್ಮು|सर्दी|खांसी|जुकाम)/i,
    group: 'Upper Respiratory Viral Syndrome (Minor)',
    typeKey: 'cold_cough',
  },
  {
    pattern: /(acidity|gas|stomach ache|indigestion|mild nausea|heartburn|loose motion|diarrhea|ಹೊಟ್ಟೆ|गैस|एसिडिटी|पेट दर्द)/i,
    group: 'Mild Gastrointestinal Discomfort (Minor)',
    typeKey: 'gastric',
  },
  {
    pattern: /(sprain|ankle twist|minor cut|scrape|muscle cramp|mild pain|ಉಳುಕು|मोच|हल्की चोट)/i,
    group: 'Minor Musculoskeletal Strain (Minor)',
    typeKey: 'sprain',
  },
];

export function classifyEmergencySeverity(input: string): {
  severity: SeverityLevel;
  emergencyGroup: string;
  targetWard: string;
  typeKey: string;
} {
  const normalized = (input || '').trim();

  for (const item of CRITICAL_KEYWORDS) {
    if (item.pattern.test(normalized)) {
      return {
        severity: 'CRITICAL',
        emergencyGroup: item.group,
        targetWard: item.ward,
        typeKey: item.typeKey,
      };
    }
  }

  for (const item of MINOR_KEYWORDS) {
    if (item.pattern.test(normalized)) {
      return {
        severity: 'MINOR',
        emergencyGroup: item.group,
        targetWard: 'Outpatient / Home Care Protocol',
        typeKey: item.typeKey,
      };
    }
  }

  // If the message contains "mild" or "minor" or "slight", classify as MINOR
  if (/\b(mild|minor|slight|little|small)\b/i.test(normalized)) {
    return {
      severity: 'MINOR',
      emergencyGroup: 'Minor Symptomatic Consultation',
      targetWard: 'Outpatient / Home Care Protocol',
      typeKey: 'general_minor',
    };
  }

  // Check if it looks like a short greeting or general minor query
  if (/^(hi|hello|hey|namaskara|namaste|test|help)\b/i.test(normalized) && normalized.length < 20) {
    return {
      severity: 'MINOR',
      emergencyGroup: 'General Clinical Inquiry',
      targetWard: 'Outpatient Triage',
      typeKey: 'general_minor',
    };
  }

  // Default: if someone describes an unknown acute symptom in an emergency app, check if it has urgent words
  if (/\b(pain|blood|vomit|collapse|attack|urgent|baby|water)\b/i.test(normalized)) {
    return {
      severity: 'CRITICAL',
      emergencyGroup: 'Acute Medical Emergency',
      targetWard: 'Emergency Trauma & ICU',
      typeKey: 'general_critical',
    };
  }

  return {
    severity: 'MINOR',
    emergencyGroup: 'Non-Critical Clinical Triage',
    targetWard: 'Outpatient / Home Care Protocol',
    typeKey: 'general_minor',
  };
}

export function buildLocalTriageResponse(input: string, lang: LanguageCode = 'en'): TriageEvaluation {
  const classification = classifyEmergencySeverity(input);

  if (classification.severity === 'CRITICAL') {
    const typeKey = classification.typeKey;
    if (lang === 'kn') {
      const stepsMap: Record<string, string[]> = {
        labour: [
          'ರೋಗಿಯನ್ನು ಎಡಭಾಗಕ್ಕೆ ತಿರುಗಿ ಮಲಗಿಸಿ ಮತ್ತು ಆಳವಾಗಿ ಉಸಿರಾಡಲು ಹೇಳಿ.',
          'ಸಂಕೋಚನಗಳ (Contractions) ನಡುವಿನ ಸಮಯವನ್ನು ಗಮನಿಸಿ; ಕೆಳಗೆ ತಳ್ಳಬೇಡಿ.',
          'ಸ್ವಚ್ಛವಾದ ಬಟ್ಟೆ ಮತ್ತು ಬೆಚ್ಚಗಿನ ಹೊದಿಕೆಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.',
          'ತಕ್ಷಣವೇ ಕೆಳಗಿನ ಕೆಂಪು ಬಟನ್ ಒತ್ತಿ ALS ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆಸಿ.'
        ],
        cardiac: [
          'ರೋಗಿಯನ್ನು ತಕ್ಷಣವೇ ಅರೆ-ಕುಳಿತುಕೊಳ್ಳುವ ಭಂಗಿಯಲ್ಲಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಲು ಬಿಡಿ; ನಡೆಯಲು ಬಿಡಬೇಡಿ.',
          'ಬಿಗಿಯಾದ ಬಟ್ಟೆಗಳನ್ನು ಸಡಿಲಗೊಳಿಸಿ ಮತ್ತು ಗಾಳಿಯಾಡಲು ಕಿಟಕಿ ತೆರೆಯಿರಿ.',
          'ಅಲರ್ಜಿ ಇಲ್ಲದಿದ್ದರೆ ಆಸ್ಪಿರಿನ್ (Aspirin 300mg) ಮಾತ್ರೆಯನ್ನು ಜಗಿಯಲು ನೀಡಿ.',
          'ತಕ್ಷಣವೇ ALS ಆಂಬ್ಯುಲೆನ್ಸ್ ಕಳುಹಿಸಲು ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿ.'
        ],
        default: [
          'ರೋಗಿಯನ್ನು ಸುರಕ್ಷಿತ ಮತ್ತು ಸಮತಟ್ಟಾದ ಜಾಗದಲ್ಲಿ ಮಲಗಿಸಿ.',
          'ಉಸಿರಾಟದ ಮಾರ್ಗವು ಮುಕ್ತವಾಗಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ; ಬಾಯಿಯಿಂದ ಏನನ್ನೂ ನೀಡಬೇಡಿ.',
          'ರಕ್ತಸ್ರಾವವಿದ್ದರೆ ಸ್ವಚ್ಛವಾದ ಬಟ್ಟೆಯಿಂದ ಗಟ್ಟಿಯಾಗಿ ಒತ್ತಿ ಹಿಡಿಯಿರಿ.',
          'ತಕ್ಷಣವೇ ALS ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆಸಲು ಕೆಳಗಿನ ತುರ್ತು ಬಟನ್ ಒತ್ತಿ.'
        ]
      };
      return {
        severity: 'CRITICAL',
        emergencyGroup: classification.emergencyGroup,
        targetWard: classification.targetWard,
        requiresAmbulance: true,
        responseTitle: '🚨 ಗಂಭೀರ ತುರ್ತು ಪರಿಸ್ಥಿತಿ ಪತ್ತೆಯಾಗಿದೆ (CRITICAL)',
        immediateSteps: stepsMap[typeKey] || stepsMap.default,
        clinicalSummary: `CRITICAL: ${classification.emergencyGroup}. Immediate ALS ambulance dispatch & pre-arrival ${classification.targetWard} activation required.`,
      };
    }

    if (lang === 'hi') {
      const stepsMap: Record<string, string[]> = {
        labour: [
          'मरीज को बाईं करवट लिटाएं और गहरी सांस लेने में मदद करें।',
          'संकुचन (Contractions) के समय को नोट करें; अभी जोर लगाने से बचें।',
          'साफ तौलिए और गर्म कपड़े तुरंत तैयार रखें।',
          'नीचे दिए गए लाल बटन को दबाकर तुरंत ALS एम्बुलेंस बुलाएं।'
        ],
        cardiac: [
          'मरीज को तुरंत आधी बैठी हुई मुद्रा में आराम कराएं; बिल्कुल चलने न दें।',
          'तंग कपड़े ढीले करें और ताजी हवा आने दें।',
          'यदि एलर्जी न हो तो डिस्प्रिन/एस्पिरिन (Aspirin 300mg) चबाने को दें।',
          'तुरंत नीचे दिए गए बटन से कार्डियक ALS एम्बुलेंस डिस्पैच करें।'
        ],
        default: [
          'मरीज को सुरक्षित स्थान पर करवट लेकर (Recovery Position) लिटाएं।',
          'श्वसन मार्ग (Airway) खुला रखें और मुंह से पानी या खाना न दें।',
          'यदि रक्तस्राव हो रहा है तो साफ कपड़े से सीधा दबाव बनाए रखें।',
          'तुरंत ALS एम्बुलेंस बुलाने के लिए नीचे लाल बटन दबाएं।'
        ]
      };
      return {
        severity: 'CRITICAL',
        emergencyGroup: classification.emergencyGroup,
        targetWard: classification.targetWard,
        requiresAmbulance: true,
        responseTitle: '🚨 गंभीर आपातकालीन स्थिति (CRITICAL EMERGENCY)',
        immediateSteps: stepsMap[typeKey] || stepsMap.default,
        clinicalSummary: `CRITICAL: ${classification.emergencyGroup}. Immediate ALS ambulance dispatch & pre-arrival ${classification.targetWard} activation required.`,
      };
    }

    // Default English CRITICAL
    const stepsMapEn: Record<string, string[]> = {
      labour: [
        'Position the mother on her left side with knees bent to maximize placental blood flow.',
        'Time the contractions (interval and duration) and instruct her to pant slowly rather than pushing prematurely.',
        'Keep clean warm towels ready and do NOT attempt road transport in a private two-wheeler.',
        'Click the red Dispatch ALS Ambulance button below immediately for Obstetric Paramedic support.'
      ],
      cardiac: [
        'Have the patient sit upright at a 45-degree angle leaning against a wall or chair; strictly zero physical exertion.',
        'Loosen tight collars or belts and ensure fresh air ventilation.',
        'If not allergic, have the patient chew (not swallow whole) 1 tablet of Aspirin 300mg / Disprin.',
        'Trigger immediate ALS Cardiac Ambulance dispatch using the red button below.'
      ],
      stroke: [
        'Note the exact time symptoms started (Golden Window for thrombolysis).',
        'Lay the patient on their side with the head slightly elevated (30 degrees) to prevent choking.',
        'Do NOT give water, food, or oral tablets as swallowing reflexes may be impaired.',
        'Dispatch the ALS Stroke Unit immediately via the red button below.'
      ],
      respiratory: [
        'Keep the patient sitting upright leaning slightly forward (Tripod position) to ease lung expansion.',
        'If the patient has a prescribed rescue inhaler (Salbutamol / Asthalin), administer 2–4 puffs via spacer.',
        'Loosen clothing around the chest and neck and keep the patient calm.',
        'Dispatch an Oxygen-Equipped ALS Ambulance immediately below.'
      ],
      trauma: [
        'Apply firm, continuous direct pressure over any bleeding site using a clean cloth or sterile gauze.',
        'Do NOT move the head or neck if a spinal or head injury is suspected.',
        'Keep the patient warm with a blanket to prevent hypovolemic shock.',
        'Dispatch the Level-1 Trauma ALS Ambulance immediately below.'
      ],
      default: [
        'Place the patient in the safe lateral recovery position and keep the airway clear.',
        'Monitor breathing and pulse continuously; do not give anything by mouth.',
        'Keep someone near the entrance to guide paramedics upon arrival.',
        'Trigger immediate ALS Ambulance dispatch using the button below.'
      ]
    };

    return {
      severity: 'CRITICAL',
      emergencyGroup: classification.emergencyGroup,
      targetWard: classification.targetWard,
      requiresAmbulance: true,
      responseTitle: `🚨 CRITICAL: ${classification.emergencyGroup}`,
      immediateSteps: stepsMapEn[typeKey] || stepsMapEn.default,
      clinicalSummary: `CRITICAL: ${classification.emergencyGroup}. Immediate ALS ambulance dispatch & pre-arrival ${classification.targetWard} activation required.`,
    };
  }

  // MINOR CASE HANDLING (1. Self-treatment steps, 2. Specific OTC medicines, 3. Danger warning signs, NO ambulance button)
  const minorKey = classification.typeKey;

  if (lang === 'kn') {
    return {
      severity: 'MINOR',
      emergencyGroup: classification.emergencyGroup,
      targetWard: 'Outpatient / Home Care Protocol',
      requiresAmbulance: false,
      responseTitle: '🩺 ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ ಸಲಹೆ (Non-Critical / Minor Care)',
      immediateSteps: [
        'ಸಾಕಷ್ಟು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಮತ್ತು ದೇಹದಲ್ಲಿ ನೀರಿನಂಶ ಕಾಪಾಡಿಕೊಳ್ಳಲು ಬೆಚ್ಚಗಿನ ನೀರು ಕುಡಿಯಿರಿ.',
        'ಜ್ವರ ಅಥವಾ ತಲೆನೋವು ಇದ್ದರೆ ಹಣೆಯ ಮೇಲೆ ಒದ್ದೆ ಬಟ್ಟೆಯ ಪಟ್ಟಿ ಇಡಿ.',
        'ಲಘುವಾದ ಮತ್ತು ಸುಲಭವಾಗಿ ಜೀರ್ಣವಾಗುವ ಆಹಾರವನ್ನು ಸೇವಿಸಿ.'
      ],
      otcMedicines: [
        'Paracetamol / Dolo 650mg (ಜ್ವರ ಅಥವಾ ಮೈಕೈ ನೋವಿಗೆ - ಊಟದ ನಂತರ 1 ಮಾತ್ರೆ)',
        'ORS (Electral Powder) - ನಿರ್ಜಲೀಕರಣ ತಡೆಯಲು 1 ಲೀಟರ್ ನೀರಿನಲ್ಲಿ ಬೆರೆಸಿ ಕುಡಿಯಿರಿ',
        'Cetirizine 10mg (ಶೀತ ಅಥವಾ ಸೀನು ಇದ್ದರೆ ರಾತ್ರಿ 1 ಮಾತ್ರೆ) / Pantoprazole 40mg (ಗ್ಯಾಸ್ಟ್ರಿಕ್ ಇದ್ದರೆ)'
      ],
      warningSigns: [
        'ಜ್ವರ 103°F ಗಿಂತ ಹೆಚ್ಚಾದರೆ ಅಥವಾ 3 ದಿನಗಳ ನಂತರವೂ ಕಡಿಮೆಯಾಗದಿದ್ದರೆ',
        'ಉಸಿರಾಟದ ತೊಂದರೆ, ತೀವ್ರ ಎದೆ ನೋವು ಅಥವಾ ಪದೇ ಪದೇ ವಾಂತಿಯಾದರೆ ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ.'
      ],
      clinicalSummary: `MINOR: ${classification.emergencyGroup}. Managed with home care & OTC medication.`,
    };
  }

  if (lang === 'hi') {
    return {
      severity: 'MINOR',
      emergencyGroup: classification.emergencyGroup,
      targetWard: 'Outpatient / Home Care Protocol',
      requiresAmbulance: false,
      responseTitle: '🩺 सामान्य प्राथमिक उपचार (Non-Critical / Minor Care)',
      immediateSteps: [
        'पर्याप्त आराम करें और शरीर में पानी की कमी न होने दें (गुनगुना पानी पिएं)।',
        'बुखार या सिरदर्द होने पर माथे पर ठंडे पानी की पट्टी रखें।',
        'हल्का और सुपाच्य भोजन (दलिया, खिचड़ी, सूप) लें।'
      ],
      otcMedicines: [
        'Paracetamol / Dolo 650mg (बुखार या दर्द के लिए भोजन के बाद 1 टैबलेट, दिन में अधिकतम 3 बार)',
        'ORS (Electral) घोल — कमजोरी और डिहाइड्रेशन से बचाव के लिए',
        'Pantoprazole / Gelusil Antacid (एसिडिटी के लिए) या Cetirizine 10mg (सर्दी-जुकाम के लिए)'
      ],
      warningSigns: [
        'यदि बुखार 103°F से ऊपर जाए या 3 दिन में ठीक न हो',
        'सांस लेने में तकलीफ, सीने में दर्द, या लगातार उल्टी होने पर तुरंत डॉक्टर से मिलें।'
      ],
      clinicalSummary: `MINOR: ${classification.emergencyGroup}. Managed with home care & OTC medication.`,
    };
  }

  const minorDataEn: Record<
    string,
    { steps: string[]; meds: string[]; warnings: string[] }
  > = {
    fever_headache: {
      steps: [
        'Rest in a quiet, well-ventilated room and apply a cool damp washcloth to your forehead.',
        'Sip plenty of fluids (water, coconut water, or clear electrolyte broth) every 30 minutes.',
        'Avoid bright screens and heavy physical activity for the next 12–24 hours.'
      ],
      meds: [
        'Paracetamol 500mg / Dolo 650mg — 1 tablet after food every 6–8 hours as needed (max 3g/day)',
        'ORS (Oral Rehydration Salts / Electral) — 1 sachet in 1L clean water for hydration',
        'Ibuprofen 400mg — Optional alternative for tension headache if no gastric ulcer history'
      ],
      warnings: [
        'Fever exceeds 103°F (39.4°C) or persists beyond 72 hours',
        'Sudden stiff neck, confusion, blurred vision, or persistent vomiting develops'
      ]
    },
    cold_cough: {
      steps: [
        'Perform warm saline gargles (1/2 tsp salt in warm water) 3 times daily to soothe throat inflammation.',
        'Take steam inhalation for 5–10 minutes twice a day to clear nasal congestion.',
        'Stay hydrated with warm water, ginger-tulsi tea, or clear soups.'
      ],
      meds: [
        'Cetirizine 10mg or Levocetirizine 5mg — 1 tablet at bedtime for runny nose/sneezing',
        'Paracetamol / Dolo 650mg — For associated body ache or low-grade fever',
        'Dextromethorphan lozenges / Ambroxol syrup — 5–10ml twice daily for cough relief'
      ],
      warnings: [
        'Shortness of breath, wheezing, or oxygen saturation dropping below 94%',
        'High persistent fever or coughing up blood/rust-colored sputum'
      ]
    },
    gastric: {
      steps: [
        'Sip small amounts of ORS water continuously; avoid spicy, fried, and dairy foods for 24 hours.',
        'Eat bland BRAT diet items (bananas, plain rice, curd rice, toast) in small frequent portions.',
        'Remain upright for at least 45 minutes after eating.'
      ],
      meds: [
        'Oral Rehydration Salts (ORS / Electral) — Sip 200ml after every loose stool',
        'Pantoprazole 40mg (Pan-40) — 1 tablet before breakfast for acidity/reflux',
        'Liquid Antacid (Digene / Gelusil) — 2 teaspoons for rapid heartburn relief'
      ],
      warnings: [
        'Severe localized right lower abdominal pain or rigid abdomen',
        'Black/bloody stools, inability to keep fluids down for 12+ hours, or dizziness on standing'
      ]
    },
    sprain: {
      steps: [
        'Follow the R.I.C.E. protocol: Rest the joint, apply an Ice pack wrapped in cloth for 15 minutes every 2–3 hours.',
        'Apply gentle Compression with an elastic crepe bandage (not too tight) and Elevate the limb on a pillow.',
        'Avoid putting weight on the affected joint for the first 24–48 hours.'
      ],
      meds: [
        'Paracetamol 650mg (Dolo 650) or Ibuprofen 400mg — 1 tablet after food for pain and swelling',
        'Topical Diclofenac Gel (Volini / Omnigel) — Apply gently 3 times daily over intact skin'
      ],
      warnings: [
        'Visible bone deformity, inability to bear any weight, or numbness/tingling in toes/fingers',
        'Rapidly worsening swelling or cold/pale extremity'
      ]
    },
    general_minor: {
      steps: [
        'Rest comfortably in a well-ventilated room and monitor your temperature and hydration.',
        'Drink plenty of clean water or Oral Rehydration Solution (ORS).',
        'Take light, easily digestible meals and avoid strenuous activity.'
      ],
      meds: [
        'Paracetamol / Dolo 650mg — 1 tablet after food if experiencing mild pain or fever',
        'ORS (Electral) — 1 packet dissolved in 1L water to maintain electrolyte balance',
        'Antacid (Gelusil / Pan-40) — If experiencing mild gastric discomfort'
      ],
      warnings: [
        'Difficulty breathing, severe chest pressure, fainting, or uncontrolled pain',
        'Symptoms rapidly escalating or failing to improve within 48 hours'
      ]
    }
  };

  const chosen = minorDataEn[minorKey] || minorDataEn.general_minor;

  return {
    severity: 'MINOR',
    emergencyGroup: classification.emergencyGroup,
    targetWard: 'Outpatient / Home Care Protocol',
    requiresAmbulance: false,
    responseTitle: `🩺 Minor Care Protocol: ${classification.emergencyGroup}`,
    immediateSteps: chosen.steps,
    otcMedicines: chosen.meds,
    warningSigns: chosen.warnings,
    clinicalSummary: `MINOR: ${classification.emergencyGroup}. Self-care steps and OTC medications advised.`,
  };
}

export function allocatePreArrivalResources(emergencyCause: string, hospitalCode = 'HOSP-BLR-8841'): PreArrivalAllocation {
  const classification = classifyEmergencySeverity(emergencyCause);
  const suffix = hospitalCode.split('-').pop() || '8841';

  if (classification.typeKey === 'labour') {
    return {
      bedCode: 'Bed OBG-ICU-02',
      doctorName: 'Dr. Meera Nair (Obstetrics & Maternal Care)',
      targetWard: 'Maternal & Obstetric ICU (NICU Ready)',
      ambulanceVehicleNo: `KA-01-EM-${suffix}`,
      paramedicName: 'Raghavendra Gowda (ALS Obstetric EMT)',
      paramedicPhone: '+91 98451 10801',
    };
  }

  if (classification.typeKey === 'cardiac') {
    return {
      bedCode: 'Bed CCU-04 (Cath Lab Ready)',
      doctorName: 'Dr. Vikram Adiga (Interventional Cardiology)',
      targetWard: 'Cardiac Cath Lab & CCU',
      ambulanceVehicleNo: `KA-01-AL-${suffix}`,
      paramedicName: 'Naveen Kumar (Cardiac ALS Paramedic)',
      paramedicPhone: '+91 98451 10802',
    };
  }

  if (classification.typeKey === 'stroke') {
    return {
      bedCode: 'Bed NEURO-ICU-01',
      doctorName: 'Dr. Ananya Rao (Neuro-Critical Care)',
      targetWard: 'Neuro-Trauma & Stroke ICU',
      ambulanceVehicleNo: `KA-04-EM-${suffix}`,
      paramedicName: 'Kiran Shetty (ALS Neuro EMT)',
      paramedicPhone: '+91 98451 10803',
    };
  }

  if (classification.typeKey === 'respiratory') {
    return {
      bedCode: 'Bed MICU-06 (Ventilator Ready)',
      doctorName: 'Dr. Rajeshwari Hegde (Pulmonology & Critical Care)',
      targetWard: 'Respiratory & Critical Care ICU',
      ambulanceVehicleNo: `KA-05-AL-${suffix}`,
      paramedicName: 'Prashanth B (Critical Care Paramedic)',
      paramedicPhone: '+91 98451 10804',
    };
  }

  return {
    bedCode: 'Bed ICU-04 (Trauma Bay 1)',
    doctorName: 'Dr. Vikram Adiga (Chief Trauma & Critical Care)',
    targetWard: classification.targetWard || 'Level-1 Trauma Resuscitation Bay',
    ambulanceVehicleNo: `KA-01-TR-${suffix}`,
    paramedicName: 'Suresh Babu (Senior Trauma EMT)',
    paramedicPhone: '+91 98451 10805',
  };
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function interpolateCoordinates(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  progress0to1: number
): { lat: number; lng: number } {
  const clamped = Math.max(0, Math.min(1, progress0to1));
  return {
    lat: Number((startLat + (endLat - startLat) * clamped).toFixed(6)),
    lng: Number((startLng + (endLng - startLng) * clamped).toFixed(6)),
  };
}

export interface RoadWaypoint {
  lat: number;
  lng: number;
  roadName: string;
}

/**
 * Generates a realistic multi-segment road-following route between Hospital and Patient
 * simulating arterial road turns (no external paid routing APIs required).
 */
export function generateRoadRouteWaypoints(
  hospLat: number,
  hospLng: number,
  patientLat: number,
  patientLng: number
): RoadWaypoint[] {
  const dLat = patientLat - hospLat;
  const dLng = patientLng - hospLng;

  // Construct 9 realistic road-grid waypoints following arterial L-turns and avenues
  const fractions: Array<{ fLat: number; fLng: number; roadName: string }> = [
    { fLat: 0.0, fLng: 0.0, roadName: 'Hospital Emergency Trauma Exit' },
    { fLat: 0.08, fLng: 0.22, roadName: 'HAL Old Airport Arterial Corridor' },
    { fLat: 0.24, fLng: 0.26, roadName: '100 Feet Road Indiranagar Flyover' },
    { fLat: 0.42, fLng: 0.48, roadName: 'CMH Road Metro Signal Green Corridor' },
    { fLat: 0.58, fLng: 0.52, roadName: 'Trinity Circle Arterial Junction' },
    { fLat: 0.72, fLng: 0.76, roadName: 'MG Road Priority EMS Lane' },
    { fLat: 0.88, fLng: 0.84, roadName: 'Residency Road Cross Avenue' },
    { fLat: 0.96, fLng: 0.96, roadName: 'Patient Sector Approach Street' },
    { fLat: 1.0, fLng: 1.0, roadName: 'Patient Emergency Pickup Zone' },
  ];

  return fractions.map((step) => ({
    lat: Number((hospLat + dLat * step.fLat).toFixed(6)),
    lng: Number((hospLng + dLng * step.fLng).toFixed(6)),
    roadName: step.roadName,
  }));
}

export function getRoutePositionAtProgress(
  waypoints: RoadWaypoint[],
  progress0to1: number
): {
  lat: number;
  lng: number;
  roadName: string;
  completedWaypoints: [number, number][];
  remainingWaypoints: [number, number][];
  etaMinutes: number;
} {
  if (!waypoints || waypoints.length === 0) {
    return {
      lat: 12.9716,
      lng: 77.5946,
      roadName: 'MG Road Corridor',
      completedWaypoints: [],
      remainingWaypoints: [],
      etaMinutes: 5,
    };
  }
  const clamped = Math.max(0, Math.min(1, progress0to1));
  const totalSegments = waypoints.length - 1;
  if (totalSegments <= 0) {
    const pt = waypoints[0];
    return {
      lat: pt.lat,
      lng: pt.lng,
      roadName: pt.roadName,
      completedWaypoints: [[pt.lat, pt.lng]],
      remainingWaypoints: [[pt.lat, pt.lng]],
      etaMinutes: 1,
    };
  }

  const exactIndex = clamped * totalSegments;
  const segIndex = Math.min(totalSegments - 1, Math.floor(exactIndex));
  const segFraction = exactIndex - segIndex;

  const startPt = waypoints[segIndex];
  const endPt = waypoints[segIndex + 1];
  const currentPos = interpolateCoordinates(
    startPt.lat,
    startPt.lng,
    endPt.lat,
    endPt.lng,
    segFraction
  );

  const completed: [number, number][] = waypoints
    .slice(0, segIndex + 1)
    .map((w) => [w.lat, w.lng]);
  completed.push([currentPos.lat, currentPos.lng]);

  const remaining: [number, number][] = [
    [currentPos.lat, currentPos.lng],
    ...waypoints.slice(segIndex + 1).map((w) => [w.lat, w.lng] as [number, number]),
  ];

  const etaMinutes = Math.max(1, Math.ceil((1 - clamped) * 8));

  return {
    lat: currentPos.lat,
    lng: currentPos.lng,
    roadName: endPt.roadName || startPt.roadName,
    completedWaypoints: completed,
    remainingWaypoints: remaining,
    etaMinutes,
  };
}

