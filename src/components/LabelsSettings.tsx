"use client";

import { useMemo, useState } from "react";
import type { Book } from "@/lib/db/schema";
import { bookSygnatura } from "@/lib/book-id";
import { Barcode } from "./Barcode";
import {
  LABEL_H_MM,
  LABEL_W_MM,
  labelsPerA4Page,
} from "@/lib/labels-layout";

type Props = {
  books: Book[];
};

export function LabelsSettings({ books }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const perPage = labelsPerA4Page();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(needle) ||
        b.authors.toLowerCase().includes(needle) ||
        bookSygnatura(b).toLowerCase().includes(needle)
    );
  }, [books, q]);

  const ids = useMemo(() => Array.from(selected).join(","), [selected]);
  const pagesNeeded =
    selected.size === 0 ? 0 : Math.ceil(selected.size / perPage);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((b) => b.id)));
  }

  function generateSelected() {
    if (selected.size === 0) return;
    window.open(`/etykiety?ids=${ids}`, "_blank", "noopener,noreferrer");
  }

  const preview = books.find((b) => selected.has(b.id)) ?? books[0];

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-5 shadow-[var(--shadow)]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Rozmiar etykiety
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Etykieta <strong>{LABEL_W_MM / 10}&nbsp;cm × {LABEL_H_MM / 10}&nbsp;cm</strong>
          {" · "}kod = sygnatura (nr inwentarzowy)
          {" · "}do <strong>{perPage}</strong> szt. na stronę A4 (margines 5&nbsp;mm).
        </p>
        {preview && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted">Podgląd</p>
            <article
              className="flex items-center justify-center border border-dashed border-ink/40"
              style={{ width: `${LABEL_W_MM}mm`, height: `${LABEL_H_MM}mm` }}
            >
              <Barcode value={bookSygnatura(preview)} compact />
            </article>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] shadow-[var(--shadow)]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-ink px-4 py-2.5 text-paper">
          <h2 className="text-sm font-semibold">Wybierz książki</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost border-paper/30 py-1 text-xs text-paper"
              onClick={toggleAll}
            >
              {selected.size === filtered.length && filtered.length > 0
                ? "Odznacz"
                : "Zaznacz widoczne"}
            </button>
            <button
              type="button"
              className="btn btn-brass py-1 text-xs"
              disabled={selected.size === 0}
              onClick={generateSelected}
            >
              Generuj
              {selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </header>
        {selected.size > 0 && (
          <p className="border-b border-[var(--line)] bg-paper-deep/40 px-4 py-2 text-xs text-muted">
            Zaznaczono {selected.size} · ok. {pagesNeeded}{" "}
            {pagesNeeded === 1 ? "strona" : "strony"} A4
          </p>
        )}
        <div className="border-b border-[var(--line)] p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtruj po tytule, autorze, sygnaturze…"
            className="w-full rounded border border-[var(--line)] bg-paper px-3 py-2 text-sm"
          />
        </div>
        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-auto">
          {filtered.map((book) => (
            <li key={book.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(47,59,42,0.05)]">
                <input
                  type="checkbox"
                  checked={selected.has(book.id)}
                  onChange={() => toggle(book.id)}
                />
                <span className="w-16 shrink-0 font-medium tabular-nums">
                  {bookSygnatura(book)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {book.title}
                  <span className="text-muted">
                    {book.authors ? ` — ${book.authors}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-muted">Brak pozycji.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
