"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Book, Person } from "@/lib/db/schema";
import { conditionLabels, statusLabels } from "@/lib/labels";
import { createLoan, returnLoan } from "@/lib/actions/loans";
import { addDaysISO, formatPLDate, isOverdue, todayISODate } from "@/lib/dates";

type ActiveLoanRow = {
  id: number;
  bookId: number;
  personId: number;
  borrowedAt: string;
  dueAt: string;
  bookTitle: string;
  personFirstName: string;
  personLastName: string;
};

type Props = {
  books: Book[];
  people: Person[];
  activeLoans: ActiveLoanRow[];
  defaultLoanDays: number;
  preselectedBookId?: number;
};

function formatReaderNo(p: Person): string {
  return p.readerNo || String(p.id).padStart(4, "0");
}

function formatInv(book: Book): string {
  return book.inventoryNo || String(book.id);
}

export function LoanWorkbench({
  books,
  people,
  activeLoans,
  defaultLoanDays,
  preselectedBookId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialBook = preselectedBookId
    ? books.find((b) => b.id === preselectedBookId) ?? null
    : null;
  const initialLoan = preselectedBookId
    ? activeLoans.find((l) => l.bookId === preselectedBookId) ?? null
    : null;
  const initialPerson = initialLoan
    ? people.find((p) => p.id === initialLoan.personId) ?? null
    : null;

  const [bookQuery, setBookQuery] = useState(
    initialBook ? formatInv(initialBook) : ""
  );
  const [personQuery, setPersonQuery] = useState(
    initialPerson ? formatReaderNo(initialPerson) : ""
  );
  const [bookId, setBookId] = useState<number | null>(preselectedBookId ?? null);
  const [personId, setPersonId] = useState<number | null>(
    initialPerson?.id ?? null
  );

  const [borrowedAt, setBorrowedAt] = useState(todayISODate());
  const [loanDays, setLoanDays] = useState(defaultLoanDays);
  const [dueAt, setDueAt] = useState(
    addDaysISO(todayISODate(), defaultLoanDays)
  );

  const book = books.find((b) => b.id === bookId) ?? null;
  const person = people.find((p) => p.id === personId) ?? null;

  const personLoanCount = useMemo(
    () => activeLoans.filter((l) => l.personId === personId).length,
    [activeLoans, personId]
  );
  const personHasOverdue = useMemo(
    () =>
      activeLoans.some(
        (l) => l.personId === personId && isOverdue(l.dueAt)
      ),
    [activeLoans, personId]
  );

  function resolveBook() {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return;
    const found =
      books.find(
        (b) =>
          String(b.id) === q ||
          b.inventoryNo === q ||
          b.signature?.toLowerCase() === q ||
          formatInv(b) === q
      ) ||
      books.find(
        (b) =>
          b.signature?.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q) ||
          b.authors.toLowerCase().includes(q)
      );
    if (found) {
      setBookId(found.id);
      setBookQuery(formatInv(found));
      setError(null);
    } else {
      setError("Nie znaleziono książki o podanym numerze / sygnaturze");
    }
  }

  function resolvePerson() {
    const q = personQuery.trim().toLowerCase();
    if (!q) return;
    const found =
      people.find(
        (p) =>
          String(p.id) === q ||
          formatReaderNo(p).toLowerCase() === q ||
          p.readerNo?.toLowerCase() === q
      ) ||
      people.find(
        (p) =>
          `${p.lastName} ${p.firstName}`.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q)
      );
    if (found) {
      setPersonId(found.id);
      setPersonQuery(formatReaderNo(found));
      setError(null);
    } else {
      setError("Nie znaleziono czytelnika o podanym numerze");
    }
  }

  function onDaysChange(days: number) {
    const d = Math.max(1, days || 1);
    setLoanDays(d);
    setDueAt(addDaysISO(borrowedAt, d));
  }

  function onBorrowedChange(value: string) {
    setBorrowedAt(value);
    setDueAt(addDaysISO(value, loanDays));
  }

  function onLoan() {
    if (!bookId || !personId) {
      setError("Wybierz książkę i czytelnika");
      return;
    }
    if (book?.status === "wypozyczona") {
      setError("Książka jest już wypożyczona");
      return;
    }
    const formData = new FormData();
    formData.set("bookId", String(bookId));
    formData.set("personId", String(personId));
    formData.set("borrowedAt", borrowedAt);
    formData.set("dueAt", dueAt);
    setError(null);
    startTransition(async () => {
      const result = await createLoan(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/wypozyczenia");
      router.refresh();
    });
  }

  function onReturnSelectedBook() {
    if (!bookId) return;
    const loan = activeLoans.find((l) => l.bookId === bookId);
    if (!loan) {
      setError("Ta książka nie jest wypożyczona");
      return;
    }
    startTransition(async () => {
      await returnLoan(loan.id);
      router.push("/wypozyczenia");
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push("/wypozyczenia")}
        >
          ← Lista wypożyczeń
        </button>
        {book && (
          <p className="text-sm text-muted">
            {formatInv(book)} — {book.title}
          </p>
        )}
      </div>
      <div className="grid flex-1 gap-3 lg:grid-cols-3">
        {/* Książka */}
        <section className="flex flex-col overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.88)] shadow-[var(--shadow)]">
          <header className="bg-ink px-3 py-2 text-sm font-semibold text-paper">
            Książka
          </header>
          <div className="space-y-3 p-3">
            <div className="flex gap-2">
              <div className="field flex-1">
                <label htmlFor="bookQuery">Nr inw. / sygnatura</label>
                <input
                  id="bookQuery"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), resolveBook())}
                />
              </div>
              <button type="button" className="btn btn-primary self-end" onClick={resolveBook}>
                OK
              </button>
              <button
                type="button"
                className="btn btn-ghost self-end"
                onClick={() => {
                  setBookId(null);
                  setBookQuery("");
                }}
              >
                ✕
              </button>
            </div>

            <Meta label="Nr inwentarzowy" value={book ? formatInv(book) : "—"} />
            <Meta label="Sygnatura" value={book?.signature || "—"} />
            <Meta label="Autor" value={book?.authors || "—"} />
            <Meta label="Tytuł" value={book?.title || "—"} multiline />
            <Meta label="Rok" value={book?.publishedAt || "—"} />
            <Meta label="Tom" value={book?.volume || "—"} />
            <Meta
              label="Stan"
              value={book ? conditionLabels[book.condition] : "—"}
            />
            <Meta label="Tematyka" value={book?.subject || "—"} />
            <Meta label="Lokalizacja" value={book?.location || "—"} />
            <div className="rounded border border-[var(--line)] px-3 py-2 text-center">
              <p className="text-[0.65rem] uppercase tracking-wide text-muted">
                Status
              </p>
              <p
                className={`text-lg font-bold uppercase ${
                  book?.status === "dostepna"
                    ? "text-ok"
                    : book
                      ? "text-brass-deep"
                      : "text-muted"
                }`}
              >
                {book ? statusLabels[book.status] : "—"}
              </p>
            </div>
            <Meta label="Opis" value={book?.description || "—"} multiline />
          </div>
          <p className="mt-auto border-t border-[var(--line)] bg-paper-deep/40 px-3 py-2 text-xs text-muted">
            Wybierz książkę, wpisując sygnaturę lub nr inwentarzowy
          </p>
        </section>

        {/* Czytelnik */}
        <section className="flex flex-col overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.88)] shadow-[var(--shadow)]">
          <header className="bg-ink px-3 py-2 text-sm font-semibold text-paper">
            Czytelnik
          </header>
          <div className="space-y-3 p-3">
            <div className="flex gap-2">
              <div className="field flex-1">
                <label htmlFor="personQuery">Numer czytelnika</label>
                <input
                  id="personQuery"
                  value={personQuery}
                  onChange={(e) => setPersonQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), resolvePerson())
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-primary self-end"
                onClick={resolvePerson}
              >
                Wyszukaj
              </button>
              <button
                type="button"
                className="btn btn-ghost self-end"
                onClick={() => {
                  setPersonId(null);
                  setPersonQuery("");
                }}
              >
                ✕
              </button>
            </div>

            <Meta label="Numer" value={person ? formatReaderNo(person) : "—"} />
            <Meta label="Nazwisko" value={person?.lastName || "—"} />
            <Meta label="Imię" value={person?.firstName || "—"} />
            <Meta label="Data urodzenia" value={person?.birthDate || "—"} />
            <Meta label="Telefon" value={person?.phone || "—"} />
            <Meta label="E-mail" value={person?.email || "—"} />
            <Meta label="Adres" value={person?.address || "—"} multiline />
            <Meta
              label="Bieżące wypożyczenia"
              value={person ? String(personLoanCount) : "—"}
            />
            <Meta
              label="Ma zaległości"
              value={person ? (personHasOverdue ? "TAK" : "NIE") : "—"}
              warn={personHasOverdue}
            />
          </div>
          <p className="mt-auto border-t border-[var(--line)] bg-paper-deep/40 px-3 py-2 text-xs text-muted">
            Wybierz czytelnika, wpisując jego numer
          </p>
        </section>

        {/* Wypożyczenie */}
        <section className="flex flex-col overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.88)] shadow-[var(--shadow)]">
          <header className="bg-ink px-3 py-2 text-sm font-semibold text-paper">
            Wypożyczenie
          </header>
          <div className="flex flex-1 flex-col gap-4 p-3">
            <div className="field">
              <label htmlFor="borrowedAt">Data wypożyczenia</label>
              <input
                id="borrowedAt"
                type="date"
                value={borrowedAt}
                onChange={(e) => onBorrowedChange(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loanDays">Okres wypożyczenia (dni)</label>
              <input
                id="loanDays"
                type="number"
                min={1}
                value={loanDays}
                onChange={(e) => onDaysChange(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="dueAt">Planowany zwrot</label>
              <input
                id="dueAt"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                className="btn btn-primary w-full py-3 text-base"
                onClick={onLoan}
                disabled={pending || !bookId || !personId}
              >
                {pending ? "Zapisuję…" : "Wypożycz"}
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={onReturnSelectedBook}
                disabled={pending || !bookId || book?.status !== "wypozyczona"}
              >
                Zwróć zaznaczoną
              </button>
            </div>
          </div>
          <p className="border-t border-[var(--line)] bg-paper-deep/40 px-3 py-2 text-xs text-muted">
            Określ okres wypożyczenia
          </p>
        </section>
      </div>

      {/* Aktywne wypożyczenia */}
      <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.75)]">
        <header className="border-b border-[var(--line)] bg-paper-deep/60 px-3 py-2 text-sm font-semibold">
          Aktywne wypożyczenia ({activeLoans.length})
        </header>
        {activeLoans.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted">Brak aktywnych wypożyczeń.</p>
        ) : (
          <ul className="max-h-48 divide-y divide-[var(--line)] overflow-auto text-sm">
            {activeLoans.map((loan) => {
              const overdue = isOverdue(loan.dueAt);
              return (
                <li
                  key={loan.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => {
                      setBookId(loan.bookId);
                      setPersonId(loan.personId);
                      const b = books.find((x) => x.id === loan.bookId);
                      const p = people.find((x) => x.id === loan.personId);
                      if (b) setBookQuery(formatInv(b));
                      if (p) setPersonQuery(formatReaderNo(p));
                    }}
                  >
                    <span className="font-medium">{loan.bookTitle}</span>
                    <span className="text-muted">
                      {" · "}
                      {loan.personFirstName} {loan.personLastName}
                    </span>
                  </button>
                  <span className={`badge ${overdue ? "badge-danger" : "badge-warn"}`}>
                    do {formatPLDate(loan.dueAt)}
                    {overdue ? " · zaległe" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({
  label,
  value,
  multiline,
  warn,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`${multiline ? "whitespace-pre-wrap" : "truncate"} ${
          warn ? "font-semibold text-danger" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
