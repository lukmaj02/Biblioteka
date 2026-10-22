"use client";

import { useMemo, useState } from "react";
import type { Book } from "@/lib/db/schema";
import { bookSygnatura } from "@/lib/book-id";
import { formatPLDate, isOverdue } from "@/lib/dates";
import { conditionLabels, statusLabels } from "@/lib/labels";

export type ReportColumnId =
  | "nr"
  | "authors"
  | "title"
  | "location"
  | "isbn"
  | "publisher"
  | "publishedAt"
  | "edition"
  | "volume"
  | "value"
  | "condition"
  | "status"
  | "subject"
  | "udc"
  | "publicationType"
  | "acquiredAt"
  | "keywords"
  | "description";

type ColumnDef = {
  id: ReportColumnId;
  label: string;
  defaultOn?: boolean;
};

const COLUMNS: ColumnDef[] = [
  { id: "nr", label: "Nr / sygnatura", defaultOn: true },
  { id: "authors", label: "Autor", defaultOn: true },
  { id: "title", label: "Tytuł", defaultOn: true },
  { id: "location", label: "Lokalizacja", defaultOn: true },
  { id: "isbn", label: "ISBN / ISSN" },
  { id: "publisher", label: "Wydawca" },
  { id: "publishedAt", label: "Rok wydania" },
  { id: "edition", label: "Wydanie" },
  { id: "volume", label: "Tom" },
  { id: "value", label: "Wartość" },
  { id: "condition", label: "Stan" },
  { id: "status", label: "Status", defaultOn: true },
  { id: "subject", label: "Tematyka" },
  { id: "udc", label: "UKD" },
  { id: "publicationType", label: "Typ publikacji" },
  { id: "acquiredAt", label: "Data dodania" },
  { id: "keywords", label: "Słowa kluczowe" },
  { id: "description", label: "Opis" },
];

type LoanDue = { bookId: number; dueAt: string };

type Props = {
  books: Book[];
  activeLoans?: LoanDue[];
};

function cellValue(
  book: Book,
  col: ReportColumnId,
  overdueBookIds: Set<number>
): string {
  switch (col) {
    case "nr":
      return bookSygnatura(book);
    case "authors":
      return book.authors || "—";
    case "title":
      return book.title;
    case "location":
      return book.location || "—";
    case "isbn":
      return book.isbn || "—";
    case "publisher":
      return book.publisher || "—";
    case "publishedAt":
      return book.publishedAt || "—";
    case "edition":
      return book.edition || "—";
    case "volume":
      return book.volume || "—";
    case "value":
      return book.value || "—";
    case "condition":
      return conditionLabels[book.condition];
    case "status":
      return overdueBookIds.has(book.id)
        ? "Przetrzymana"
        : statusLabels[book.status];
    case "subject":
      return book.subject || "—";
    case "udc":
      return book.udc || "—";
    case "publicationType":
      return book.publicationType || "—";
    case "acquiredAt":
      return formatPLDate(book.acquiredAt);
    case "keywords":
      return book.keywords || "—";
    case "description":
      return book.description || "—";
    default:
      return "—";
  }
}

export function BooksInventoryReport({ books, activeLoans = [] }: Props) {
  const [selected, setSelected] = useState<Set<ReportColumnId>>(
    () => new Set(COLUMNS.filter((c) => c.defaultOn).map((c) => c.id))
  );

  const overdueBookIds = useMemo(() => {
    const set = new Set<number>();
    for (const l of activeLoans) {
      if (isOverdue(l.dueAt)) set.add(l.bookId);
    }
    return set;
  }, [activeLoans]);

  const activeCols = useMemo(
    () => COLUMNS.filter((c) => selected.has(c.id)),
    [selected]
  );

  function toggle(id: ReportColumnId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectDefaults() {
    setSelected(new Set(COLUMNS.filter((c) => c.defaultOn).map((c) => c.id)));
  }

  function selectAll() {
    setSelected(new Set(COLUMNS.map((c) => c.id)));
  }

  function handlePrint() {
    const root = document.querySelector(".inventory-report-print");
    if (!root) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      window.print();
      return;
    }

    const generatedAt = new Date().toLocaleString("pl-PL");

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Spis książek</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
      font-size: 10pt;
    }
    h1 {
      margin: 0 0 0.25rem;
      font-size: 16pt;
      font-weight: 600;
    }
    .meta {
      margin: 0 0 1rem;
      color: #444;
      font-size: 9pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #bbb;
      padding: 0.28rem 0.4rem;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
    }
    th {
      background: #eee;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <h1>Spis książek</h1>
  <p class="meta">${books.length} pozycji · wygenerowano ${generatedAt}</p>
  ${root.innerHTML}
</body>
</html>`);
    doc.close();

    const cleanup = () => setTimeout(() => iframe.remove(), 500);
    const run = () => {
      try {
        win.focus();
        win.print();
      } finally {
        cleanup();
      }
    };

    if (doc.readyState === "complete") setTimeout(run, 150);
    else iframe.onload = () => setTimeout(run, 150);
  }

  return (
    <section className="space-y-4 rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Spis książek
          </h2>
          <p className="mt-1 text-sm text-muted">
            Zaznacz kolumny, które mają znaleźć się w wydruku ({books.length}{" "}
            pozycji).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={selectDefaults}>
            Domyślne
          </button>
          <button type="button" className="btn btn-ghost" onClick={selectAll}>
            Wszystkie
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={books.length === 0 || activeCols.length === 0}
          >
            Drukuj spis
          </button>
        </div>
      </div>

      <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="sr-only">Kolumny raportu</legend>
        {COLUMNS.map((col) => (
          <label
            key={col.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(col.id)}
              onChange={() => toggle(col.id)}
            />
            {col.label}
          </label>
        ))}
      </fieldset>

      {books.length === 0 ? (
        <p className="text-sm text-muted">Brak książek w księgozbiorze.</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded border border-[var(--line)] bg-paper">
          <div className="inventory-report-print">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-paper-deep text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  {activeCols.map((col) => (
                    <th
                      key={col.id}
                      className="border-b border-[var(--line)] px-2.5 py-2 font-semibold"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-[var(--line)] align-top"
                  >
                    {activeCols.map((col) => (
                      <td key={col.id} className="px-2.5 py-1.5">
                        {cellValue(book, col.id, overdueBookIds)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
