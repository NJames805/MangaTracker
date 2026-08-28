import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { supabase } from './supabase';
import { requireAuth, AuthedRequest } from './auth';
import { searchManga } from './mangadex';
import { Recommendation } from './types';

const router = Router();

const RecommendationsSchema = z.object({
    recommendations: z.array(z.object({
        title: z.string().describe('The manga title, in English or romaji, as it would appear on MangaDex'),
        reason: z.string().describe('One or two sentences on why this fits the reader, referencing their library'),
    })),
});

router.use(requireAuth);

router.post('/recommendations', async (req: AuthedRequest, res) => {
    if (!process.env.ANTHROPIC_API_KEY) {
        res.status(503).json({
            error: {
                code: 'RECOMMENDATIONS_UNAVAILABLE',
                message: 'ANTHROPIC_API_KEY is not configured on the server',
                status: 503,
            },
        });
        return;
    }

    const { data: library, error: dbError } = await supabase
        .from('manga_library')
        .select('title, genres, description')
        .eq('user_id', req.userId);

    if (dbError) {
        res.status(500).json({ error: { code: 'DATABASE_ERROR', message: dbError.message, status: 500 } });
        return;
    }

    if (!library || library.length === 0) {
        res.status(400).json({
            error: {
                code: 'EMPTY_LIBRARY',
                message: 'Add some manga to your list before requesting recommendations',
                status: 400,
            },
        });
        return;
    }

    const libraryText = library
        .map((row) => `- ${row.title} (${row.genres.join(', ')}): ${(row.description || '').slice(0, 300)}`)
        .join('\n');

    try {
        // Identity-linked API keys must say which workspace the request acts in.
        // The SDK doesn't send this header for plain API-key auth, so set it here.
        const client = new Anthropic({
            ...(process.env.ANTHROPIC_WORKSPACE_ID && {
                defaultHeaders: { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID },
            }),
        });

        const message = await client.messages.parse({
            model: 'claude-opus-5',
            max_tokens: 16000,
            system: 'You are a manga recommendation assistant. Recommend manga that are real and findable on MangaDex. Never recommend a title the reader already has.',
            messages: [{
                role: 'user',
                content: `This reader's library:\n\n${libraryText}\n\nRecommend 5 manga they might enjoy based on similar themes, tone, or genre. Do not recommend anything already listed above.`,
            }],
            output_config: {
                format: zodOutputFormat(RecommendationsSchema),
            },
        });

        if (message.stop_reason === 'refusal') {
            res.status(502).json({
                error: { code: 'CLAUDE_REFUSAL', message: 'The model declined this request', status: 502 },
            });
            return;
        }

        const parsed = message.parsed_output;
        if (!parsed) {
            res.status(502).json({
                error: { code: 'CLAUDE_PARSE_ERROR', message: 'Could not parse recommendations', status: 502 },
            });
            return;
        }

        const owned = new Set(library.map((row) => row.title.toLowerCase()));

        // Claude returns titles; resolve each against MangaDex so the frontend
        // gets real ids and cover art (and "Add to List" works on the result).
        const resolved = await Promise.all(
            parsed.recommendations.map(async ({ title, reason }) => {
                try {
                    const [match] = await searchManga(title, 1);
                    if (!match || owned.has(match.title.toLowerCase())) return null;
                    return { ...match, reason } satisfies Recommendation;
                } catch {
                    return null;
                }
            }),
        );

        const results = resolved.filter((item): item is Recommendation => item !== null);
        res.status(200).json({ results });
    } catch (error) {
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
});

export default router;
