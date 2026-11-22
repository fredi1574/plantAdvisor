import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLANT_PHOTOS_BUCKET = 'plant-photos';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Recursively collects all object paths under a user's folder in `plant-photos`
 * and removes them in batches so no orphaned photos remain after account deletion.
 */
async function deleteUserPhotos(
  adminClient: SupabaseClient,
  userId: string
): Promise<void> {
  const pathsToDelete: string[] = [];
  const queue: string[] = [userId];

  while (queue.length > 0) {
    const prefix = queue.shift()!;
    let offset = 0;

    while (true) {
      const { data: items, error } = await adminClient.storage
        .from(PLANT_PHOTOS_BUCKET)
        .list(prefix, { limit: 100, offset });

      if (error || !items || items.length === 0) {
        break;
      }

      for (const item of items) {
        const fullPath = `${prefix}/${item.name}`;
        // Folders in Supabase Storage list results have `id === null`
        if (item.id === null) {
          queue.push(fullPath);
        } else {
          pathsToDelete.push(fullPath);
        }
      }

      if (items.length < 100) {
        break;
      }
      offset += items.length;
    }
  }

  // Delete in chunks of 100
  for (let i = 0; i < pathsToDelete.length; i += 100) {
    const chunk = pathsToDelete.slice(i, i + 100);
    await adminClient.storage.from(PLANT_PHOTOS_BUCKET).remove(chunk);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(
      { error: 'Account deletion service is not configured on the server.' },
      500
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid authorization token.' }, 401);
  }

  let body: { confirm?: unknown } = {};
  try {
    body = (await req.json()) as { confirm?: unknown };
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  if (body.confirm !== 'DELETE') {
    return jsonResponse(
      { error: 'Explicit confirmation ("DELETE") is required.' },
      400
    );
  }

  // Verify the caller's identity strictly from their JWT (never trust a client-supplied userId)
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse(
      { error: 'Unauthorized: please sign in again before deleting your account.' },
      401
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Remove user-owned photos from Storage (best-effort; never block account deletion on storage error)
    try {
      await deleteUserPhotos(adminClient, user.id);
    } catch {
      // Continue with database and auth deletion
    }

    // 2. Delete user_plants before species_catalog because `user_plants.species_id` uses `on delete restrict`
    const { error: plantsError } = await adminClient
      .from('user_plants')
      .delete()
      .eq('user_id', user.id);

    if (plantsError) {
      return jsonResponse(
        { error: `Failed to remove plant records: ${plantsError.message}` },
        500
      );
    }

    const { error: speciesError } = await adminClient
      .from('species_catalog')
      .delete()
      .eq('user_id', user.id);

    if (speciesError) {
      return jsonResponse(
        { error: `Failed to remove species records: ${speciesError.message}` },
        500
      );
    }

    // 3. Permanently delete the Auth user (cascades profiles, ai_usage, and any remaining rows)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      return jsonResponse(
        { error: `Failed to delete account: ${deleteUserError.message}` },
        500
      );
    }

    return jsonResponse({ deleted: true }, 200);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error deleting account.';
    return jsonResponse({ error: message }, 500);
  }
});
