import {
  enforceSucculentDiagnosisGuardrails,
  enforceSucculentIdentificationGuardrails,
} from '@/services/ai/guardrails';
import {
  mockDiagnosePlantHealth,
  mockIdentifyPlant,
} from '@/services/ai/mockEngine';
import {
  consumeMockQuotaOrThrow,
  handleEdgeFunctionError,
  isMockAiEnabled,
  publishQuota,
} from '@/services/ai/quota';
import {
  DIAGNOSTIC_ANGLE_LABELS,
  PLANT_DIAGNOSIS_JSON_SCHEMA,
  PLANT_IDENTIFICATION_JSON_SCHEMA,
  SUCCULENT_SYSTEM_GUARDRAIL,
} from '@/services/ai/schemas';
import { prepareImageForAI } from '@/services/imageUtils';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type {
  AiQuotaStatus,
  DiagnosticPhotoInput,
  NotebookEntry,
  PlantDiagnosisResult,
  PlantIdentificationResult,
  UserPlant,
} from '@/types/plant';

function resolveGeminiModel(): string {
  const configured = process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim();
  if (
    !configured ||
    configured === 'gemini-2.5-flash' ||
    configured === 'gemini-2.0-flash'
  ) {
    return 'gemini-3.5-flash';
  }
  return configured;
}

async function fetchGeminiWithFallback(
  initialEndpoint: string,
  options: RequestInit
): Promise<Response> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const primaryModel = resolveGeminiModel();
  const candidates = Array.from(
    new Set([
      primaryModel,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ])
  );

  let lastResponse = await fetch(initialEndpoint, options);
  if (lastResponse.ok) {
    return lastResponse;
  }

  for (const fallbackModel of candidates) {
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
    if (fallbackUrl === initialEndpoint) {
      continue;
    }

    try {
      const resp = await fetch(fallbackUrl, options);
      if (resp.ok) {
        return resp;
      }
      lastResponse = resp;
    } catch {
      // Continue to next candidate
    }
  }

  return lastResponse;
}

function normalizeDiagnosticPhotos(
  imageInput: string | DiagnosticPhotoInput[] | undefined
): DiagnosticPhotoInput[] {
  if (!imageInput) return [];
  if (typeof imageInput === 'string') {
    return [
      {
        angle: 'canopy',
        uri: imageInput,
        label: DIAGNOSTIC_ANGLE_LABELS.canopy,
      },
    ];
  }
  return imageInput
    .filter((item) => Boolean(item?.uri))
    .slice(0, 3)
    .map((item) => ({
      ...item,
      label: item.label ?? DIAGNOSTIC_ANGLE_LABELS[item.angle],
    }));
}

/**
 * 1. Identify a plant from an image URI or user-typed query string.
 */
export async function identifyPlant(
  imageUriOrName: string,
  hintQuery?: string
): Promise<PlantIdentificationResult> {
  const combinedInput = `${imageUriOrName} ${hintQuery ?? ''}`.trim();

  if (isMockAiEnabled()) {
    consumeMockQuotaOrThrow();
    const mockResult = await mockIdentifyPlant(combinedInput);
    return enforceSucculentIdentificationGuardrails(mockResult);
  }

  const isImageUri =
    imageUriOrName.startsWith('file:') ||
    imageUriOrName.startsWith('content:') ||
    imageUriOrName.startsWith('ph:') ||
    imageUriOrName.startsWith('data:') ||
    imageUriOrName.startsWith('blob:') ||
    imageUriOrName.startsWith('http');

  const preparedImage = isImageUri
    ? await prepareImageForAI(imageUriOrName)
    : null;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke<{
      result?: PlantIdentificationResult;
      quota?: AiQuotaStatus;
      error?: string;
    }>('plant-ai', {
      body: {
        action: 'identify',
        hintQuery: hintQuery?.trim() || undefined,
        textInput: isImageUri ? undefined : imageUriOrName,
        imageBase64: preparedImage?.base64,
        imageMimeType: preparedImage?.mimeType,
      },
    });

    if (error) {
      await handleEdgeFunctionError(
        error,
        'Edge Function plant-ai identify failed.'
      );
    }
    if (data?.quota) {
      publishQuota(data.quota);
    }
    if (data?.error || !data?.result) {
      throw new Error(
        data?.error ||
          'Empty identification response from plant-ai Edge Function.'
      );
    }

    return enforceSucculentIdentificationGuardrails(data.result);
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = resolveGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: Record<string, unknown>[] = [
    {
      text: `${SUCCULENT_SYSTEM_GUARDRAIL}\n\nIdentify the plant from the provided input. Hint/Name query: "${
        hintQuery?.trim() ||
        (isImageUri
          ? 'Identify solely from the attached plant photo'
          : imageUriOrName)
      }". Return strict JSON matching the schema.`,
    },
  ];

  if (preparedImage?.base64) {
    parts.push({
      inlineData: {
        mimeType: preparedImage.mimeType,
        data: preparedImage.base64,
      },
    });
  }

  const response = await fetchGeminiWithFallback(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: PLANT_IDENTIFICATION_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty identification response from Gemini API.');
  }

  return enforceSucculentIdentificationGuardrails(
    JSON.parse(rawText) as PlantIdentificationResult
  );
}

/**
 * 2. Diagnose plant health by combining up to 3 labeled photos with temporal care history & plant profile.
 */
export async function diagnosePlantHealth(
  imageInput: string | DiagnosticPhotoInput[] | undefined,
  plantProfile: UserPlant,
  recentLogs: NotebookEntry[],
  userObservationNotes?: string
): Promise<PlantDiagnosisResult> {
  const photos = normalizeDiagnosticPhotos(imageInput);

  if (isMockAiEnabled()) {
    consumeMockQuotaOrThrow();
    const mockResult = await mockDiagnosePlantHealth(
      photos,
      plantProfile,
      recentLogs,
      userObservationNotes
    );
    return enforceSucculentDiagnosisGuardrails(mockResult, plantProfile);
  }

  const serializedHistory = recentLogs.slice(0, 8).map((entry) => ({
    date: entry.timestamp,
    type: entry.eventType,
    title: entry.title,
    notes: entry.notes,
    metrics: entry.metrics,
  }));

  const preparedImages = await Promise.all(
    photos.map(async (photo) => {
      const prepared = await prepareImageForAI(photo.uri);
      return {
        angle: photo.angle,
        label: photo.label ?? DIAGNOSTIC_ANGLE_LABELS[photo.angle],
        base64: prepared.base64,
        mimeType: prepared.mimeType,
      };
    })
  );

  if (isSupabaseConfigured && supabase) {
    const first = preparedImages[0];
    const { data, error } = await supabase.functions.invoke<{
      result?: PlantDiagnosisResult;
      quota?: AiQuotaStatus;
      error?: string;
    }>('plant-ai', {
      body: {
        action: 'diagnose',
        plantProfile,
        recentLogs: serializedHistory,
        userObservationNotes,
        imageBase64: first?.base64,
        imageMimeType: first?.mimeType,
        diagnosticImages: preparedImages,
      },
    });

    if (error) {
      await handleEdgeFunctionError(
        error,
        'Edge Function plant-ai diagnose failed.'
      );
    }
    if (data?.quota) {
      publishQuota(data.quota);
    }
    if (data?.error || !data?.result) {
      throw new Error(
        data?.error || 'Empty diagnosis response from plant-ai Edge Function.'
      );
    }

    return enforceSucculentDiagnosisGuardrails(data.result, plantProfile);
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = resolveGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = `
${SUCCULENT_SYSTEM_GUARDRAIL}

You are FloraLog's senior botanical pathologist. Analyze the plant's current visual condition ALONGSIDE its historical care notebook to diagnose abiotic or biotic issues (overwatering, edema, etiolation, root rot, nutrient deficiency, or propagation stagnation).

PLANT PROFILE:
- Nickname: ${plantProfile.nickname}
- Species: ${plantProfile.species.commonName} (${plantProfile.species.scientificName})
- Family: ${plantProfile.species.family}
- Type: ${plantProfile.species.plantType}
- Location: ${plantProfile.location} (${plantProfile.isIndoor ? 'Indoor' : 'Outdoor'}, Light: ${plantProfile.lightExposure})
- Pot Material: ${plantProfile.potMaterial}, Has Drainage Hole: ${plantProfile.hasDrainageHole}
- Last Watered: ${plantProfile.lastWateredAt}
- Current Watering Interval: every ${plantProfile.customWateringIntervalDays} days

RECENT CARE NOTEBOOK LOGS (newest first):
${JSON.stringify(serializedHistory, null, 2)}

USER OBSERVATION NOTES:
${userObservationNotes || 'None provided.'}

Return strict JSON conforming to the schema.
`.trim();

  const parts: Record<string, unknown>[] = [{ text: promptText }];

  for (const img of preparedImages) {
    if (img.base64) {
      parts.push({ text: `[Diagnostic Photo — ${img.label}]` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }
  }

  const response = await fetchGeminiWithFallback(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema: PLANT_DIAGNOSIS_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini Diagnosis API Error (${response.status}): ${errorText}`
    );
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty diagnosis response from Gemini API.');
  }

  const parsed = JSON.parse(rawText) as PlantDiagnosisResult;
  return enforceSucculentDiagnosisGuardrails(parsed, plantProfile);
}
