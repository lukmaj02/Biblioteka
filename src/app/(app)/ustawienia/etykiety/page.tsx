import { LabelsSettings } from "@/components/LabelsSettings";
import { listBooks } from "@/lib/actions/books";

export const dynamic = "force-dynamic";

export default async function UstawieniaEtykietyPage() {
  const books = await listBooks();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-ink">Etykiety</h1>
        <p className="mt-1 text-sm text-muted">
          Etykiety 5×2 cm z kodem kreskowym sygnatury (nr inwentarzowy). Po
          zaznaczeniu od razu drukuj — gęsty układ na A4.
        </p>
      </header>
      <LabelsSettings books={books} />
    </div>
  );
}
