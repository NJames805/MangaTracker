import { Router } from 'express';
import { searchManga } from './mangadex';

const router = Router();

//search route
router.get('/search', async (req, res) => {
    const query = (req.query.q as string | undefined)?.trim();

    try {
        const results = await searchManga(query);
        res.status(200).json({ results });
    } catch (error) {
        res.status(502).json({
            error: {
                code: 'MANGADEX_ERROR',
                message: error instanceof Error ? error.message : 'MangaDex request failed',
                status: 502,
            },
        });
    }
});

export default router;
