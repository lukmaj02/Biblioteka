import Link from "next/link";
import { BooksInventoryReport } from "@/components/BooksInventoryReport";
import { getDashboardStats, listLoans } from "@/lib/actions/loans";
import { listBooks } from "@/lib/actions/books";
import { formatPLDate, isOverdue } from "@/lib/dates";
import { bookSygnatura } from "@/lib/book-id";

export const dynamic = "force-dynamic";

export default async function RaportyPage() {
  const [stats, loans, books] = await Promise.all([
    getDashboardStats(),
    listLoans({ activeOnly: true }),
    listBooks(),
  ]);

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const overdue = loans.filter((l) => isOverdue(l.dueAt));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Raporty</h1>
        <p className="mt-1 text-sm text-muted">
          Podsumowanie księgozbioru, zaległości i druk spisu książek.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Książki" value={stats.bookCount} />
        <Stat label="Aktywne wypożyczenia" value={stats.activeLoans} />
        <Stat
          label="Zaległe"
          value={stats.overdueCount}
          warn={stats.overdueCount > 0}
        />
      </section>

      <BooksInventoryReport
        books={books}
        activeLoans={loans.map((l) => ({
          bookId: l.bookId,
          dueAt: l.dueAt,
        }))}
      />

      <section className="rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Zaległe zwroty
        </h2>
        {overdue.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Brak zaległości.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--line)] text-sm">
            {overdue.map((l) => {
              const book = bookMap.get(l.bookId);
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap justify-between gap-2 py-2"
                >
                  <span>
                    <span className="font-medium tabular-nums">
                      {book ? bookSygnatura(book) : l.bookId}
                    </span>{" "}
                    {l.bookTitle}
                    <span className="text-muted">
                      {" · "}
                      {l.personLastName} {l.personFirstName}
                    </span>
                  </span>
                  <span className="text-danger">do {formatPLDate(l.dueAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        <Link href="/ustawienia/etykiety" className="btn btn-primary">
          Etykiety / druk
        </Link>
        <Link href="/wypozyczenia" className="btn btn-ghost">
          Lista wypożyczeń
        </Link>
        <Link href="/ksiegozbior" className="btn btn-ghost">
          Księgozbiór
        </Link>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold ${warn ? "text-danger" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}
