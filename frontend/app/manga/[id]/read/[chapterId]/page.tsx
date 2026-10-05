import Reader from "./reader";

export default async function ReadPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
	const { id, chapterId } = await params;
	return <Reader key={chapterId} mangaId={id} chapterId={chapterId} />;
}
