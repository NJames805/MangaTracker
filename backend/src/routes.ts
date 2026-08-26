import express from 'express';
import cors from 'cors';
import { Manga, MangaDexSearchResponse } from './types';

const app = express();

// CORS configuration
const corsOptions = {
    origin: 'http://localhost:3000/',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

//search route
app.get('/search', async (req, res) => {
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
                coverUrl: manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName || '',
                genres: manga.attributes.tags.map((tag) => tag.attributes.name.en || ''),
                status: manga.attributes.status,
                ...(manga.attributes.year !== undefined && { year: manga.attributes.year }),
            })));
        return results;
    }

    // Perform search logic here
    res.status(200).json({ results });
});


export default app;