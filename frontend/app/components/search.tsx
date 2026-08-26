"use client";

import { FormEvent, useState } from "react";
import { Manga as MangaCard } from "./manga";

interface Manga {
	id: string;
	title: string;
	description?: string;
	coverUrl?: string;
	genres: string[];
	status: "ongoing" | "completed" | "hiatus" | "cancelled";
	year?: number;
}

export default function Search() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Manga[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	function handleAddToList(mangaId: string) {
		setResults((prev) => prev.filter((manga) => manga.id !== mangaId));
	}

	async function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const search = query.trim();
		if (!search) return;

		setLoading(true);
		setError("");

		try {
			const response = await fetch(`http://localhost:3001/search?q=${encodeURIComponent(search)}`);
			if (!response.ok) throw new Error("Search failed");

			const { results } = await response.json() as { results: Manga[] };
			setResults(results);
		} catch {
			setResults([]);
			setError("Unable to search right now.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<section className="w-full">
			<form onSubmit={handleSearch} role="search" className="flex gap-2">
				<input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search manga..."
					aria-label="Search manga"
					className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
				/>
				<button
					type="submit"
					disabled={loading || !query.trim()}
					className="rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
				>
					{loading ? "Searching..." : "Search"}
				</button>
			</form>

			{error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
			<ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
				{results.map((manga) => (
					<li key={manga.id}>
						<MangaCard {...manga} onAddToList={() => handleAddToList(manga.id)} />
					</li>
				))}
			</ul>
		</section>
	);
}
