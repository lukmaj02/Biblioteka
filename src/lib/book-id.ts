import type { Book } from "@/lib/db/schema";

/** Sygnatura = numer inwentarzowy (używany też w kodzie kreskowym). */
export function bookSygnatura(
  book: Pick<Book, "id" | "inventoryNo" | "signature">
): string {
  const inv = book.inventoryNo?.trim();
  if (inv) return inv;
  const sig = book.signature?.trim();
  if (sig) return sig;
  return String(book.id).padStart(5, "0");
}
