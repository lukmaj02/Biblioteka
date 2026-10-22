import Link from "next/link";
import { listPeople } from "@/lib/actions/people";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function OsobyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const people = query ? await listPeople(query) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Czytelnicy</h1>
        <p className="mt-1 text-sm text-muted">
          Wyszukaj czytelnika po numerze, imieniu, nazwisku lub kontakcie.{" "}
          <Link
            href="/ustawienia/czytelnicy"
            className="text-brass-deep underline"
          >
            Dodawanie w ustawieniach
          </Link>
          .
        </p>
      </header>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Wyszukaj czytelnika…"
          className="flex-1 rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.9)] px-3 py-2"
        />
        <button type="submit" className="btn btn-primary">
          Wyszukaj
        </button>
      </form>

      {!query ? (
        <p className="rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.65)] px-4 py-8 text-center text-muted">
          Wpisz frazę i kliknij Wyszukaj.
        </p>
      ) : people.length === 0 ? (
        <p className="rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.65)] px-4 py-8 text-center text-muted">
          Brak wyników dla „{query}”.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.65)]">
          {people.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="font-medium">
                <span className="mr-2 text-muted tabular-nums">
                  {p.readerNo || String(p.id).padStart(4, "0")}
                </span>
                {p.lastName} {p.firstName}
              </p>
              <p className="text-sm text-muted">
                {[p.phone, p.email, p.address].filter(Boolean).join(" · ") ||
                  "Brak kontaktu"}
              </p>
              {p.birthDate && (
                <p className="text-xs text-muted">Ur. {p.birthDate}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
