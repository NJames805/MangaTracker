import MangaDetails from "./manga-details";

export default async function MangaPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <MangaDetails mangaId={id} />;
}
