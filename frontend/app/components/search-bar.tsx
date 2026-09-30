"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
	const router = useRouter();
	const [query, setQuery] = useState("");

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const search = query.trim();
		if (!search) return;

		router.push(`/search?q=${encodeURIComponent(search)}`);
	}

	return (
		<form onSubmit={handleSubmit} role="search" className="flex gap-2">
			<input
				type="search"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder="Search manga..."
				aria-label="Search manga"
				className="min-w-0 flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm text-black placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
			/>
			<button
				type="submit"
				disabled={!query.trim()}
				className="shrink-0 rounded-full bg-foreground px-5 py-2 text-sm whitespace-nowrap text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
			>
				Search
			</button>
		</form>
	);
}
