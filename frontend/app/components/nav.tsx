"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import SearchBar from "./search-bar";

export default function Nav() {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const supabase = createClient();

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));

		const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
		});

		return () => subscription.subscription.unsubscribe();
	}, [supabase]);

	async function handleSignOut() {
		await supabase.auth.signOut();
		router.push("/");
		router.refresh();
	}

	return (
		<nav className="sticky top-0 z-50 flex w-full items-center gap-4 border-b border-zinc-200 bg-white/85 px-6 py-4 backdrop-blur sm:gap-8 sm:px-16 dark:border-zinc-800 dark:bg-black/85">
			<div className="w-full max-w-md flex items-center gap-4 sm:max-w-2xl lg:max-w-4xl">
				<Link
				href="/"
				className="shrink-0 text-lg font-bold tracking-tight whitespace-nowrap text-black transition-colors hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
			>
				Manga Tracker
			</Link>
				<SearchBar />
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-4 text-sm whitespace-nowrap">
				{user ? (
					<>
						<Link
							href="/explore"
							className="text-zinc-700 transition-colors hover:text-black dark:text-zinc-300 dark:hover:text-white"
						>
							Explore
						</Link>
						<Link
							href="/my-manga"
							className="text-zinc-700 transition-colors hover:text-black dark:text-zinc-300 dark:hover:text-white"
						>
							My Manga
						</Link>
						<button
							type="button"
							onClick={handleSignOut}
							className="text-zinc-700 transition-colors hover:text-black dark:text-zinc-300 dark:hover:text-white"
						>
							Sign out
						</button>
					</>
				) : (
					<Link
						href="/login"
						className="text-zinc-700 transition-colors hover:text-black dark:text-zinc-300 dark:hover:text-white"
					>
						Sign in
					</Link>
				)}
			</div>
		</nav>
	);
}
