let idSequence = 0;

/**
 * Generates collision-safe client entity IDs even when multiple mutations
 * happen within the same millisecond (e.g., batch watering or tests).
 */
export function createEntityId(prefix: string): string {
  idSequence = (idSequence + 1) % 10_000;
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${Date.now()}-${idSequence}-${rand}`;
}
