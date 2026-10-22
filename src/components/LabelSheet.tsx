"use client";

import type { Book } from "@/lib/db/schema";
import { bookSygnatura } from "@/lib/book-id";
import { barcodeSvgMarkup } from "@/lib/barcode-svg";
import {
  LABEL_COLS,
  LABEL_GAP_MM,
  LABEL_H_MM,
  LABEL_PAGE_MARGIN_MM,
  LABEL_ROWS,
  LABEL_W_MM,
  labelsPerA4Page,
} from "@/lib/labels-layout";

export {
  LABEL_GAP_MM,
  LABEL_H_MM,
  LABEL_PAGE_MARGIN_MM,
  LABEL_W_MM,
  labelsPerA4Page,
} from "@/lib/labels-layout";

type Props = {
  books: Book[];
};

function chunkPages(books: Book[]): Book[][] {
  const perPage = labelsPerA4Page();
  const pages: Book[][] = [];
  for (let i = 0; i < books.length; i += perPage) {
    pages.push(books.slice(i, i + perPage));
  }
  return pages.length > 0 ? pages : [[]];
}

function LabelCell({ book }: { book: Book }) {
  const code = bookSygnatura(book);
  let svg = "";
  try {
    svg = barcodeSvgMarkup(code, {
      height: 38,
      moduleWidth: 1.35,
      quietZone: 8,
    });
  } catch {
    svg = "";
  }

  return (
    <article
      className="label-cell"
      style={{
        width: `${LABEL_W_MM}mm`,
        height: `${LABEL_H_MM}mm`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1mm",
        overflow: "hidden",
        border: "0.3pt dashed #555",
        background: "#fff",
        color: "#000",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {svg ? (
        <div
          className="label-barcode"
          style={{
            width: "46mm",
            height: "11mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
          dangerouslySetInnerHTML={{
            __html: svg.replace(
              /<svg /,
              '<svg style="width:46mm;height:11mm;max-width:100%;" preserveAspectRatio="none" '
            ),
          }}
        />
      ) : null}
      <div
        className="label-code"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "8pt",
          lineHeight: 1,
          color: "#000",
          letterSpacing: "0.02em",
        }}
      >
        {code}
      </div>
    </article>
  );
}

export function LabelSheet({ books }: Props) {
  const pages = chunkPages(books);

  return (
    <div className="label-pages flex flex-col items-center gap-8 print:gap-0">
      {pages.map((pageBooks, pageIndex) => (
        <section
          key={pageIndex}
          className="a4-page"
          style={{
            width: "210mm",
            height: "297mm",
            boxSizing: "border-box",
            padding: `${LABEL_PAGE_MARGIN_MM}mm`,
            background: "#ffffff",
            color: "#000",
            position: "relative",
            overflow: "hidden",
            pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
            breakAfter: pageIndex < pages.length - 1 ? "page" : "auto",
          }}
        >
          <div
            className="label-sheet"
            style={{
              display: "grid",
              width: `${LABEL_COLS * LABEL_W_MM}mm`,
              height: `${LABEL_ROWS * LABEL_H_MM}mm`,
              gridTemplateColumns: `repeat(${LABEL_COLS}, ${LABEL_W_MM}mm)`,
              gridTemplateRows: `repeat(${LABEL_ROWS}, ${LABEL_H_MM}mm)`,
              gap: `${LABEL_GAP_MM}mm`,
              boxSizing: "border-box",
              alignContent: "start",
              justifyContent: "start",
            }}
          >
            {pageBooks.map((book) => (
              <LabelCell key={book.id} book={book} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
