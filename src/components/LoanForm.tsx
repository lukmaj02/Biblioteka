"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Book, Person } from "@/lib/db/schema";
import { createLoan } from "@/lib/actions/loans";
import { addDaysISO, todayISODate } from "@/lib/dates";

type Props = {
  books: Book[];
  people: Person[];
  defaultLoanDays: number;
  preselectedBookId?: number;
};

export function LoanForm({
  books,
  people,
  defaultLoanDays,
  preselectedBookId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [borrowedAt, setBorrowedAt] = useState(todayISODate());
  const [dueAt, setDueAt] = useState(
    addDaysISO(todayISODate(), defaultLoanDays)
  );

  const available = books.filter((b) => b.status === "dostepna");

  function onBorrowedChange(value: string) {
    setBorrowedAt(value);
    setDueAt(addDaysISO(value, defaultLoanDays));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createLoan(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setBorrowedAt(todayISODate());
      setDueAt(addDaysISO(todayISODate(), defaultLoanDays));
    });
  }

  if (available.length === 0 || people.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--line)] bg-[rgba(255,252,246,0.55)] p-5 text-muted">
        {available.length === 0
          ? "Brak dostępnych książek do wypożyczenia."
          : "Dodaj najpierw osobę wypożyczającą."}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-5 shadow-[var(--shadow)]"
    >
      <h2 className="font-display text-xl">Nowe wypożyczenie</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field">
          <label htmlFor="bookId">Książka</label>
          <select
            id="bookId"
            name="bookId"
            required
            defaultValue={preselectedBookId ?? ""}
          >
            <option value="" disabled>
              Wybierz…
            </option>
            {available.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="personId">Osoba</label>
          <select id="personId" name="personId" required defaultValue="">
            <option value="" disabled>
              Wybierz…
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="borrowedAt">Data wypożyczenia</label>
          <input
            id="borrowedAt"
            name="borrowedAt"
            type="date"
            required
            value={borrowedAt}
            onChange={(e) => onBorrowedChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="dueAt">Termin zwrotu</label>
          <input
            id="dueAt"
            name="dueAt"
            type="date"
            required
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Zapisuję…" : "Wypożycz"}
      </button>
    </form>
  );
}
