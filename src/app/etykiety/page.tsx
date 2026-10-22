import { PrintableLabels } from "@/components/PrintableLabels";
import { getBooksByIds } from "@/lib/actions/books";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ids?: string }>;

export default async function EtykietyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const books = await getBooksByIds(ids);

  return (
    <div className="label-print-page min-h-screen bg-[rgba(47,59,42,0.08)] px-4 py-6 print:bg-white print:p-0">
      <style>{`
        .a4-page {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body::before { display: none !important; }
          .no-print { display: none !important; }
          .label-print-page {
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }
          .label-print-root,
          .label-pages {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            width: auto !important;
            max-width: none !important;
            align-items: stretch !important;
          }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            overflow: hidden !important;
            page-break-after: always;
            break-after: page;
          }
          .a4-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .label-cell {
            border: 0.3pt dashed #555 !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .label-barcode,
          .label-barcode svg,
          .label-barcode rect {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .label-barcode rect {
            fill: #000 !important;
          }
          .label-code {
            color: #000 !important;
          }
        }
      `}</style>

      <div className="mx-auto flex max-w-[220mm] flex-col items-center">
        <PrintableLabels books={books} />
      </div>
    </div>
  );
}
