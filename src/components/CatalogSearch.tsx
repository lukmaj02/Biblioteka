"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Book } from "@/lib/db/schema";
import { statusLabels } from "@/lib/labels";

type Props = {
  books: Book[];
  initialQ?: string;
  initialAvailableOnly?: boolean;
  overdueCount: number;
  bookCount: number;
  activeLoans: number;
};

export function CatalogSearch({
  books,
  initialQ = "",
  initialAvailableOnly = false,
  overdueCount,
  bookCount,
  activeLoans,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [availableOnly, setAvailableOnly] = useState(initialAvailableOnly);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (availableOnly) params.set("available", "1");
    router.push(`/wyszukiwarka?${params.toString()}`);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_18rem]">
      <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.88)] shadow-[var(--shadow)]">
        <header className="bg-ink px-4 py-3 text-paper">
          <h1 className="text-base font-semibold">
            Co chciałbyś dziś przeczytać?
          </h1>
        </header>

        <form onSubmit={onSearch} className="space-y-3 border-b border-[var(--line)] p-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tytuł, autor, ISBN…"
              className="min-w-[12rem] flex-1 rounded border border-[var(--line)] bg-paper px-3 py-2"
            />
            <button type="submit" className="btn btn-primary px-6">
              Szukaj
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            Pokaż tylko dostępne do wypożyczenia
          </label>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-paper-deep/60 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Tytuł</th>
                <th className="px-4 py-2">Autor / wydanie</th>
                <th className="px-4 py-2">Dziedzina</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    Brak wyników. Zmień kryteria wyszukiwania.
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr
                    key={book.id}
                    className="border-t border-[var(--line)] hover:bg-[rgba(47,59,42,0.04)]"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/ksiegozbior/${book.id}`}
                        className="font-medium hover:underline"
                      >
                        {book.title}
                      </Link>
                      {book.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {book.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-ink-soft">
                      <div>{book.authors || "—"}</div>
                      <div className="text-xs text-muted">
                        {[book.publisher, book.publishedAt, book.edition]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-ink-soft">
                      {[book.location, book.subject, book.publicationType]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold text-paper ${
                          book.status === "dostepna" ? "bg-ink" : "bg-brass-deep"
                        }`}
                      >
                        {statusLabels[book.status]}
                      </span>
                      <div className="mt-2">
                        <Link
                          href={`/ksiegozbior/${book.id}`}
                          className="text-xs text-brass-deep hover:underline"
                        >
                          Otwórz →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <Widget title="Aktualności">
          <p className="text-sm leading-relaxed text-ink-soft">
            Domowa Biblioteka — lokalny księgozbiór, wypożyczenia i etykiety.
            Dane trzymane są na tym komputerze ({bookCount} pozycji w katalogu).
          </p>
        </Widget>
        <Widget title="Czy wiesz że?">
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-soft">
            <li>Z listy książek otworzysz kartę i wypożyczysz pozycję.</li>
            <li>ISBN wypełnia większość pól formularza książki.</li>
            <li>Z listy książek wygenerujesz etykiety A4 z kodem kreskowym.</li>
            <li>
              Aktywne wypożyczenia: {activeLoans}
              {overdueCount > 0 ? `, zaległe: ${overdueCount}` : ""}.
            </li>
          </ul>
        </Widget>
        <Widget title="Skróty">
          <div className="flex flex-col gap-1 text-sm">
            <Link href="/ksiegozbior" className="hover:underline">
              Lista książek
            </Link>
            <Link href="/ksiegozbior/nowa" className="hover:underline">
              Dodaj publikację
            </Link>
            <Link href="/wypozyczenia" className="hover:underline">
              Wypożyczenia
            </Link>
          </div>
        </Widget>
      </aside>
    </div>
  );
}

function Widget({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.88)]">
      <header className="bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-wide text-paper">
        {title}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}
