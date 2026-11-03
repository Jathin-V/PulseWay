import {
  buildLocalTriageResponse,
  type LanguageCode,
  type TriageEvaluation,
} from './clinicalLogic';

export async function evaluateEmergencyChat(
  message: string,
  language: LanguageCode,
  patientContext?: Record<string, unknown>
): Promise<TriageEvaluation> {
  const instantFallback = buildLocalTriageResponse(message, language);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2700);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        language,
        patientContext: patientContext || {},
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return instantFallback;
    }

    const data = (await response.json()) as TriageEvaluation;
    if (!data || !data.severity || !Array.isArray(data.immediateSteps)) {
      return instantFallback;
    }
    return data;
  } catch {
    clearTimeout(timer);
    return instantFallback;
  }
}
