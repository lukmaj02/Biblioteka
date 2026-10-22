"use client";

import { markBooksLabeled } from "@/lib/actions/books";

type Props = {
  disabled?: boolean;
  bookIds?: number[];
};

/**
 * Drukuje wyłącznie wygenerowane strony A4 (.label-pages),
 * a nie cały UI aplikacji widoczny na ekranie.
 * Po kliknięciu oznacza książki jako mające etykietę.
 */
export function PrintButton({ disabled, bookIds = [] }: Props) {
  function handlePrint() {
    const pages = document.querySelector(".label-pages");
    if (!pages) {
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

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Etykiety A4</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-pages {
      margin: 0;
      padding: 0;
      display: block;
    }
    .a4-page {
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
      background: #fff;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      box-shadow: none !important;
      border: none !important;
    }
    .a4-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .label-cell {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-barcode rect {
      fill: #000 !important;
    }
  </style>
</head>
<body>${pages.outerHTML}</body>
</html>`);
    doc.close();

    const cleanup = () => {
      setTimeout(() => iframe.remove(), 500);
    };

    const run = async () => {
      try {
        win.focus();
        win.print();
        if (bookIds.length > 0) {
          await markBooksLabeled(bookIds);
        }
      } finally {
        cleanup();
      }
    };

    if (doc.readyState === "complete") {
      setTimeout(run, 150);
    } else {
      iframe.onload = () => setTimeout(run, 150);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={disabled}
      onClick={handlePrint}
    >
      Drukuj
    </button>
  );
}
