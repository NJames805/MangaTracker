import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import ExploreList from "./explore-list";

export default async function Explore() {
	const supabase = await createClient();
	const { data } = await supabase.auth.getUser();

	if (!data.user) {
		redirect("/login");
	}

	return (
		<section className="w-full px-16 py-8">
			<h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Explore</h1>
			<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
				Recommendations picked by Claude based on the manga in your list.
			</p>
			<ExploreList />
		</section>
	);
}
