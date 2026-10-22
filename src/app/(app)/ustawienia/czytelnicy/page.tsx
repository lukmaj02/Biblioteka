import { PersonForm } from "@/components/PersonForm";
import { DeletePersonButton } from "@/components/DeletePersonButton";
import { listPeople } from "@/lib/actions/people";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function UstawieniaCzytelnicyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const people = await listPeople(q);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm text-muted">Ustawienia</p>
        <h1 className="text-xl font-semibold text-ink">Czytelnicy</h1>
        <p className="mt-1 text-sm text-muted">
          Dodawanie i zarządzanie czytelnikami biblioteki.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <PersonForm />

        <div className="space-y-3">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Filtruj listę…"
              className="flex-1 rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.9)] px-3 py-2"
            />
            <button type="submit" className="btn btn-ghost">
              Filtruj
            </button>
          </form>

          {people.length === 0 ? (
            <p className="py-8 text-center text-muted">Brak czytelników.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.65)]">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      <span className="mr-2 text-muted tabular-nums">
                        {p.readerNo || String(p.id).padStart(4, "0")}
                      </span>
                      {p.lastName} {p.firstName}
                    </p>
                    <p className="text-sm text-muted">
                      {[p.phone, p.email, p.address]
                        .filter(Boolean)
                        .join(" · ") || "Brak kontaktu"}
                    </p>
                  </div>
                  <DeletePersonButton id={p.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
