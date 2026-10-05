import { Router, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { supabase } from '../supabase';
import { requireAuth, AuthedRequest } from '../services/auth';
import { searchManga } from '../services/mangadex';
import {
    generateLibraryHash,
    getCachedRecommendations,
    setCachedRecommendations,
} from '../services/cache';
import { Recommendation } from '../types';

const router = Router();

const MODEL = 'claude-opus-5';

const RecommendationsSchema = z.object({
    recommendations: z.array(z.object({
        title: z.string().describe('The manga title, in English or romaji, as it would appear on MangaDex'),
        reason: z.string().describe('One or two sentences on why this fits the reader, referencing their library'),
    })),
});

interface LibraryRow {
    manga_id: string;
    title: string;
    genres: string[];
    description: string | null;
}

class RecommendationError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
        super(message);
    }
}

// Scoped to /recommendations (and /recommendations/more) so this router
// doesn't demand a login for routes mounted after it.
router.use('/recommendations', requireAuth);

// Shared guards for both routes. Sends the error response itself and returns
// null when the request can't proceed.
async function loadLibrary(req: AuthedRequest, res: Response): Promise<LibraryRow[] | null> {
    if (!process.env.ANTHROPIC_API_KEY) {
        res.status(503).json({
            error: {
                code: 'RECOMMENDATIONS_UNAVAILABLE',
                message: 'ANTHROPIC_API_KEY is not configured on the server',
                status: 503,
            },
        });
        return null;
    }

    const { data: library, error: dbError } = await supabase
        .from('manga_library')
        .select('manga_id, title, genres, description')
        .eq('user_id', req.userId);

    if (dbError) {
        res.status(500).json({ error: { code: 'DATABASE_ERROR', message: dbError.message, status: 500 } });
        return null;
    }

    if (!library || library.length === 0) {
        res.status(400).json({
            error: {
                code: 'EMPTY_LIBRARY',
                message: 'Add some manga to your list before requesting recommendations',
                status: 400,
            },
        });
        return null;
    }

    return library as LibraryRow[];
}

// Asks Claude for recommendations and resolves each title against MangaDex.
// `exclude` is titles the reader has already been shown, so a "get more"
// request doesn't repeat them.
async function generateRecommendations(library: LibraryRow[], exclude: string[]): Promise<Recommendation[]> {
    const libraryText = library
        .map((row) => `- ${row.title} (${row.genres.join(', ')}): ${(row.description || '').slice(0, 300)}`)
        .join('\n');

    const excludeText = exclude.length > 0
        ? `\n\nAlso do not recommend any of these, which the reader has already been shown:\n${exclude.map((title) => `- ${title}`).join('\n')}`
        : '';

    // Identity-linked API keys must say which workspace the request acts in.
    // The SDK doesn't send this header for plain API-key auth, so set it here.
    const client = new Anthropic({
        ...(process.env.ANTHROPIC_WORKSPACE_ID && {
            defaultHeaders: { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID },
        }),
    });

    const message = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: 'You are a manga recommendation assistant. Recommend manga that are real and findable on MangaDex. Never recommend a title the reader already has.',
        messages: [{
            role: 'user',
            content: `This reader's library:\n\n${libraryText}\n\nRecommend 10 manga they might enjoy based on similar themes, tone, or genre. Do not recommend anything already listed above.${excludeText}`,
        }],
        output_config: {
            format: zodOutputFormat(RecommendationsSchema),
        },
    });

    if (message.stop_reason === 'refusal') {
        throw new RecommendationError(502, 'CLAUDE_REFUSAL', 'The model declined this request');
    }

    const parsed = message.parsed_output;
    if (!parsed) {
        throw new RecommendationError(502, 'CLAUDE_PARSE_ERROR', 'Could not parse recommendations');
    }

    const owned = new Set(library.map((row) => row.title.toLowerCase()));
    const alreadyShown = new Set(exclude.map((title) => title.toLowerCase()));

    // Claude returns titles; resolve each against MangaDex so the frontend
    // gets real ids and cover art (and "Add to List" works on the result).
    const resolved = await Promise.all(
        parsed.recommendations.map(async ({ title, reason }) => {
            try {
                const [match] = await searchManga(title, 1);
                if (!match) return null;
                const matchTitle = match.title.toLowerCase();
                if (owned.has(matchTitle) || alreadyShown.has(matchTitle)) return null;
                return { ...match, reason } satisfies Recommendation;
            } catch {
                return null;
            }
        }),
    );

    // Two different titles from Claude can resolve to the same MangaDex entry
    // (e.g. an English and a romaji name). Keep the first so ids stay unique.
    const seenIds = new Set<string>();
    const results: Recommendation[] = [];
    for (const item of resolved) {
        if (!item || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        results.push(item);
    }
    return results;
}

function sendError(res: Response, error: unknown) {
    if (error instanceof RecommendationError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message, status: error.status } });
        return;
    }
    if (error instanceof Anthropic.AuthenticationError) {
        res.status(503).json({
            error: { code: 'CLAUDE_AUTH_ERROR', message: 'Invalid Anthropic API key', status: 503 },
        });
        return;
    }
    if (error instanceof Anthropic.RateLimitError) {
        res.status(429).json({
            error: { code: 'CLAUDE_RATE_LIMITED', message: 'Rate limited, try again shortly', status: 429 },
        });
        return;
    }
    if (error instanceof Anthropic.APIError) {
        res.status(502).json({
            error: { code: 'CLAUDE_API_ERROR', message: error.message, status: 502 },
        });
        return;
    }
    res.status(500).json({
        error: {
            code: 'RECOMMENDATIONS_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            status: 500,
        },
    });
}

router.post('/recommendations', async (req: AuthedRequest, res) => {
    const library = await loadLibrary(req, res);
    if (!library) return;

    // The hash is the cache key. Because it's derived from the library itself,
    // adding or removing a manga changes the key and misses automatically -
    // there is no separate invalidation step to forget.
    const libraryMangaIds = library.map((row) => row.manga_id);
    const libraryHash = generateLibraryHash(libraryMangaIds);

    const cached = await getCachedRecommendations(libraryHash, MODEL);
    if (cached) {
        res.status(200).json({ results: cached, cached: true });
        return;
    }

    try {
        const results = await generateRecommendations(library, []);

        // Only successful, non-empty results get cached. Caching a failure or an
        // empty array would pin that bad answer for the whole TTL.
        await setCachedRecommendations(libraryHash, libraryMangaIds, MODEL, results);

        res.status(200).json({ results, cached: false });
    } catch (error) {
        sendError(res, error);
    }
});

// "Get more" always calls Claude - skipping the cache read is the point. It
// excludes both the cached list for this library and whatever the client is
// displaying. The client list matters because adding a recommendation to the
// library changes the hash, so the cache row for the new hash won't know about
// the other recommendations still on screen. New results are appended to the
// cache row, so reloading the page keeps the expanded list without re-paying.
router.post('/recommendations/more', async (req: AuthedRequest, res) => {
    const library = await loadLibrary(req, res);
    if (!library) return;

    const libraryMangaIds = library.map((row) => row.manga_id);
    const libraryHash = generateLibraryHash(libraryMangaIds);

    const clientExclude: string[] = Array.isArray(req.body?.exclude)
        ? req.body.exclude.filter((title: unknown): title is string => typeof title === 'string')
        : [];

    const cached = (await getCachedRecommendations(libraryHash, MODEL)) ?? [];
    const exclude = [...new Set([...cached.map((item) => item.title), ...clientExclude])];

    try {
        const results = await generateRecommendations(library, exclude);

        const cachedIds = new Set(cached.map((item) => item.id));
        const fresh = results.filter((item) => !cachedIds.has(item.id));

        await setCachedRecommendations(libraryHash, libraryMangaIds, MODEL, [...cached, ...fresh]);

        res.status(200).json({ results: fresh });
    } catch (error) {
        sendError(res, error);
    }
});

export default router;
