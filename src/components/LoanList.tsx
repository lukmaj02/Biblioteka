"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Book } from "@/lib/db/schema";
import { bookSygnatura } from "@/lib/book-id";
import { conditionLabels } from "@/lib/labels";
import { returnLoan } from "@/lib/actions/loans";
import { formatPLDate, isOverdue } from "@/lib/dates";

export type LoanListRow = {
  id: number;
  bookId: number;
  personId: number;
  borrowedAt: string;
  dueAt: string;
  bookTitle: string;
  bookAuthors: string;
  personFirstName: string;
  personLastName: string;
};

type Props = {
  loans: LoanListRow[];
  books: Book[];
};

export function LoanList({ loans, books }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(
    loans[0]?.id ?? null
  );
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const bookById = useMemo(() => {
    const map = new Map<number, Book>();
    for (const b of books) map.set(b.id, b);
    return map;
  }, [books]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return loans;
    return loans.filter((l) => {
      const book = bookById.get(l.bookId);
      const sig = (book ? bookSygnatura(book) : String(l.bookId)).toLowerCase();
      return (
        l.bookTitle.toLowerCase().includes(needle) ||
        l.bookAuthors.toLowerCase().includes(needle) ||
        `${l.personFirstName} ${l.personLastName}`.toLowerCase().includes(needle) ||
        sig.includes(needle)
      );
    });
  }, [loans, q, bookById]);

  const selected = loans.find((l) => l.id === selectedLoanId) ?? null;

  function openLoan(loan: LoanListRow) {
    router.push(`/wypozyczenia?bookId=${loan.bookId}`);
  }

  function onReturn() {
    if (!selected) {
      setMessage("Zaznacz wypożyczenie na liście.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await returnLoan(selected.id);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-3rem)] flex-col gap-3">
      <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.75)] shadow-[var(--shadow)]">
        <header className="flex items-center gap-2 border-b border-[var(--line)] bg-ink px-4 py-2.5 text-paper">
          <span aria-hidden className="opacity-80">
            ⌕
          </span>
          <h2 className="text-sm font-semibold tracking-wide">
            Filtr wypożyczeń
          </h2>
        </header>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-wrap items-end gap-3 p-4"
        >
          <div className="field min-w-[14rem] flex-1">
            <label htmlFor="lq">Szukaj</label>
            <input
              id="lq"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tytuł, autor, czytelnik, sygnatura…"
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setQ("")}
          >
            Wyczyść
          </button>
        </form>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.85)] shadow-[var(--shadow)]">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-paper-deep text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Sygnatura
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Autor
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Tytuł
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Czytelnik
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Od
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Termin
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Stan
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-muted"
                  >
                    Brak aktywnych wypożyczeń.
                  </td>
                </tr>
              ) : (
                filtered.map((loan) => {
                  const book = bookById.get(loan.bookId);
                  const active = loan.id === selectedLoanId;
                  const overdue = isOverdue(loan.dueAt);
                  return (
                    <tr
                      key={loan.id}
                      onClick={() => {
                        setSelectedLoanId(loan.id);
                        openLoan(loan);
                      }}
                      className={`cursor-pointer border-b border-[var(--line)] transition-colors ${
                        active
                          ? "bg-ink text-paper"
                          : "hover:bg-[rgba(47,59,42,0.06)]"
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                        {book ? bookSygnatura(book) : String(loan.bookId).padStart(5, "0")}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2">
                        {loan.bookAuthors || "—"}
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2">
                        {loan.bookTitle}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2">
                        {loan.personLastName} {loan.personFirstName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatPLDate(loan.borrowedAt)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 ${
                          overdue && !active ? "font-semibold text-danger" : ""
                        }`}
                      >
                        {formatPLDate(loan.dueAt)}
                        {overdue ? " · zaległe" : ""}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {book ? conditionLabels[book.condition] : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] bg-paper-deep/60 px-3 py-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selected}
            onClick={() => selected && openLoan(selected)}
          >
            Otwórz
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending || !selected}
            onClick={onReturn}
          >
            {pending ? "…" : "Zwróć"}
          </button>
          <Link href="/ksiegozbior" className="btn btn-ghost">
            Lista książek
          </Link>
          <p className="ml-auto text-xs text-muted">
            {message
              ? message
              : selected
                ? `Zaznaczono: ${selected.bookTitle}`
                : "Kliknij pozycję, aby otworzyć szczegóły wypożyczenia"}
          </p>
        </footer>
      </section>
    </div>
  );
}
