"use client";

import { useState } from "react";
import MangaGrid from "../components/manga-grid";
import { addMangaToList, type Manga } from "../lib/manga";
import { createClient } from "../lib/supabase/client";

interface Recommendation extends Manga {
	reason: string;
}

export default function ExploreList() {
	const [results, setResults] = useState<Recommendation[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [hasRun, setHasRun] = useState(false);

	async function getRecommendations() {
		setLoading(true);
		setError("");

		const supabase = createClient();
		const { data: { session } } = await supabase.auth.getSession();

		if (!session) {
			setError("Sign in to get recommendations.");
			setLoading(false);
			return;
		}

		try {
			const response = await fetch("http://localhost:3001/recommendations", {
				method: "POST",
				headers: { Authorization: `Bearer ${session.access_token}` },
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
			<button
				type="button"
				onClick={getRecommendations}
				disabled={loading}
				className="mt-6 rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
			>
				{loading ? "Thinking..." : hasRun ? "Get new recommendations" : "Get recommendations"}
			</button>

			{error && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

			{hasRun && !loading && !error && results.length === 0 && (
				<p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
					No new recommendations found. Try again after adding more manga to your list.
				</p>
			)}

			<MangaGrid items={results} onAction={handleAddToList} />
		</>
	);
}
