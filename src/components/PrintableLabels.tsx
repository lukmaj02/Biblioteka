"use client";

import type { Book } from "@/lib/db/schema";
import { labelsPerA4Page } from "@/lib/labels-layout";
import { LabelSheet } from "./LabelSheet";
import { PrintButton } from "./PrintButton";

type Props = {
  books: Book[];
};

export function PrintableLabels({ books }: Props) {
  const perPage = labelsPerA4Page();
  const pages =
    books.length === 0 ? 0 : Math.ceil(books.length / perPage);

  return (
    <>
      <header className="no-print mx-auto mb-6 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <div>
          <a href="/ustawienia/etykiety" className="text-sm text-muted">
            ← Ustawienia · Etykiety
          </a>
          <h1 className="text-2xl font-semibold text-ink">
            Wygenerowane etykiety A4
          </h1>
          <p className="text-sm text-muted">
            {books.length} szt. · {pages}{" "}
            {pages === 1 ? "strona" : "strony"} A4 (210×297&nbsp;mm) · do{" "}
            {perPage}/stronę · etykieta 5×2&nbsp;cm
          </p>
        </div>
        <PrintButton
          disabled={books.length === 0}
          bookIds={books.map((b) => b.id)}
        />
      </header>

      <div className="label-print-root">
        {books.length === 0 ? (
          <p className="no-print text-muted">
            Brak zaznaczonych książek. Wybierz pozycje w ustawieniach etykiet.
          </p>
        ) : (
          <LabelSheet books={books} />
        )}
      </div>
    </>
  );
}
