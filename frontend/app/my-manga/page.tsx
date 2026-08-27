import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import MyMangaList from "./my-manga-list";

export default async function MyManga() {
	const supabase = await createClient();
	const { data } = await supabase.auth.getUser();

	if (!data.user) {
		redirect("/login");
	}

	return (
		<section className="w-full px-16 py-8">
			<h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">My Manga</h1>
			<MyMangaList />
		</section>
	);
}
