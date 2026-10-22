"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Book } from "@/lib/db/schema";
import { bookSygnatura } from "@/lib/book-id";
import { isOverdue } from "@/lib/dates";
import { conditionLabels, statusLabels } from "@/lib/labels";
import { returnLoan } from "@/lib/actions/loans";

export type ActiveLoanInfo = {
  bookId: number;
  loanId: number;
  dueAt: string;
};

type Props = {
  books: Book[];
  activeLoans: ActiveLoanInfo[];
  initialSygnatura?: string;
  initialKeyword?: string;
  initialAuthor?: string;
  initialTitle?: string;
  /** Ścieżka listy (domyślnie /ksiegozbior) — używana przy filtrach */
  listPath?: string;
};

export function BookWorkbench({
  books,
  activeLoans,
  initialSygnatura = "",
  initialKeyword = "",
  initialAuthor = "",
  initialTitle = "",
  listPath = "/ksiegozbior",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(
    books[0]?.id ?? null
  );
  const [sygnatura, setSygnatura] = useState(initialSygnatura);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [author, setAuthor] = useState(initialAuthor);
  const [title, setTitle] = useState(initialTitle);
  const [message, setMessage] = useState<string | null>(null);

  const loanByBook = useMemo(() => {
    const map = new Map<number, { loanId: number; dueAt: string }>();
    for (const l of activeLoans) {
      map.set(l.bookId, { loanId: l.loanId, dueAt: l.dueAt });
    }
    return map;
  }, [activeLoans]);

  const selected = books.find((b) => b.id === selectedId) ?? null;
  const selectedLoan = selected ? loanByBook.get(selected.id) : undefined;
  const selectedLoanId = selectedLoan?.loanId;

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (sygnatura.trim()) params.set("sygnatura", sygnatura.trim());
    if (keyword.trim()) params.set("q", keyword.trim());
    if (author.trim()) params.set("author", author.trim());
    if (title.trim()) params.set("title", title.trim());
    const qs = params.toString();
    router.push(qs ? `${listPath}?${qs}` : listPath);
  }

  function clearSearch() {
    setSygnatura("");
    setKeyword("");
    setAuthor("");
    setTitle("");
    router.push(listPath);
  }

  function openBook(book: Book) {
    router.push(`/ksiegozbior/${book.id}`);
  }

  function onLoan() {
    if (!selected) {
      setMessage("Zaznacz książkę na liście.");
      return;
    }
    if (selected.status === "wypozyczona") {
      router.push(`/wypozyczenia?bookId=${selected.id}`);
      return;
    }
    router.push(`/wypozyczenia?bookId=${selected.id}`);
  }

  function onReturn() {
    if (!selected || !selectedLoanId) {
      setMessage("Zaznacz wypożyczoną książkę.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await returnLoan(selectedLoanId);
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
            Filtr wyszukiwania książek
          </h2>
        </header>

        <form
          onSubmit={applySearch}
          className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        >
          <div className="field">
            <label htmlFor="sygnatura">Sygnatura</label>
            <input
              id="sygnatura"
              value={sygnatura}
              onChange={(e) => setSygnatura(e.target.value)}
              placeholder="np. 00001"
            />
          </div>
          <div className="field">
            <label htmlFor="keyword">Słowo kluczowe</label>
            <input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ISBN, lokalizacja…"
            />
          </div>
          <div className="field">
            <label htmlFor="author">Autor</label>
            <input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="title">Tytuł</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className="btn btn-primary flex-1">
              Szukaj
            </button>
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={clearSearch}
            >
              Wyczyść
            </button>
          </div>
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
                  Wydanie
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Stan
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Lokalizacja
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2.5">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-muted"
                  >
                    Brak książek. Dodaj pierwszą pozycję.
                  </td>
                </tr>
              ) : (
                books.map((book) => {
                  const active = book.id === selectedId;
                  const loan = loanByBook.get(book.id);
                  const overdue = loan ? isOverdue(loan.dueAt) : false;
                  const borrowed = Boolean(loan) || book.status === "wypozyczona";
                  const rowTone = active
                    ? "bg-ink text-paper"
                    : overdue
                      ? "bg-[rgba(139,58,42,0.18)] hover:bg-[rgba(139,58,42,0.26)]"
                      : borrowed
                        ? "bg-[rgba(212,175,55,0.28)] hover:bg-[rgba(212,175,55,0.38)]"
                        : "hover:bg-[rgba(47,59,42,0.06)]";
                  return (
                    <tr
                      key={book.id}
                      onClick={() => setSelectedId(book.id)}
                      onDoubleClick={() => openBook(book)}
                      className={`cursor-pointer border-b border-[var(--line)] transition-colors ${rowTone}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                        {bookSygnatura(book)}
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-2">
                        {book.authors || "—"}
                      </td>
                      <td className="max-w-[18rem] truncate px-3 py-2">
                        {book.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {book.edition || book.publishedAt || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {conditionLabels[book.condition]}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2">
                        {book.location || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={
                            active
                              ? "opacity-90"
                              : overdue
                                ? "font-semibold text-danger"
                                : borrowed
                                  ? "font-semibold text-brass-deep"
                                  : book.status === "dostepna"
                                    ? "text-ok"
                                    : "text-brass-deep"
                          }
                        >
                          {overdue
                            ? "Przetrzymana"
                            : statusLabels[book.status]}
                        </span>
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
            onClick={() => selected && openBook(selected)}
          >
            Otwórz
          </button>
          <button type="button" className="btn btn-ghost" onClick={onLoan}>
            Wypożycz
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onReturn}
            disabled={pending || !selectedLoanId}
          >
            {pending ? "…" : "Zwróć"}
          </button>
          <Link href="/ksiegozbior/nowa" className="btn btn-brass">
            Dodaj nową
          </Link>
          <p className="ml-auto text-xs text-muted">
            {message
              ? message
              : selected
                ? `Zaznaczono: ${bookSygnatura(selected)} — ${selected.title}`
                : "Wprowadź kryteria wyszukiwania, a następnie kliknij Szukaj"}
          </p>
        </footer>
      </section>
    </div>
  );
}
