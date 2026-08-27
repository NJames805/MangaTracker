interface MangaProps {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    genres: string[];
    status: "ongoing" | "completed" | "hiatus" | "cancelled";
    year?: number;
    actionLabel?: string;
    onAction?: () => void;
}

export function Manga({ id, title, description, coverUrl, genres, status, year, actionLabel = "Add to List", onAction }: MangaProps) {
    const link = `https://mangadex.org/title/${id}`;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 font-sans shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800">
                {coverUrl && (
                    <img src={coverUrl} alt={`${title} cover`} className="h-full w-full object-cover" />
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
                    {title}
                </h3>
                {description && (
                    <p className="line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {description}
                    </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                    {genres.map((genre) => (
                        <span key={genre} className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                            {genre}
                        </span>
                    ))}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {status}{year && ` · ${year}`}
                </p>
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                >
                    {actionLabel}
                </button>
                <a
                    className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Read Now
                </a>
            </div>
        </div>
    );
}