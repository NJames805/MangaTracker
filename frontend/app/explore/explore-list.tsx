"use client";

import { useEffect, useState } from "react";
import MangaGrid from "../components/manga-grid";
import { addMangaToList, type Manga } from "../lib/manga";
import { createClient } from "../lib/supabase/client";

interface Recommendation extends Manga {
	reason: string;
}

async function getAccessToken(): Promise<string | null> {
	const supabase = createClient();
	const { data: { session } } = await supabase.auth.getSession();
	return session?.access_token ?? null;
}

export default function ExploreList() {
	const [results, setResults] = useState<Recommendation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [hasRun, setHasRun] = useState(false);

	const [loadingMore, setLoadingMore] = useState(false);
	const [moreError, setMoreError] = useState("");
	const [noMoreFound, setNoMoreFound] = useState(false);

	async function getRecommendations() {
		setLoading(true);
		setError("");

		const token = await getAccessToken();
		if (!token) {
			setError("Sign in to get recommendations.");
			setLoading(false);
			return;
		}

		try {
			const response = await fetch("http://localhost:3001/recommendations", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});

			const body = await response.json();

			if (!response.ok) {
				setError(body?.error?.message ?? "Unable to get recommendations right now.");
				setResults([]);
				return;
			}

			setResults(body.results as Recommendation[]);
			setHasRun(true);
		} catch {
			setError("Unable to get recommendations right now.");
			setResults([]);
		} finally {
			setLoading(false);
		}
	}

	// A failed "get more" leaves the existing recommendations on screen and
	// reports the error next to the button, where the user is looking.
	async function getMoreRecommendations() {
		setLoadingMore(true);
		setMoreError("");
		setNoMoreFound(false);

		const token = await getAccessToken();
		if (!token) {
			setMoreError("Sign in to get recommendations.");
			setLoadingMore(false);
			return;
		}

		try {
			const response = await fetch("http://localhost:3001/recommendations/more", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ exclude: results.map((item) => item.title) }),
			});

			const body = await response.json();

			if (!response.ok) {
				setMoreError(body?.error?.message ?? "Unable to get more recommendations right now.");
				return;
			}

			const incoming = body.results as Recommendation[];
			if (incoming.length === 0) {
				setNoMoreFound(true);
				return;
			}

			// The server already filters repeats; dedupe by id here too so a
			// duplicate can never produce two cards with the same React key.
			setResults((prev) => {
				const seen = new Set(prev.map((item) => item.id));
				return [...prev, ...incoming.filter((item) => !seen.has(item.id))];
			});
		} catch {
			setMoreError("Unable to get more recommendations right now.");
		} finally {
			setLoadingMore(false);
		}
	}

	// Fetch once on mount. This is safe to call unconditionally - the backend
	// cache means an unchanged library resolves in ~1s with no Claude call,
	// so loading the page doesn't cost anything unless the library actually
	// changed since the last visit.
	useEffect(() => {
		getRecommendations();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function handleAddToList(manga: Manga) {
		const result = await addMangaToList(manga);
		if (!result.ok) {
			setError(result.message ?? "Unable to add to your list right now.");
			return;
		}
		setResults((prev) => prev.filter((m) => m.id !== manga.id));
	}

	return (
		<>
			{loading && <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Finding recommendations...</p>}

			{error && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

			{hasRun && !loading && !error && results.length === 0 && (
				<p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
					No new recommendations found. Try again after adding more manga to your list.
				</p>
			)}

			<MangaGrid items={results} onAction={handleAddToList} />

			{results.length > 0 && (
				<div className="mt-8 flex flex-col items-center gap-3">
					<button
						type="button"
						onClick={getMoreRecommendations}
						disabled={loadingMore}
						className="rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
					>
						{loadingMore ? "Finding more..." : "Get more recommendations"}
					</button>
					{moreError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{moreError}</p>}
					{noMoreFound && (
						<p className="text-sm text-zinc-600 dark:text-zinc-400">
							No new recommendations found this time. Try again, or add more manga to your list.
						</p>
					)}
				</div>
			)}
		</>
	);
}
