import {
  classifyEmergencySeverity,
  allocatePreArrivalResources,
  buildLocalTriageResponse,
  type LanguageCode,
} from '../src/utils/clinicalLogic.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { symptoms = '', hospitalCode = 'HOSP-BLR-8841', language = 'en' } = req.body || {};
  const lang = (['en', 'kn', 'hi'].includes(language) ? language : 'en') as LanguageCode;
  const classification = classifyEmergencySeverity(String(symptoms));
  const evaluation = buildLocalTriageResponse(String(symptoms), lang);
  const allocation = allocatePreArrivalResources(String(symptoms), String(hospitalCode));

  return res.status(200).json({
    ...classification,
    evaluation,
    allocation,
  });
}
