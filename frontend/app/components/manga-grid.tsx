import { Manga as MangaCard } from "./manga";
import type { Manga } from "../lib/manga";

interface MangaGridProps {
	items: Manga[];
	actionLabel?: string;
	onAction: (manga: Manga) => void;
}

export default function MangaGrid({ items, actionLabel, onAction }: MangaGridProps) {
	return (
		<ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{items.map((manga) => (
				<li key={manga.id}>
					<MangaCard {...manga} actionLabel={actionLabel} onAction={() => onAction(manga)} />
				</li>
			))}
		</ul>
	);
}
