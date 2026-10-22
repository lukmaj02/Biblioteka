import { BookForm } from "@/components/BookForm";
import { getBookLocations, getBookSubjects } from "@/lib/actions/books";

export const dynamic = "force-dynamic";

export default async function NowaKsiazkaPage() {
  const [subjects, locations] = await Promise.all([
    getBookSubjects(),
    getBookLocations(),
  ]);

  return (
    <div className="mx-auto h-full max-w-6xl">
      <BookForm subjects={subjects} locations={locations} />
    </div>
  );
}
