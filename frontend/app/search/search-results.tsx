"use client";

import { useEffect, useState } from "react";
import MangaGrid from "../components/manga-grid";
import { addMangaToList, type Manga } from "../lib/manga";

export default function SearchResults({ query }: { query: string }) {
	const [results, setResults] = useState<Manga[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function runSearch() {
			setLoading(true);
			setError("");

			try {
				const response = await fetch(`http://localhost:3001/search?q=${encodeURIComponent(query)}`);
				if (!response.ok) throw new Error("Search failed");

				const { results } = await response.json() as { results: Manga[] };
				if (!cancelled) setResults(results);
			} catch {
				if (!cancelled) {
					setResults([]);
					setError("Unable to search right now.");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		runSearch();
		return () => { cancelled = true; };
	}, [query]);

	async function handleAddToList(manga: Manga) {
		const result = await addMangaToList(manga);
		if (!result.ok) {
			setError(result.message ?? "Unable to add to your list right now.");
			return;
		}
		setResults((prev) => prev.filter((m) => m.id !== manga.id));
	}

	if (loading) {
		return <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Searching...</p>;
	}

	return (
		<>
			{error && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
			{!error && results.length === 0 && (
				<p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
					No manga found for &ldquo;{query}&rdquo;.
				</p>
			)}
			<MangaGrid items={results} onAction={handleAddToList} />
		</>
	);
}
