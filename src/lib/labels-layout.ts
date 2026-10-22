/** 5 cm szer. × 2 cm wys. */
export const LABEL_W_MM = 50;
export const LABEL_H_MM = 20;
/** Bez szczelin między etykietami — więcej na stronę, ramka = linia cięcia */
export const LABEL_GAP_MM = 0;
export const LABEL_PAGE_MARGIN_MM = 5;

export const LABEL_COLS = Math.floor(
  (210 - LABEL_PAGE_MARGIN_MM * 2) / LABEL_W_MM
);
export const LABEL_ROWS = Math.floor(
  (297 - LABEL_PAGE_MARGIN_MM * 2) / LABEL_H_MM
);

export function labelsPerA4Page(): number {
  return Math.max(1, LABEL_COLS) * Math.max(1, LABEL_ROWS);
}
