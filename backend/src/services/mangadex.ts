import {
    Chapter,
    Manga,
    MangaDexAtHomeResponse,
    MangaDexChapterFeedResponse,
    MangaDexEntityResponse,
    MangaDexManga,
    MangaDexSearchResponse,
    PageQuality,
} from '../types';

const API = 'https://api.mangadex.org';

// MangaDex requires a real, non-spoofed User-Agent on API requests.
const USER_AGENT = 'MangaTracker/1.0 (+https://github.com/NJames805/MangaTracker)';

export class MangaDexError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

async function mangadexGet<T>(path: string, params?: URLSearchParams): Promise<T> {
    const query = params ? `?${params.toString()}` : '';
    const response = await fetch(`${API}${path}${query}`, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
        throw new MangaDexError(response.status, `MangaDex request failed with status ${response.status}`);
    }
    return await response.json() as T;
}

function toManga(manga: MangaDexManga): Manga {
    return {
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
    };
}

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

    const { data } = await mangadexGet<MangaDexSearchResponse>('/manga', searchParams);
    return data.map(toManga);
}

// Returns null when MangaDex has no manga with this id.
export async function getManga(id: string): Promise<Manga | null> {
    const params = new URLSearchParams();
    params.append('includes[]', 'cover_art');
    try {
        const { data } = await mangadexGet<MangaDexEntityResponse>(`/manga/${encodeURIComponent(id)}`, params);
        return toManga(data);
    } catch (error) {
        // MangaDex answers 400 for ids that aren't valid UUIDs.
        if (error instanceof MangaDexError && (error.status === 404 || error.status === 400)) return null;
        throw error;
    }
}

// English chapters that can actually be read in the app, in reading order.
//
// Uses the chapter feed with includeExternalUrl=0 rather than /aggregate,
// because /aggregate also lists chapters that only link out to an official
// site (e.g. every English One Piece chapter), which would look readable here
// and then fail. The feed has one entry per scanlation group, so duplicates of
// the same chapter number are collapsed to the first one.
export async function getReadableChapters(mangaId: string): Promise<Chapter[]> {
    const limit = 500;
    const entries: MangaDexChapterFeedResponse['data'] = [];

    // MangaDex caps offset + limit at 10,000.
    for (let offset = 0, total = 1; offset < total && offset < 10_000; offset += limit) {
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            includeExternalUrl: '0',
            'order[chapter]': 'asc',
        });
        params.append('translatedLanguage[]', 'en');
        params.append('includes[]', 'scanlation_group');

        let page: MangaDexChapterFeedResponse;
        try {
            page = await mangadexGet<MangaDexChapterFeedResponse>(`/manga/${encodeURIComponent(mangaId)}/feed`, params);
        } catch (error) {
            // An unknown manga simply has no readable chapters; the manga
            // lookup is what reports "not found".
            if (error instanceof MangaDexError && (error.status === 404 || error.status === 400)) return [];
            throw error;
        }
        entries.push(...page.data);
        total = page.total;
    }

    const byNumber = new Map<string, Chapter>();
    for (const entry of entries) {
        if (entry.attributes.externalUrl || entry.attributes.pages === 0) continue;
        // Oneshots have no chapter number; keep each of them by id.
        const key = entry.attributes.chapter ?? `id:${entry.id}`;
        if (byNumber.has(key)) continue;
        byNumber.set(key, {
            id: entry.id,
            chapter: entry.attributes.chapter,
            volume: entry.attributes.volume,
            title: entry.attributes.title || null,
            pages: entry.attributes.pages,
            group: entry.relationships.find((rel) => rel.type === 'scanlation_group')?.attributes?.name ?? null,
        });
    }

    // Sort numerically ourselves rather than trusting string order ("10" < "9").
    // Chapters without a number (oneshots) go last.
    const sortKey = (chapter: Chapter) => {
        const n = chapter.chapter === null ? NaN : Number(chapter.chapter);
        return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
    };
    return [...byNumber.values()].sort((a, b) => sortKey(a) - sortKey(b));
}

// Cheap yes/no for whether a manga has anything readable in the app, for
// checking a card on hover without downloading the whole chapter list.
// Applies the same rules as getReadableChapters.
export async function hasReadableChapters(mangaId: string): Promise<boolean> {
    const limit = 20;
    const params = new URLSearchParams({ limit: String(limit), includeExternalUrl: '0' });
    params.append('translatedLanguage[]', 'en');

    let page: MangaDexChapterFeedResponse;
    try {
        page = await mangadexGet<MangaDexChapterFeedResponse>(`/manga/${encodeURIComponent(mangaId)}/feed`, params);
    } catch (error) {
        if (error instanceof MangaDexError && (error.status === 404 || error.status === 400)) return false;
        throw error;
    }

    if (page.data.some((entry) => !entry.attributes.externalUrl && entry.attributes.pages > 0)) return true;
    // Nothing readable in the first batch but more exist: rare, so fall back
    // to the full check rather than guess.
    if (page.total > limit) return (await getReadableChapters(mangaId)).length > 0;
    return false;
}

// MangaDex guarantees an at-home baseUrl for 15 minutes. Reusing it for 10
// keeps us inside that window while sparing the 40-requests-per-minute limit
// on /at-home/server when a reader reloads or goes back to a chapter.
const PAGE_URL_TTL_MS = 10 * 60 * 1000;
const atHomeCache = new Map<string, { fetchedAt: number; atHome: MangaDexAtHomeResponse }>();

// Returns ready-to-load page image URLs. `refresh` skips the cache, for when
// the browser got a 403 because the baseUrl expired.
export async function getChapterPages(chapterId: string, quality: PageQuality, refresh = false): Promise<string[]> {
    const now = Date.now();
    let cached = atHomeCache.get(chapterId);

    if (refresh || !cached || now - cached.fetchedAt > PAGE_URL_TTL_MS) {
        const atHome = await mangadexGet<MangaDexAtHomeResponse>(`/at-home/server/${encodeURIComponent(chapterId)}`);
        cached = { fetchedAt: now, atHome };
        atHomeCache.set(chapterId, cached);

        // Drop expired entries so the cache doesn't grow with every chapter ever opened.
        for (const [id, entry] of atHomeCache) {
            if (now - entry.fetchedAt > PAGE_URL_TTL_MS) atHomeCache.delete(id);
        }
    }

    const { baseUrl, chapter } = cached.atHome;
    const files = quality === 'data' ? chapter.data : chapter.dataSaver;
    if (files.length === 0) {
        throw new MangaDexError(404, 'This chapter has no pages hosted on MangaDex');
    }
    return files.map((file) => `${baseUrl}/${quality}/${chapter.hash}/${file}`);
}

export interface ImageLoadReport {
    url: string;
    success: boolean;
    cached: boolean;
    bytes: number;
    duration: number;
}

// MangaDex asks apps to report image loads from MangaDex@Home nodes (any host
// that isn't mangadex.org) so it can route readers away from slow or broken
// nodes.
export async function reportImageLoad(report: ImageLoadReport): Promise<void> {
    await fetch('https://api.mangadex.network/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify(report),
    });
}
