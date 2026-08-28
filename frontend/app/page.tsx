"use client";

import { useEffect, useState } from "react";
import MangaGrid from "./components/manga-grid";
import { addMangaToList, type Manga } from "./lib/manga";

export default function Home() {
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFeatured() {
      try {
        const response = await fetch("http://localhost:3001/search");
        if (!response.ok) throw new Error("Failed to load manga");

        const { results } = await response.json() as { results: Manga[] };
        setResults(results);
      } catch {
        setError("Unable to load manga right now.");
      } finally {
        setLoading(false);
      }
    }

    loadFeatured();
  }, []);

  async function handleAddToList(manga: Manga) {
    alert("You must be signed in to add manga to your list.");
    const result = await addMangaToList(manga);
    if (!result.ok) {
      setError(result.message ?? "Unable to add to your list right now.");
      return;
    }
    setResults((prev) => prev.filter((m) => m.id !== manga.id));
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-5xl font-extrabold tracking-tight text-black dark:text-white sm:text-[5rem]">
          Manga Tracker
        </h1>
        <p className="mt-3 text-2xl text-zinc-700 dark:text-zinc-400 sm:mt-5 sm:text-3xl">
          Keep track of your favorite manga and discover new ones.
        </p>
        <div className="mt-10 w-full">
          {loading && <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading manga...</p>}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <MangaGrid items={results} onAction={handleAddToList} />
        </div>
      </main>
    </div>
  );
}
