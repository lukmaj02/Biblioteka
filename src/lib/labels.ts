import type { BookCondition, BookStatus } from "./db/schema";

export const conditionLabels: Record<BookCondition, string> = {
  nowa: "Nowa",
  dobry: "Dobry",
  zuzyta: "Zużyta",
  uszkodzona: "Uszkodzona",
};

export const statusLabels: Record<BookStatus, string> = {
  dostepna: "Dostępna",
  wypozyczona: "Wypożyczona",
  zarezerwowana: "Zarezerwowana",
};
