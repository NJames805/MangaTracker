import { createClient } from "./supabase/client";

export interface Manga {
	id: string;
	title: string;
	description?: string;
	coverUrl?: string;
	genres: string[];
	status: "ongoing" | "completed" | "hiatus" | "cancelled";
	year?: number;
}

export async function addMangaToList(manga: Manga): Promise<{ ok: boolean; message?: string }> {
	const supabase = createClient();
	const { data: { session } } = await supabase.auth.getSession();

	if (!session) {
		return { ok: false, message: "Sign in to add manga to your list." };
	}

	try {
		const response = await fetch("http://localhost:3001/library", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify(manga),
		});

		if (!response.ok && response.status !== 409) {
			return { ok: false, message: "Unable to add to your list right now." };
		}

		return { ok: true };
	} catch {
		return { ok: false, message: "Unable to add to your list right now." };
	}
}
