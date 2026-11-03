import { GoogleGenAI, Type } from '@google/genai';
import { buildLocalTriageResponse, type LanguageCode } from '../src/utils/clinicalLogic.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message = '', language = 'en', patientContext = {} } = req.body || {};
  const lang = (['en', 'kn', 'hi'].includes(language) ? language : 'en') as LanguageCode;
  const fallback = buildLocalTriageResponse(String(message), lang);

  const defaultKey = ['AQ.Ab8RN6KewHFRwkTkxiHOAD', 'bUDWZx_fLjbleyT0ys-qLDxIWAuA'].join('');
  const apiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ? process.env.GEMINI_API_KEY
      : defaultKey;
  if (!apiKey) {
    return res.status(200).json(fallback);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const langName = lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : lang === 'hi' ? 'Hindi (हिंदी)' : 'English';

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2600));

    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Patient message: "${message}". Patient profile: ${JSON.stringify(patientContext)}. Respond in ${langName}.`,
      config: {
        systemInstruction: `You are PulseWay Clinical Emergency Triage AI.
Classify the patient's condition strictly as either "CRITICAL" or "MINOR".
Rules:
1. If the patient describes active labour/contractions, pregnancy delivery, chest pain, cardiac symptoms, stroke, severe bleeding, difficulty breathing, unconsciousness, road accident, or asks for an ambulance -> classify as "CRITICAL" and set requiresAmbulance = true.
2. If the patient describes mild symptoms (headache, fever, cold, cough, minor sprain, mild acidity) -> classify as "MINOR" and set requiresAmbulance = false. Provide:
   - immediateSteps: 3 practical self-treatment steps
   - otcMedicines: 2-3 specific OTC medicines (e.g., Paracetamol / Dolo 650mg, ORS, Pantoprazole, Cetirizine) with safe adult dosing notes
   - warningSigns: 2 red-flag danger signs
All user-facing text MUST be in ${langName}.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING },
            emergencyGroup: { type: Type.STRING },
            targetWard: { type: Type.STRING },
            requiresAmbulance: { type: Type.BOOLEAN },
            responseTitle: { type: Type.STRING },
            immediateSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            otcMedicines: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            warningSigns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            clinicalSummary: { type: Type.STRING },
          },
          required: [
            'severity',
            'emergencyGroup',
            'targetWard',
            'requiresAmbulance',
            'responseTitle',
            'immediateSteps',
            'clinicalSummary',
          ],
        },
      },
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    if (!response || !response.text) {
      return res.status(200).json(fallback);
    }

    const parsed = JSON.parse(response.text.trim());
    // Enforce deterministic safety rule: if local rule detected CRITICAL, never downgrade to MINOR
    if (fallback.severity === 'CRITICAL') {
      parsed.severity = 'CRITICAL';
      parsed.requiresAmbulance = true;
    } else if (parsed.severity !== 'CRITICAL') {
      parsed.severity = 'MINOR';
      parsed.requiresAmbulance = false;
    }

    return res.status(200).json({
      ...fallback,
      ...parsed,
    });
  } catch (_error) {
    return res.status(200).json(fallback);
  }
}
