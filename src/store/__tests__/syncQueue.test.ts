import {
  collectLocalPhotoRecoveryOps,
  countLocalOnlyPhotos,
  enqueueBatchSyncFallbacks,
  isLocalPhotoUri,
  mergePendingOps,
  removePendingOp,
  type PendingSyncOp,
} from '@/store/syncQueue';

describe('syncQueue helpers', () => {
  it('deduplicates repeated upserts and replaces prior upsert on delete', () => {
    let ops: PendingSyncOp[] = [];
    ops = mergePendingOps(ops, { kind: 'upsert_plant', id: 'p-1' });
    ops = mergePendingOps(ops, { kind: 'upsert_plant', id: 'p-1', previousPhotoUri: 'old.jpg' });
    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual({
      kind: 'upsert_plant',
      id: 'p-1',
      previousPhotoUri: 'old.jpg',
    });

    ops = mergePendingOps(ops, { kind: 'delete_plant', id: 'p-1' });
    expect(ops).toEqual([{ kind: 'delete_plant', id: 'p-1' }]);
  });

  it('removes a resolved op without disturbing unrelated ops', () => {
    const ops: PendingSyncOp[] = [
      { kind: 'upsert_plant', id: 'p-1' },
      { kind: 'upsert_entry', id: 'e-1' },
    ];
    const remaining = removePendingOp(ops, { kind: 'upsert_plant', id: 'p-1' });
    expect(remaining).toEqual([{ kind: 'upsert_entry', id: 'e-1' }]);
  });

  it('enqueues failed batch plants and entries cleanly', () => {
    const ops = enqueueBatchSyncFallbacks(
      [],
      [{ id: 'p-1' } as never],
      [{ id: 'e-1' } as never, { id: 'e-2' } as never]
    );
    expect(ops).toHaveLength(3);
    expect(ops.map((o) => `${o.kind}:${o.id}`)).toEqual([
      'upsert_plant:p-1',
      'upsert_entry:e-1',
      'upsert_entry:e-2',
    ]);
  });

  it('detects local-only photo URIs and collects recovery upsert ops', () => {
    expect(isLocalPhotoUri('file:///var/mobile/photo.jpg')).toBe(true);
    expect(isLocalPhotoUri('content://media/external/images/1')).toBe(true);
    expect(isLocalPhotoUri('https://example.com/photo.jpg')).toBe(false);
    expect(isLocalPhotoUri(undefined)).toBe(false);

    const plants = [
      { id: 'p-local', photoUri: 'file:///tmp/jade.jpg' },
      { id: 'p-remote', photoUri: 'https://cdn.example.com/fern.jpg' },
    ];
    const entries = [
      { id: 'e-local', photoUri: 'file:///tmp/log.jpg' },
      { id: 'e-none', photoUri: undefined },
    ];

    expect(countLocalOnlyPhotos(plants, entries)).toBe(2);

    const recovered = collectLocalPhotoRecoveryOps([], plants, entries);
    expect(recovered).toEqual([
      { kind: 'upsert_plant', id: 'p-local' },
      { kind: 'upsert_entry', id: 'e-local' },
    ]);
  });
});
