import { SubjectsSettings } from "@/components/SubjectsSettings";
import { listSubjectOptionsDetailed } from "@/lib/actions/subjects";

export const dynamic = "force-dynamic";

export default async function UstawieniaTematykaPage() {
  const subjects = await listSubjectOptionsDetailed();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm text-muted">Ustawienia</p>
        <h1 className="text-xl font-semibold text-ink">Tematyka</h1>
        <p className="mt-1 text-sm text-muted">
          Pozycje słownika (A. nazwa, B. nazwa…) pojawiają się na liście
          rozwijanej w karcie książki.
        </p>
      </header>

      <SubjectsSettings subjects={subjects} />
    </div>
  );
}
