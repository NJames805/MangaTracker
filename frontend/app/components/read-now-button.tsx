"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { checkReadable } from "../lib/reader";

// Wait this long before checking, so sweeping the mouse across a row of cards
// doesn't send a MangaDex request for every card it passes over.
const HOVER_DELAY_MS = 200;

export default function ReadNowButton({ mangaId }: { mangaId: string }) {
	const [unavailable, setUnavailable] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => () => {
		if (timerRef.current) clearTimeout(timerRef.current);
	}, []);

	function startCheck() {
		if (unavailable || timerRef.current) return;
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			checkReadable(mangaId)
				.then((readable) => { if (!readable) setUnavailable(true); })
				.catch(() => {
					// Couldn't check: leave it a normal link. The manga page still
					// says "Not available" if it is.
				});
		}, HOVER_DELAY_MS);
	}

	function cancelCheck() {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
	}

	if (unavailable) {
		return (
			// min-h instead of a fixed height: on narrow cards the message wraps
			// to two lines.
			<span
				aria-disabled="true"
				className="mt-auto flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full bg-zinc-200 px-4 py-2 text-center text-xs leading-tight text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
			>
				Not available to read here
			</span>
		);
	}

	return (
		<Link
			href={`/manga/${mangaId}`}
			onMouseEnter={startCheck}
			onMouseLeave={cancelCheck}
			onFocus={startCheck}
			onBlur={cancelCheck}
			className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
		>
			Read Now
		</Link>
	);
}
