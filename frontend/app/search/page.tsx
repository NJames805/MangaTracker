import SearchResults from "./search-results";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
	const { q } = await searchParams;
	const query = typeof q === "string" ? q : "";

	return (
		<section className="w-full px-16 py-8">
			<h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
				{query ? `Results for “${query}”` : "Search"}
			</h1>
			{query
				? <SearchResults query={query} />
				: <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Enter a title in the search bar above.</p>}
		</section>
	);
}
