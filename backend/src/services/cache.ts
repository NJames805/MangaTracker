import crypto from 'crypto';
import { supabase } from '../supabase';
import { Recommendation } from '../types';

// Bump this whenever the recommendation prompt changes in a way that should
// produce different output. It is part of the cache key (alongside model), so
// bumping it retires every existing entry without needing to delete anything.
export const PROMPT_VERSION = 'v2';

// Recommendations don't go stale quickly, but new manga get published and the
// model improves, so entries expire rather than living forever.
const TTL_DAYS = 7;

export function generateLibraryHash(mangaIds: string[]): string {
  const sorted = [...mangaIds].sort();
  const combined = sorted.join(',');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// Returns cached recommendations for this exact library, or null on a miss.
// The key deliberately contains no user id: the result is a pure function of
// the library set, so two users with identical libraries can share an entry.
// Nothing user-private is stored here - only MangaDex data and Claude's reasons.
export async function getCachedRecommendations(
  libraryHash: string,
  model: string,
): Promise<Recommendation[] | null> {
  const { data, error } = await supabase
    .from('recommendation_cache')
    .select('recommendations')
    .eq('library_hash', libraryHash)
    .eq('model', model)
    .eq('prompt_version', PROMPT_VERSION)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  // A cache read failing is not fatal - fall through and recompute.
  if (error || !data) return null;

  return data.recommendations as Recommendation[];
}

export async function setCachedRecommendations(
  libraryHash: string,
  libraryMangaIds: string[],
  model: string,
  recommendations: Recommendation[],
): Promise<void> {
  // Never cache an empty result - that would pin a bad answer for TTL_DAYS.
  if (recommendations.length === 0) return;

  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Upsert against the (library_hash, model, prompt_version) unique constraint,
  // not the id primary key - id is a fresh uuid every call, so it would never
  // actually conflict and this would just insert duplicate rows forever.
  const { error } = await supabase
    .from('recommendation_cache')
    .upsert(
      {
        library_hash: libraryHash,
        library_manga_ids: libraryMangaIds,
        model,
        prompt_version: PROMPT_VERSION,
        recommendations,
        expires_at: expiresAt,
      },
      { onConflict: 'library_hash,model,prompt_version' },
    );

  if (error) {
    console.error('Failed to cache recommendations:', error.message);
  }
}
