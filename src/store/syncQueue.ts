import {
  deleteCareEntryFromSupabase,
  deletePlantFromSupabase,
  syncCareEntryToSupabase,
  syncPlantToSupabase,
} from '@/services/supabase';
import type { NotebookEntry, UserPlant } from '@/types/plant';

export type PendingSyncOp =
  | { kind: 'upsert_plant'; id: string; previousPhotoUri?: string }
  | { kind: 'delete_plant'; id: string }
  | { kind: 'upsert_entry'; id: string }
  | { kind: 'delete_entry'; id: string };

/**
 * Coalesces an incoming sync operation onto the pending queue so superseded
 * upserts are removed on delete and duplicate operations are deduplicated.
 */
export function mergePendingOps(
  existing: PendingSyncOp[],
  incoming: PendingSyncOp
): PendingSyncOp[] {
  const filtered = existing.filter((op) => {
    if (incoming.kind === 'delete_plant') {
      return !(
        (op.kind === 'upsert_plant' || op.kind === 'delete_plant') &&
        op.id === incoming.id
      );
    }
    if (incoming.kind === 'delete_entry') {
      return !(
        (op.kind === 'upsert_entry' || op.kind === 'delete_entry') &&
        op.id === incoming.id
      );
    }
    return !(op.kind === incoming.kind && op.id === incoming.id);
  });
  return [...filtered, incoming];
}

export function removePendingOp(
  existing: PendingSyncOp[],
  target: PendingSyncOp
): PendingSyncOp[] {
  return existing.filter(
    (op) => !(op.kind === target.kind && op.id === target.id)
  );
}

export function enqueueBatchSyncFallbacks(
  existing: PendingSyncOp[],
  failedPlants: UserPlant[],
  failedEntries: NotebookEntry[]
): PendingSyncOp[] {
  let nextOps = existing;
  for (const plant of failedPlants) {
    nextOps = mergePendingOps(nextOps, { kind: 'upsert_plant', id: plant.id });
  }
  for (const entry of failedEntries) {
    nextOps = mergePendingOps(nextOps, { kind: 'upsert_entry', id: entry.id });
  }
  return nextOps;
}

export interface PendingSyncRunnerContext {
  getPlant: (id: string) => UserPlant | undefined;
  getEntry: (id: string) => NotebookEntry | undefined;
  onOpResolved: (
    op: PendingSyncOp,
    uploadedPhoto?: { entity: 'plant' | 'entry'; id: string; uri: string }
  ) => void;
}

/**
 * Sequentially replays queued offline operations against Supabase.
 */
export async function executePendingSyncOps(
  ops: PendingSyncOp[],
  ctx: PendingSyncRunnerContext
): Promise<{ syncedAny: boolean; lastError: string | null }> {
  let syncedAny = false;
  let lastError: string | null = null;

  for (const op of ops) {
    if (op.kind === 'upsert_plant') {
      const plant = ctx.getPlant(op.id);
      if (!plant) {
        ctx.onOpResolved(op);
        continue;
      }
      const res = await syncPlantToSupabase(plant, op.previousPhotoUri);
      if (res.ok) {
        syncedAny = true;
        ctx.onOpResolved(
          op,
          res.uploadedPhotoUri
            ? { entity: 'plant', id: plant.id, uri: res.uploadedPhotoUri }
            : undefined
        );
      } else {
        lastError = res.error ?? 'Failed to sync plant.';
      }
    } else if (op.kind === 'delete_plant') {
      const res = await deletePlantFromSupabase(op.id);
      if (res.ok) {
        syncedAny = true;
        ctx.onOpResolved(op);
      } else {
        lastError = res.error ?? 'Failed to delete plant.';
      }
    } else if (op.kind === 'upsert_entry') {
      const entry = ctx.getEntry(op.id);
      if (!entry) {
        ctx.onOpResolved(op);
        continue;
      }
      const res = await syncCareEntryToSupabase(entry);
      if (res.ok) {
        syncedAny = true;
        ctx.onOpResolved(
          op,
          res.uploadedPhotoUri
            ? { entity: 'entry', id: entry.id, uri: res.uploadedPhotoUri }
            : undefined
        );
      } else {
        lastError = res.error ?? 'Failed to sync care entry.';
      }
    } else if (op.kind === 'delete_entry') {
      const res = await deleteCareEntryFromSupabase(op.id);
      if (res.ok) {
        syncedAny = true;
        ctx.onOpResolved(op);
      } else {
        lastError = res.error ?? 'Failed to delete care entry.';
      }
    }
  }

  return { syncedAny, lastError };
}
