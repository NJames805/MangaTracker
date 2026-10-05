import type { Manga } from "./manga";

const API = "http://localhost:3001";

export interface Chapter {
	id: string;
	chapter: string | null;
	volume: string | null;
	title: string | null;
	pages: number;
	group: string | null;
}

export type PageQuality = "data" | "data-saver";

// "Ch. 12: The Brand", "Oneshot", or just "Ch. 12" when there's no title.
export function chapterLabel(chapter: Chapter): string {
	const number = chapter.chapter === null ? "Oneshot" : `Ch. ${chapter.chapter}`;
	return chapter.title ? `${number}: ${chapter.title}` : number;
}

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(`${API}${path}`);
	const body = await response.json();
	if (!response.ok) {
		throw new Error(body?.error?.message ?? "Something went wrong");
	}
	return body as T;
}

export async function fetchManga(mangaId: string): Promise<Manga> {
	const { manga } = await getJson<{ manga: Manga }>(`/manga/${encodeURIComponent(mangaId)}`);
	return manga;
}

export async function fetchChapters(mangaId: string): Promise<Chapter[]> {
	const { chapters } = await getJson<{ chapters: Chapter[] }>(`/manga/${encodeURIComponent(mangaId)}/chapters`);
	return chapters;
}

// `refresh` asks the backend for brand-new URLs, for when the old ones expired.
export async function fetchPages(chapterId: string, quality: PageQuality, refresh = false): Promise<string[]> {
	const params = new URLSearchParams({ quality });
	if (refresh) params.set("refresh", "1");
	const { pages } = await getJson<{ pages: string[] }>(`/chapters/${encodeURIComponent(chapterId)}/pages?${params}`);
	return pages;
}

// MangaDex asks apps to report image loads from MangaDex@Home nodes. Timing
// comes from the browser's own record of the download. The size is only
// visible if the image server allows it (Timing-Allow-Origin); otherwise the
// browser reports 0 and that's what we send.
export function reportImageLoad(url: string, success: boolean) {
	if (!new URL(url).hostname.endsWith(".mangadex.network")) return;
	const timing = performance.getEntriesByName(url).at(-1) as PerformanceResourceTiming | undefined;
	fetch(`${API}/report`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			url,
			success,
			cached: timing ? timing.transferSize === 0 && timing.decodedBodySize > 0 : false,
			bytes: timing?.encodedBodySize ?? 0,
			duration: Math.round(timing?.duration ?? 0),
		}),
		keepalive: true,
	}).catch(() => {});
}
