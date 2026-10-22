/** Próg (w %) — regały o podobnym Y traktujemy jako jedną linię (A1, A2…). */
export const ROW_Y_THRESHOLD = 12;

export type BookcaseLayout = {
  id: number;
  xPct: number;
  yPct: number;
};

/**
 * Nadaje kody A1, A2… / B1… według pozycji:
 * linie od góry (Y), w linii od lewej (X).
 */
export function assignBookcaseCodes(
  items: BookcaseLayout[]
): Map<number, string> {
  const sorted = [...items].sort(
    (a, b) => a.yPct - b.yPct || a.xPct - b.xPct
  );

  const rows: BookcaseLayout[][] = [];
  for (const item of sorted) {
    const row = rows.find(
      (r) => Math.abs(r[0].yPct - item.yPct) <= ROW_Y_THRESHOLD
    );
    if (row) row.push(item);
    else rows.push([item]);
  }

  const codes = new Map<number, string>();
  rows.forEach((row, rowIndex) => {
    const letter = rowLetter(rowIndex);
    row
      .sort((a, b) => a.xPct - b.xPct)
      .forEach((item, colIndex) => {
        codes.set(item.id, `${letter}${colIndex + 1}`);
      });
  });
  return codes;
}

function rowLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return (
    String.fromCharCode(65 + first) + String.fromCharCode(65 + second)
  );
}

export function formatShelfSlot(code: string, shelfIndex: number): string {
  const n = String(Math.max(1, shelfIndex)).padStart(2, "0");
  return `${code}.${n}`;
}
