"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
	chapterLabel,
	fetchChapters,
	fetchPages,
	reportImageLoad,
	type Chapter,
	type PageQuality,
} from "../../../../lib/reader";

// Keep each manga's chapter list for the session, so moving between chapters
// doesn't refetch the whole list from MangaDex every time. The resolved lists
// let a new chapter render its title and navigation immediately instead of
// flashing "Chapter" while the promise resolves.
const chapterListCache = new Map<string, Promise<Chapter[]>>();
const loadedChapterLists = new Map<string, Chapter[]>();

function getChapterList(mangaId: string): Promise<Chapter[]> {
	let list = chapterListCache.get(mangaId);
	if (!list) {
		list = fetchChapters(mangaId);
		chapterListCache.set(mangaId, list);
		list.then(
			(chapters) => loadedChapterLists.set(mangaId, chapters),
			() => chapterListCache.delete(mangaId),
		);
	}
	return list;
}

const QUALITY_KEY = "reader-quality";

function readSavedQuality(): PageQuality {
	try {
		return localStorage.getItem(QUALITY_KEY) === "data" ? "data" : "data-saver";
	} catch {
		return "data-saver";
	}
}

function subscribeToStorage(onChange: () => void) {
	window.addEventListener("storage", onChange);
	return () => window.removeEventListener("storage", onChange);
}

// If fresh URLs still fail this soon after a refresh, the problem isn't an
// expired address, so stop retrying and tell the reader.
const REFRESH_COOLDOWN_MS = 30_000;

export default function Reader({ mangaId, chapterId }: { mangaId: string; chapterId: string }) {
	const router = useRouter();
	// Empty on a full page load (matching the server render); already filled
	// when moving between chapters in the app.
	const [chapters, setChapters] = useState<Chapter[]>(() => loadedChapterLists.get(mangaId) ?? []);

	// The saved setting only exists in the browser: it's null during the
	// server render, so pages are fetched once, at the right quality.
	const savedQuality = useSyncExternalStore(subscribeToStorage, readSavedQuality, () => null);
	const [chosenQuality, setChosenQuality] = useState<PageQuality | null>(null);
	const quality = chosenQuality ?? savedQuality;

	const [pages, setPages] = useState<string[]>([]);
	const [loaded, setLoaded] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [brokenPages, setBrokenPages] = useState(false);
	// Part of each image's key. Fresh URLs are often identical to the expired
	// ones, and a browser won't re-request an <img> whose src didn't change,
	// so each refresh remounts the images. Already-loaded pages come straight
	// from the browser cache.
	const [attempt, setAttempt] = useState(0);

	const pagesRef = useRef<string[]>([]);
	const loadedRef = useRef<Set<number>>(new Set());
	const refreshingRef = useRef(false);
	const lastRefreshRef = useRef(-Infinity);

	useEffect(() => {
		let cancelled = false;
		getChapterList(mangaId)
			.then((list) => { if (!cancelled) setChapters(list); })
			.catch(() => {
				// Without the list only prev/next and the dropdown are missing;
				// the pages still load.
			});
		return () => { cancelled = true; };
	}, [mangaId]);

	// The component is keyed by chapter, so state starts fresh for each one.
	// Switching quality resets state in toggleQuality before this refetches.
	useEffect(() => {
		if (!quality) return;
		let cancelled = false;

		fetchPages(chapterId, quality)
			.then((urls) => {
				if (cancelled) return;
				pagesRef.current = urls;
				setPages(urls);
			})
			.catch((err: Error) => { if (!cancelled) setError(err.message); })
			.finally(() => { if (!cancelled) setLoading(false); });

		return () => { cancelled = true; };
	}, [chapterId, quality]);

	const index = chapters.findIndex((chapter) => chapter.id === chapterId);
	const current = index >= 0 ? chapters[index] : undefined;
	const prev = index > 0 ? chapters[index - 1] : undefined;
	const next = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined;

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
			if (event.key === "ArrowLeft" && prev) router.push(`/manga/${mangaId}/read/${prev.id}`);
			if (event.key === "ArrowRight" && next) router.push(`/manga/${mangaId}/read/${next.id}`);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [prev, next, mangaId, router]);

	// Gets brand-new page URLs. Pages that already loaded keep their old URL
	// so they don't download again and shift the reader's scroll position.
	// `at` is the triggering event's timestamp (same clock as performance.now).
	async function refreshPages(at: number): Promise<void> {
		if (!quality || refreshingRef.current) return;
		refreshingRef.current = true;
		lastRefreshRef.current = at;
		try {
			const fresh = await fetchPages(chapterId, quality, true);
			const merged = fresh.map((url, i) => (loadedRef.current.has(i) ? pagesRef.current[i] ?? url : url));
			pagesRef.current = merged;
			setPages(merged);
			setAttempt((n) => n + 1);
			setBrokenPages(false);
		} catch {
			setBrokenPages(true);
		} finally {
			refreshingRef.current = false;
		}
	}

	function handleLoad(i: number, url: string) {
		reportImageLoad(url, true);
		loadedRef.current.add(i);
		setLoaded(new Set(loadedRef.current));
	}

	// Usually means the image server address expired (MangaDex only
	// guarantees 15 minutes) or that server is down. Either way, fresh URLs
	// from MangaDex fix it.
	function handleError(url: string, at: number) {
		if (!pagesRef.current.includes(url)) return; // an old URL from before a refresh
		reportImageLoad(url, false);
		if (refreshingRef.current) return;
		if (at - lastRefreshRef.current < REFRESH_COOLDOWN_MS) {
			setBrokenPages(true);
			return;
		}
		void refreshPages(at);
	}

	function toggleQuality() {
		const nextQuality: PageQuality = quality === "data" ? "data-saver" : "data";
		try {
			localStorage.setItem(QUALITY_KEY, nextQuality);
		} catch {
			// Storage unavailable (e.g. private mode) - the toggle still works for this visit.
		}
		pagesRef.current = [];
		loadedRef.current = new Set();
		setPages([]);
		setLoaded(new Set());
		setError("");
		setBrokenPages(false);
		setLoading(true);
		setChosenQuality(nextQuality);
	}

	const buttonClass = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900";
	const disabledClass = "rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600";

	const nav = (
		<div className="flex flex-wrap items-center gap-2">
			{prev ? (
				<Link href={`/manga/${mangaId}/read/${prev.id}`} className={buttonClass}>← Previous</Link>
			) : (
				<span className={disabledClass}>← Previous</span>
			)}
			{chapters.length > 0 && (
				<select
					value={chapterId}
					onChange={(event) => router.push(`/manga/${mangaId}/read/${event.target.value}`)}
					aria-label="Jump to chapter"
					className="max-w-xs rounded-full border border-zinc-300 bg-transparent px-3 py-1.5 text-sm text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
				>
					{index < 0 && <option value={chapterId}>Current chapter</option>}
					{chapters.map((chapter) => (
						<option key={chapter.id} value={chapter.id}>{chapterLabel(chapter)}</option>
					))}
				</select>
			)}
			{next ? (
				<Link href={`/manga/${mangaId}/read/${next.id}`} className={buttonClass}>Next →</Link>
			) : (
				<span className={disabledClass}>Next →</span>
			)}
		</div>
	);

	return (
		<section className="flex w-full flex-col items-center gap-6 py-6">
			<div className="flex w-full max-w-3xl flex-col gap-3 px-4">
				<Link href={`/manga/${mangaId}`} className="w-fit text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
					← Back to manga
				</Link>
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="text-xl font-semibold text-black dark:text-white">
							{current ? chapterLabel(current) : "Chapter"}
						</h1>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">
							{current?.group ? `Scanlated by ${current.group}, via MangaDex` : "Via MangaDex"}
						</p>
					</div>
					{quality && (
						<button type="button" onClick={toggleQuality} className={buttonClass}>
							{quality === "data" ? "Full quality" : "Data saver"}
						</button>
					)}
				</div>
				{nav}
			</div>

			{loading && <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading pages...</p>}
			{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

			<div className="flex w-full max-w-3xl flex-col">
				{pages.map((url, i) => (
					// Plain <img>, not next/image: pages load straight from MangaDex
					// rather than through Next's image optimizer (PLAN.md decision 1).
					// eslint-disable-next-line @next/next/no-img-element
					<img
						key={`${attempt}-${i}`}
						src={url}
						alt={`Page ${i + 1}`}
						loading="lazy"
						onLoad={() => handleLoad(i, url)}
						onError={(event) => handleError(url, event.timeStamp)}
						className={loaded.has(i) ? "block w-full" : "block min-h-[60vh] w-full bg-zinc-100 dark:bg-zinc-900"}
					/>
				))}
			</div>

			{brokenPages && (
				<p role="alert" className="text-sm text-red-600 dark:text-red-400">
					Some pages didn&apos;t load.{" "}
					<button
						type="button"
						onClick={(event) => {
							lastRefreshRef.current = -Infinity;
							void refreshPages(event.timeStamp);
						}}
						className="underline"
					>
						Try again
					</button>
				</p>
			)}

			{pages.length > 0 && <div className="w-full max-w-3xl px-4">{nav}</div>}
		</section>
	);
}
