import { Router } from 'express';
import { supabase } from './supabase';
import { requireAuth, AuthedRequest } from './auth';
import { Manga, ReadingProgress } from './types';

const router = Router();

router.use(requireAuth);

router.get('/library', async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
        .from('manga_library')
        .select('*')
        .eq('user_id', req.userId)
        .order('date_added', { ascending: false });

    if (error) {
        res.status(500).json({ error: { code: 'DATABASE_ERROR', message: error.message, status: 500 } });
        return;
    }

    const results: ReadingProgress[] = data.map((row) => ({
        id: row.id,
        mangaId: row.manga_id,
        title: row.title,
        description: row.description ?? undefined,
        coverUrl: row.cover_url ?? undefined,
        genres: row.genres,
        mangaStatus: row.manga_status,
        year: row.year ?? undefined,
        readingStatus: row.reading_status,
        chaptersRead: row.chapters_read,
        volumesRead: row.volumes_read,
        dateAdded: row.date_added,
        lastUpdated: row.last_updated,
    }));

    res.status(200).json({ results });
});

router.post('/library', async (req: AuthedRequest, res) => {
    const manga = req.body as Manga;

    if (!manga?.id || !manga.title) {
        res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Missing manga id or title', status: 400 } });
        return;
    }

    const { error } = await supabase.from('manga_library').insert({
        user_id: req.userId,
        manga_id: manga.id,
        title: manga.title,
        description: manga.description,
        cover_url: manga.coverUrl,
        genres: manga.genres,
        manga_status: manga.status,
        year: manga.year,
    });

    if (error) {
        if (error.code === '23505') {
            res.status(409).json({ error: { code: 'ALREADY_IN_LIBRARY', message: 'Manga already in library', status: 409 } });
            return;
        }
        res.status(500).json({ error: { code: 'DATABASE_ERROR', message: error.message, status: 500 } });
        return;
    }

    res.status(201).json({});
});

router.delete('/library/:mangaId', async (req: AuthedRequest, res) => {
    const { error } = await supabase
        .from('manga_library')
        .delete()
        .eq('user_id', req.userId)
        .eq('manga_id', req.params.mangaId);

    if (error) {
        res.status(500).json({ error: { code: 'DATABASE_ERROR', message: error.message, status: 500 } });
        return;
    }

    res.status(204).send();
});

export default router;
