"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function Login() {
	const router = useRouter();
	const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError("");
		setMessage("");

		const supabase = createClient();
		const { data, error } =
			mode === "sign-up"
				? await supabase.auth.signUp({ email, password })
				: await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			setError(error.message);
		} else if (mode === "sign-up" && !data.session) {
			setMessage("Check your email to confirm your account before signing in.");
		} else {
			router.push("/my-manga");
			router.refresh();
		}

		setLoading(false);
	}

	return (
		<section className="mx-auto flex max-w-sm flex-col gap-6 p-16">
			<h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
				{mode === "sign-up" ? "Create an account" : "Sign in"}
			</h1>

			<form onSubmit={handleSubmit} className="flex flex-col gap-3">
				<input
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="Email"
					required
					className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
				/>
				<input
					type="password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="Password"
					required
					minLength={6}
					className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
				/>
				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
				>
					{loading ? "Please wait..." : mode === "sign-up" ? "Sign up" : "Sign in"}
				</button>
			</form>

			{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
			{message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}

			<button
				type="button"
				onClick={() => {
					setMode(mode === "sign-up" ? "sign-in" : "sign-up");
					setError("");
					setMessage("");
				}}
				className="text-sm text-zinc-600 underline dark:text-zinc-400"
			>
				{mode === "sign-up" ? "Already have an account? Sign in" : "Need an account? Sign up"}
			</button>
		</section>
	);
}
