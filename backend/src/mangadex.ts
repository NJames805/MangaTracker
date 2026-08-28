import { Manga, MangaDexSearchResponse } from './types';

// Fetches manga from MangaDex. With no title, returns the most-followed manga
// (used for the home page's browse list).
export async function searchManga(title?: string, limit?: number): Promise<Manga[]> {
    const searchParams = new URLSearchParams();
    if (title) {
        searchParams.set('title', title);
    } else {
        searchParams.set('order[followedCount]', 'desc');
    }
    if (limit !== undefined) {
        searchParams.set('limit', String(limit));
    }
    searchParams.append('includes[]', 'cover_art');
    searchParams.append('includes[]', 'author');

    const response = await fetch(`https://api.mangadex.org/manga?${searchParams.toString()}`);
    if (!response.ok) {
        throw new Error(`MangaDex request failed with status ${response.status}`);
    }

    const { data } = await response.json() as MangaDexSearchResponse;

    return data.map((manga) => ({
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
    }));
}
