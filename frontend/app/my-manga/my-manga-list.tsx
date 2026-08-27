"use client";

import { useEffect, useState } from "react";
import { Manga as MangaCard } from "../components/manga";
import { createClient } from "../lib/supabase/client";

interface LibraryItem {
	id: string;
	mangaId: string;
	title: string;
	description?: string;
	coverUrl?: string;
	genres: string[];
	mangaStatus: "ongoing" | "completed" | "hiatus" | "cancelled";
	year?: number;
}

export default function MyMangaList() {
	const [items, setItems] = useState<LibraryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		async function loadLibrary() {
			const supabase = createClient();
			const { data: { session } } = await supabase.auth.getSession();

			if (!session) {
				setError("Sign in to see your manga list.");
				setLoading(false);
				return;
			}

			try {
				const response = await fetch("http://localhost:3001/library", {
					headers: { Authorization: `Bearer ${session.access_token}` },
				});
				if (!response.ok) throw new Error("Failed to load library");

				const { results } = await response.json() as { results: LibraryItem[] };
				setItems(results);
			} catch {
				setError("Unable to load your manga list right now.");
			} finally {
				setLoading(false);
			}
		}

		loadLibrary();
	}, []);

	async function handleRemove(mangaId: string) {
		const supabase = createClient();
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) return;

		await fetch(`http://localhost:3001/library/${mangaId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${session.access_token}` },
		});

		setItems((prev) => prev.filter((item) => item.mangaId !== mangaId));
	}

	if (loading) return <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>;
	if (error) return <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>;
	if (items.length === 0) {
		return <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Your list is empty. Search for manga to add some.</p>;
	}

	return (
		<ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{items.map((item) => (
				<li key={item.id}>
					<MangaCard
						id={item.mangaId}
						title={item.title}
						description={item.description}
						coverUrl={item.coverUrl}
						genres={item.genres}
						status={item.mangaStatus}
						year={item.year}
						actionLabel="Remove"
						onAction={() => handleRemove(item.mangaId)}
					/>
				</li>
			))}
		</ul>
	);
}
