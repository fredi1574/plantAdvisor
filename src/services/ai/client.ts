import i18n from '@/i18n';
import {
  enforceSucculentDiagnosisGuardrails,
  enforceSucculentIdentificationGuardrails,
} from '@/services/ai/guardrails';
import {
  mockDiagnosePlantHealth,
  mockIdentifyPlant,
} from '@/services/ai/mockEngine';
import {
  AiAuthRequiredError,
  consumeMockQuotaOrThrow,
  handleEdgeFunctionError,
  isMockAiEnabled,
  publishQuota,
} from '@/services/ai/quota';
import { DIAGNOSTIC_ANGLE_LABELS } from '@/services/ai/schemas';
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

async function assertLiveAiSession() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Enable EXPO_PUBLIC_USE_MOCK_AI=true for offline scans.'
    );
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new AiAuthRequiredError(
      'Please sign in to your FloraLog account to use live AI plant scans.'
    );
  }

  return supabase;
}

/**
 * 1. Identify a plant from an image URI or user-typed query string.
 */
export async function identifyPlant(
  imageUriOrName: string,
  hintQuery?: string
): Promise<PlantIdentificationResult> {
  const combinedInput = `${imageUriOrName} ${hintQuery ?? ''}`.trim();
  const locale = i18n.language?.startsWith('ru') ? 'ru' : 'en';

  if (isMockAiEnabled()) {
    consumeMockQuotaOrThrow();
    const mockResult = await mockIdentifyPlant(combinedInput, locale);
    return enforceSucculentIdentificationGuardrails(mockResult);
  }

  const client = await assertLiveAiSession();

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

  const { data, error } = await client.functions.invoke<{
    result?: PlantIdentificationResult;
    quota?: AiQuotaStatus;
    error?: string;
  }>('plant-ai', {
    body: {
      action: 'identify',
      locale,
      hintQuery: hintQuery?.trim() || undefined,
      textInput: isImageUri ? undefined : imageUriOrName,
      imageBase64: preparedImage?.base64,
      imageMimeType: preparedImage?.mimeType,
    },
  });

  if (error) {
    await handleEdgeFunctionError(
      error,
      'Unable to identify plant right now. Please try again.'
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
  const locale = i18n.language?.startsWith('ru') ? 'ru' : 'en';

  if (isMockAiEnabled()) {
    consumeMockQuotaOrThrow();
    const mockResult = await mockDiagnosePlantHealth(
      photos,
      plantProfile,
      recentLogs,
      userObservationNotes,
      locale
    );
    return enforceSucculentDiagnosisGuardrails(mockResult, plantProfile);
  }

  const client = await assertLiveAiSession();

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

  const first = preparedImages[0];
  const { data, error } = await client.functions.invoke<{
    result?: PlantDiagnosisResult;
    quota?: AiQuotaStatus;
    error?: string;
  }>('plant-ai', {
    body: {
      action: 'diagnose',
      locale,
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
      'Unable to complete health diagnosis right now. Please try again.'
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
