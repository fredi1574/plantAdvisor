import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BODY_BYTES = 6 * 1024 * 1024; // 6 MB
const MAX_IMAGE_BASE64_CHARS = 4_500_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const userRequestTimestamps = new Map<string, number[]>();

const SUCCULENT_SYSTEM_GUARDRAIL = `
CRITICAL BOTANICAL GUARDRAIL FOR SUCCULENTS & CACTI (Families: Crassulaceae, Cactaceae, Asphodelaceae, Aizoaceae):
1. NEVER recommend misting leaves or aerial spraying. Succulents store water in parenchyma tissue; surface moisture causes fungal leaf spot, powdery mildew, and crown rot.
2. NEVER recommend frequent shallow sips of water or keeping soil "consistently moist".
3. ALWAYS prescribe the "Soak and Dry" method: drench thoroughly only after 100% of the gritty substrate has been bone-dry for several days and lower leaves show subtle turgor softening.
4. ALWAYS flag containers without drainage holes (hasDrainageHole === false) or water-retentive peat soils as an immediate root-rot hazard.
`.trim();

const PLANT_IDENTIFICATION_JSON_SCHEMA = {
  type: 'OBJECT',
  required: [
    'commonName',
    'scientificName',
    'family',
    'plantType',
    'confidence',
    'baselineCare',
    'identificationNotes',
  ],
  properties: {
    commonName: { type: 'STRING' },
    scientificName: { type: 'STRING' },
    family: { type: 'STRING' },
    plantType: {
      type: 'STRING',
      enum: ['succulent', 'foliage', 'propagation', 'flowering'],
    },
    confidence: { type: 'NUMBER' },
    identificationNotes: { type: 'STRING' },
    baselineCare: {
      type: 'OBJECT',
      required: [
        'idealLight',
        'baseWateringDays',
        'soilRecommendation',
        'succulentGuardrails',
      ],
      properties: {
        idealLight: { type: 'STRING' },
        baseWateringDays: { type: 'INTEGER' },
        soilRecommendation: { type: 'STRING' },
        succulentGuardrails: {
          type: 'OBJECT',
          required: [
            'isSucculentOrCactus',
            'neverMistFoliage',
            'soakAndDryRequired',
            'minimumDryBackDays',
            'rotWarningNote',
          ],
          properties: {
            isSucculentOrCactus: { type: 'BOOLEAN' },
            neverMistFoliage: { type: 'BOOLEAN' },
            soakAndDryRequired: { type: 'BOOLEAN' },
            minimumDryBackDays: { type: 'INTEGER' },
            rotWarningNote: { type: 'STRING' },
          },
        },
      },
    },
  },
};

const PLANT_DIAGNOSIS_JSON_SCHEMA = {
  type: 'OBJECT',
  required: [
    'healthStatus',
    'detectedSymptoms',
    'diagnosisSummary',
    'followUpQuestions',
    'recommendedActions',
    'adjustedWateringIntervalDays',
  ],
  properties: {
    healthStatus: {
      type: 'STRING',
      enum: ['thriving', 'needs_attention', 'critical'],
    },
    detectedSymptoms: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    diagnosisSummary: { type: 'STRING' },
    followUpQuestions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    recommendedActions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['instruction', 'urgency'],
        properties: {
          instruction: { type: 'STRING' },
          urgency: { type: 'STRING', enum: ['immediate', 'soon', 'routine'] },
          rationale: { type: 'STRING' },
        },
      },
    },
    adjustedWateringIntervalDays: { type: 'INTEGER' },
    succulentGuardrailApplied: { type: 'STRING' },
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (userRequestTimestamps.get(userId) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    userRequestTimestamps.set(userId, recent);
    return true;
  }
  recent.push(now);
  userRequestTimestamps.set(userId, recent);
  return false;
}

async function callGeminiWithFallback(
  apiKey: string,
  parts: Record<string, unknown>[],
  responseSchema: Record<string, unknown>,
  temperature: number
): Promise<Response> {
  const configured = Deno.env.get('GEMINI_MODEL')?.trim();
  const candidates = Array.from(
    new Set(
      [
        configured,
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-flash-latest',
      ].filter((m): m is string => Boolean(m))
    )
  );

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  let lastResponse: Response | null = null;
  for (const model of candidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });
      if (resp.ok) {
        return resp;
      }
      lastResponse = resp;
    } catch {
      // Try next fallback model
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw new Error('Unable to reach Gemini API.');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Payload too large (max 6 MB).' }, 413);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase environment not configured.' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized: invalid or expired session.' }, 401);
  }

  if (isRateLimited(user.id)) {
    return jsonResponse(
      { error: 'Rate limit exceeded. Please wait a minute before scanning again.' },
      429
    );
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!geminiApiKey) {
    return jsonResponse(
      { error: 'Server GEMINI_API_KEY secret is not configured.' },
      500
    );
  }

  let body: Record<string, unknown>;
  try {
    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Payload too large (max 6 MB).' }, 413);
    }
    body = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const action = body.action;
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : undefined;
  const imageMimeType =
    typeof body.imageMimeType === 'string' ? body.imageMimeType : 'image/jpeg';

  if (imageBase64 && imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    return jsonResponse({ error: 'Image payload exceeds maximum size.' }, 413);
  }

  if (action === 'identify') {
    const hintQuery = typeof body.hintQuery === 'string' ? body.hintQuery.trim() : '';
    const textInput = typeof body.textInput === 'string' ? body.textInput.trim() : '';

    if (!hintQuery && !textInput && !imageBase64) {
      return jsonResponse(
        { error: 'Provide either an image or a plant name/hint to identify.' },
        400
      );
    }

    const queryText =
      hintQuery ||
      textInput ||
      'Identify solely from the attached plant photo';

    const parts: Record<string, unknown>[] = [
      {
        text: `${SUCCULENT_SYSTEM_GUARDRAIL}\n\nIdentify the plant from the provided input. Hint/Name query: "${queryText}". Return strict JSON matching the schema.`,
      },
    ];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
    }

    const geminiResp = await callGeminiWithFallback(
      geminiApiKey,
      parts,
      PLANT_IDENTIFICATION_JSON_SCHEMA,
      0.2
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      return jsonResponse(
        { error: `Gemini API Error (${geminiResp.status}): ${errText}` },
        502
      );
    }

    const geminiJson = await geminiResp.json();
    const rawResult = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawResult) {
      return jsonResponse({ error: 'Empty identification response from Gemini.' }, 502);
    }

    return jsonResponse({ result: JSON.parse(rawResult) });
  }

  if (action === 'diagnose') {
    const plantProfile = body.plantProfile as Record<string, unknown> | undefined;
    const recentLogs = Array.isArray(body.recentLogs) ? body.recentLogs.slice(0, 8) : [];
    const userObservationNotes =
      typeof body.userObservationNotes === 'string' ? body.userObservationNotes : '';

    if (!plantProfile || typeof plantProfile !== 'object') {
      return jsonResponse({ error: 'Missing plantProfile for diagnosis.' }, 400);
    }

    const species = (plantProfile.species as Record<string, unknown>) ?? {};
    const promptText = `
${SUCCULENT_SYSTEM_GUARDRAIL}

You are FloraLog's senior botanical pathologist. Analyze the plant's current visual condition ALONGSIDE its historical care notebook to diagnose abiotic or biotic issues (overwatering, edema, etiolation, root rot, nutrient deficiency, or propagation stagnation).

PLANT PROFILE:
- Nickname: ${String(plantProfile.nickname ?? 'Unknown')}
- Species: ${String(species.commonName ?? 'Unknown')} (${String(species.scientificName ?? '')})
- Family: ${String(species.family ?? '')}
- Type: ${String(species.plantType ?? '')}
- Location: ${String(plantProfile.location ?? '')} (${plantProfile.isIndoor ? 'Indoor' : 'Outdoor'}, Light: ${String(plantProfile.lightExposure ?? '')})
- Pot Material: ${String(plantProfile.potMaterial ?? '')}, Has Drainage Hole: ${Boolean(plantProfile.hasDrainageHole)}
- Last Watered: ${String(plantProfile.lastWateredAt ?? '')}
- Current Watering Interval: every ${String(plantProfile.customWateringIntervalDays ?? '')} days

RECENT CARE NOTEBOOK LOGS (newest first):
${JSON.stringify(recentLogs, null, 2)}

USER OBSERVATION NOTES:
${userObservationNotes || 'None provided.'}

Return strict JSON conforming to the schema.
`.trim();

    const parts: Record<string, unknown>[] = [{ text: promptText }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
    }

    const geminiResp = await callGeminiWithFallback(
      geminiApiKey,
      parts,
      PLANT_DIAGNOSIS_JSON_SCHEMA,
      0.25
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      return jsonResponse(
        { error: `Gemini Diagnosis API Error (${geminiResp.status}): ${errText}` },
        502
      );
    }

    const geminiJson = await geminiResp.json();
    const rawResult = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawResult) {
      return jsonResponse({ error: 'Empty diagnosis response from Gemini.' }, 502);
    }

    return jsonResponse({ result: JSON.parse(rawResult) });
  }

  return jsonResponse({ error: 'Unsupported action. Expected "identify" or "diagnose".' }, 400);
});
