import { notFound, redirect } from "next/navigation";
import { BookForm } from "@/components/BookForm";
import {
  getBook,
  getBookLocations,
  getBookSubjects,
} from "@/lib/actions/books";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const book = await getBook(Number(id));
  if (!book) notFound();

  // Widok szczegółów = formularz edycji (jak w Bibliotekarzu)
  if (edit !== "0") {
    const [subjects, locations] = await Promise.all([
      getBookSubjects(),
      getBookLocations(),
    ]);
    return (
      <div className="mx-auto h-full max-w-6xl">
        <BookForm book={book} subjects={subjects} locations={locations} />
      </div>
    );
  }

  redirect(`/ksiegozbior/${book.id}`);
}
