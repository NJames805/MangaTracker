"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

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
		<nav className="flex w-full items-center justify-between px-16 py-6">
			<Link href="/" className="text-lg font-bold tracking-tight text-black dark:text-white">
				Manga Tracker
			</Link>
			<div className="flex items-center gap-4 text-sm">
				{user ? (
					<>
						<Link href="/my-manga" className="text-zinc-700 dark:text-zinc-300">
							My Manga
						</Link>
						<button type="button" onClick={handleSignOut} className="text-zinc-700 dark:text-zinc-300">
							Sign out
						</button>
					</>
				) : (
					<Link href="/login" className="text-zinc-700 dark:text-zinc-300">
						Sign in
					</Link>
				)}
			</div>
		</nav>
	);
}
