"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Manga } from "../../lib/manga";
import { chapterLabel, fetchChapters, fetchManga, type Chapter } from "../../lib/reader";

export default function MangaDetails({ mangaId }: { mangaId: string }) {
	const [manga, setManga] = useState<Manga | null>(null);
	const [chapters, setChapters] = useState<Chapter[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		Promise.all([fetchManga(mangaId), fetchChapters(mangaId)])
			.then(([mangaResult, chapterResult]) => {
				if (cancelled) return;
				setManga(mangaResult);
				setChapters(chapterResult);
			})
			.catch((err: Error) => {
				if (!cancelled) setError(err.message);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => { cancelled = true; };
	}, [mangaId]);

	if (loading) {
		return <p className="px-16 py-8 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>;
	}

	if (error || !manga) {
		return (
			<p role="alert" className="px-16 py-8 text-sm text-red-600 dark:text-red-400">
				{error || "Manga not found."}
			</p>
		);
	}

	const first = chapters[0];

	return (
		<section className="flex w-full flex-col gap-8 px-16 py-8 sm:flex-row">
			<div className="w-48 shrink-0">
				<div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
					{manga.coverUrl && (
						<img src={manga.coverUrl} alt={`${manga.title} cover`} className="h-full w-full object-cover" />
					)}
				</div>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-4">
				<h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">{manga.title}</h1>

				<div className="flex flex-wrap gap-1.5">
					{manga.genres.map((genre) => (
						<span key={genre} className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
							{genre}
						</span>
					))}
				</div>

				<p className="text-xs text-zinc-500 dark:text-zinc-400">
					{manga.status}{manga.year && ` · ${manga.year}`}
				</p>

				{manga.description && (
					<p className="max-w-3xl whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
						{manga.description}
					</p>
				)}

				{first ? (
					<>
						<Link
							href={`/manga/${mangaId}/read/${first.id}`}
							className="w-fit rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
						>
							Start reading
						</Link>

						<div>
							<h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
								{chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
							</h2>
							<ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
								{chapters.map((chapter) => (
									<li key={chapter.id}>
										<Link
											href={`/manga/${mangaId}/read/${chapter.id}`}
											className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
										>
											<span className="truncate text-black dark:text-zinc-100">{chapterLabel(chapter)}</span>
											<span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
												{chapter.volume && `Vol. ${chapter.volume}`}
												{chapter.volume && chapter.group && " · "}
												{chapter.group}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					</>
				) : (
					<div className="max-w-xl rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
						<p className="font-semibold text-black dark:text-white">Not available to read here</p>
						<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
							MangaDex doesn&apos;t host English chapters for this title, usually because it&apos;s officially licensed.
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
