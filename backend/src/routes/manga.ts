import { Router, type Response } from 'express';
import {
    getChapterPages,
    getManga,
    getReadableChapters,
    hasReadableChapters,
    MangaDexError,
    reportImageLoad,
} from '../services/mangadex';
import { PageQuality } from '../types';

// Public routes: reading doesn't require an account.
const router = Router();

function sendError(res: Response, error: unknown) {
    if (error instanceof MangaDexError && error.status === 404) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message, status: 404 } });
        return;
    }
    if (error instanceof MangaDexError && error.status === 429) {
        res.status(429).json({
            error: { code: 'MANGADEX_RATE_LIMITED', message: 'MangaDex is rate limiting us, try again shortly', status: 429 },
        });
        return;
    }
    res.status(502).json({
        error: {
            code: 'MANGADEX_ERROR',
            message: error instanceof Error ? error.message : 'MangaDex request failed',
            status: 502,
        },
    });
}

router.get('/manga/:id', async (req, res) => {
    try {
        const manga = await getManga(req.params.id);
        if (!manga) {
            res.status(404).json({ error: { code: 'MANGA_NOT_FOUND', message: 'No manga with this id', status: 404 } });
            return;
        }
        res.status(200).json({ manga });
    } catch (error) {
        sendError(res, error);
    }
});

router.get('/manga/:id/chapters', async (req, res) => {
    try {
        const chapters = await getReadableChapters(req.params.id);
        res.status(200).json({ chapters });
    } catch (error) {
        sendError(res, error);
    }
});

// Lightweight check used when hovering "Read Now" on a card.
router.get('/manga/:id/availability', async (req, res) => {
    try {
        const readable = await hasReadableChapters(req.params.id);
        res.status(200).json({ readable });
    } catch (error) {
        sendError(res, error);
    }
});

// ?quality=data for full size (default data-saver); ?refresh=1 to get fresh
// URLs after the old ones expired.
router.get('/chapters/:id/pages', async (req, res) => {
    const quality: PageQuality = req.query.quality === 'data' ? 'data' : 'data-saver';
    const refresh = req.query.refresh === '1';

    try {
        const pages = await getChapterPages(req.params.id, quality, refresh);
        res.status(200).json({ pages, quality });
    } catch (error) {
        // Unknown ids and link-out-only chapters both end up here.
        if (error instanceof MangaDexError && (error.status === 404 || error.status === 400)) {
            res.status(404).json({
                error: { code: 'CHAPTER_NOT_FOUND', message: "This chapter isn't available to read here", status: 404 },
            });
            return;
        }
        sendError(res, error);
    }
});

// The browser reports how page images loaded; we forward that to MangaDex.
// Only MangaDex@Home hosts are accepted so this can't be used to post
// arbitrary data to MangaDex on our behalf.
router.post('/report', (req, res) => {
    const { url, success, cached, bytes, duration } = req.body ?? {};

    let host = '';
    try {
        host = new URL(url).hostname;
    } catch {
        // invalid URL - rejected below
    }

    const valid = host.endsWith('.mangadex.network')
        && typeof success === 'boolean'
        && typeof bytes === 'number'
        && typeof duration === 'number';

    if (!valid) {
        res.status(400).json({ error: { code: 'INVALID_REPORT', message: 'Invalid image report', status: 400 } });
        return;
    }

    // Respond first; a failed report must never affect reading.
    res.status(204).end();
    reportImageLoad({ url, success, cached: cached === true, bytes, duration }).catch(() => {});
});

export default router;
