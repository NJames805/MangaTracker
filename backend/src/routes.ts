import { Router } from 'express';
import { Manga, MangaDexSearchResponse } from './types';

const router = Router();

//search route
router.get('/search', async (req, res) => {
    const query = req.query.q as string;
    const results = await searchManga(query);

    async function searchManga(query: string): Promise<Manga[]> {
        // Perform search logic here
        // For example, you can filter the Manga array based on the query
        const searchParams = new URLSearchParams({ title: query });
        searchParams.append('includes[]', 'cover_art');
        searchParams.append('includes[]', 'author');

        const results: Manga[] = await fetch(`https://api.mangadex.org/manga?${searchParams.toString()}`)
            .then(response => response.json() as Promise<MangaDexSearchResponse>)
            .then(({ data }) => data.map((manga) => ({
                id: manga.id,
                title: manga.attributes.title.en
                    || manga.attributes.title['ja-ro']
                    || manga.attributes.title.ja
                    || Object.values(manga.attributes.title)[0]
                    || '',
                description: manga.attributes.description?.en || '',
                coverUrl: (() => {
                    const fileName = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;
                    return fileName ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}` : '';
                })(),
                genres: manga.attributes.tags.map((tag) => tag.attributes.name.en || ''),
                status: manga.attributes.status,
                ...(manga.attributes.year != null && { year: manga.attributes.year }),
            })));
        return results;
    }

    // Perform search logic here
    res.status(200).json({ results });
});


export default router;