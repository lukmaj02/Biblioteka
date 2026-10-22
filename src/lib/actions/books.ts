"use server";

import { eq, like, or, and, sql, desc, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { getDb, schema } from "@/lib/db";
import type { BookCondition, BookStatus } from "@/lib/db/schema";
import { ensureAppDirs, getCoversDir } from "@/lib/paths";

export type BookFilters = {
  q?: string;
  sygnatura?: string;
  author?: string;
  title?: string;
  condition?: BookCondition | "";
  status?: BookStatus | "";
  location?: string;
};

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function bookFieldsFromForm(formData: FormData) {
  return {
    signature: str(formData, "signature"),
    inventoryNo: str(formData, "inventoryNo"),
    title: String(formData.get("title") || "").trim(),
    authors: String(formData.get("authors") || "").trim(),
    isbn: str(formData, "isbn"),
    keywords: str(formData, "keywords"),
    publishedAt: str(formData, "publishedAt"),
    volume: str(formData, "volume"),
    value: str(formData, "value"),
    publisher: str(formData, "publisher"),
    edition: str(formData, "edition"),
    condition: (String(formData.get("condition") || "dobry") ||
      "dobry") as BookCondition,
    description: str(formData, "description"),
    subject: str(formData, "subject"),
    location: str(formData, "location"),
    publicationType: str(formData, "publicationType") || "Książka",
    acquiredAt: str(formData, "acquiredAt"),
    udc: str(formData, "udc"),
    labelMarked: formData.get("labelMarked") === "1" || formData.get("labelMarked") === "on" ? 1 : 0,
  };
}

export async function setBookLocation(
  id: number,
  location: string | null,
  udc?: string | null
) {
  const db = await getDb();
  await db
    .update(schema.books)
    .set({
      location: location?.trim() || null,
      ...(udc !== undefined ? { udc: udc?.trim() || null } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.books.id, id));
  revalidatePath("/ksiegozbior");
  revalidatePath(`/ksiegozbior/${id}`);
  return { ok: true };
}

export async function setBookLabelMarked(id: number, marked: boolean) {
  const db = await getDb();
  await db
    .update(schema.books)
    .set({
      labelMarked: marked ? 1 : 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.books.id, id));
  revalidatePath("/ksiegozbior");
  revalidatePath(`/ksiegozbior/${id}`);
  revalidatePath("/ustawienia/etykiety");
  return { ok: true };
}

export async function markBooksLabeled(ids: number[]) {
  if (ids.length === 0) return { ok: true };
  const db = await getDb();
  const now = new Date().toISOString();
  for (const id of ids) {
    await db
      .update(schema.books)
      .set({ labelMarked: 1, updatedAt: now })
      .where(eq(schema.books.id, id));
  }
  revalidatePath("/ksiegozbior");
  revalidatePath("/ustawienia/etykiety");
  for (const id of ids) {
    revalidatePath(`/ksiegozbior/${id}`);
  }
  return { ok: true };
}

export async function listBooks(filters: BookFilters = {}) {
  const db = await getDb();
  const conditions = [];

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(schema.books.title, q),
        like(schema.books.authors, q),
        like(schema.books.isbn, q),
        like(schema.books.location, q),
        like(schema.books.signature, q),
        like(schema.books.keywords, q),
        like(schema.books.subject, q)
      )
    );
  }
  if (filters.sygnatura?.trim()) {
    const raw = filters.sygnatura.trim();
    const asId = Number(raw.replace(/^0+/, "") || "0");
    const sigParts = [
      like(schema.books.signature, `%${raw}%`),
      like(schema.books.inventoryNo, `%${raw}%`),
    ];
    if (Number.isFinite(asId) && asId > 0) {
      sigParts.push(eq(schema.books.id, asId));
    }
    conditions.push(or(...sigParts));
  }
  if (filters.author?.trim()) {
    conditions.push(like(schema.books.authors, `%${filters.author.trim()}%`));
  }
  if (filters.title?.trim()) {
    conditions.push(like(schema.books.title, `%${filters.title.trim()}%`));
  }
  if (filters.condition) {
    conditions.push(eq(schema.books.condition, filters.condition));
  }
  if (filters.status) {
    conditions.push(eq(schema.books.status, filters.status));
  }
  if (filters.location?.trim()) {
    conditions.push(like(schema.books.location, `%${filters.location.trim()}%`));
  }

  const query = db.select().from(schema.books).orderBy(desc(schema.books.id));

  if (conditions.length > 0) {
    return query.where(and(...conditions)).all();
  }
  return query.all();
}

export async function getBook(id: number) {
  const db = await getDb();
  return (
    (await db.select().from(schema.books).where(eq(schema.books.id, id)).get()) ??
    null
  );
}

/** Szukaj po id, nr inwentarzowym lub sygnaturze (dokładne / częściowe). */
export async function findBookByQuery(raw: string) {
  const q = raw.trim();
  if (!q) return null;
  const db = await getDb();
  const asId = Number(q.replace(/^0+/, "") || "0");

  if (Number.isFinite(asId) && asId > 0) {
    const byId = await db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, asId))
      .get();
    if (byId) return byId;
  }

  const byInv = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.inventoryNo, q))
    .get();
  if (byInv) return byInv;

  const bySig = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.signature, q))
    .get();
  if (bySig) return bySig;

  const pattern = `%${q}%`;
  return (
    (await db
      .select()
      .from(schema.books)
      .where(
        or(
          like(schema.books.signature, pattern),
          like(schema.books.inventoryNo, pattern),
          like(schema.books.title, pattern),
          like(schema.books.isbn, pattern)
        )
      )
      .get()) ?? null
  );
}

export async function getBookLocations(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ location: schema.books.location })
    .from(schema.books)
    .all();
  return rows
    .map((r) => r.location)
    .filter((l): l is string => Boolean(l && l.trim()))
    .sort();
}

export async function getBookSubjects(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ name: schema.subjectOptions.name })
    .from(schema.subjectOptions)
    .orderBy(asc(schema.subjectOptions.name))
    .all();
  return rows.map((r) => r.name);
}

/** Następny wolny numer inwentarzowy (max z id / czysto numerycznych sygnatur + 1). */
export async function getNextInventoryNo(): Promise<string> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.books.id,
      inventoryNo: schema.books.inventoryNo,
      signature: schema.books.signature,
    })
    .from(schema.books)
    .all();

  let max = 0;
  for (const row of rows) {
    max = Math.max(max, row.id);
    for (const raw of [row.inventoryNo, row.signature]) {
      const v = raw?.trim();
      if (v && /^\d+$/.test(v)) {
        max = Math.max(max, Number(v));
      }
    }
  }
  return String(max + 1);
}

async function saveCoverFile(
  file: File | null,
  isbnHint?: string | null
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  const name = `${isbnHint || "book"}-${Date.now()}.${safeExt}`;
  ensureAppDirs();
  const dir = getCoversDir();
  fs.writeFileSync(path.join(dir, name), bytes);
  return `/uploads/covers/${name}`;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createBook(formData: FormData) {
  const db = await getDb();
  const fields = bookFieldsFromForm(formData);
  if (!fields.title) return { error: "Tytuł jest wymagany" };

  const coverFile = formData.get("cover") as File | null;
  const existingCover = str(formData, "coverPath");
  const uploaded = await saveCoverFile(coverFile, fields.isbn);

  let inventoryNo = fields.inventoryNo;
  if (!inventoryNo) {
    inventoryNo = await getNextInventoryNo();
  }

  const result = await db
    .insert(schema.books)
    .values({
      ...fields,
      inventoryNo,
      signature: fields.signature || inventoryNo,
      acquiredAt: fields.acquiredAt || todayDate(),
      coverPath: uploaded || existingCover,
      labelMarked: fields.labelMarked ? 1 : 0,
      status: "dostepna",
      updatedAt: new Date().toISOString(),
    })
    .returning()
    .get();

  revalidatePath("/");
  revalidatePath("/ksiegozbior");
  return { book: result };
}

export async function updateBook(id: number, formData: FormData) {
  const db = await getDb();
  const existing = await getBook(id);
  if (!existing) return { error: "Nie znaleziono książki" };

  const fields = bookFieldsFromForm(formData);
  if (!fields.title) return { error: "Tytuł jest wymagany" };

  const coverFile = formData.get("cover") as File | null;
  const existingCover = str(formData, "coverPath");
  const uploaded = await saveCoverFile(coverFile, existing.isbn);

  await db
    .update(schema.books)
    .set({
      ...fields,
      coverPath: uploaded || existingCover || existing.coverPath,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.books.id, id));

  revalidatePath("/");
  revalidatePath("/ksiegozbior");
  revalidatePath(`/ksiegozbior/${id}`);
  return { ok: true };
}

export async function deleteBook(id: number) {
  const db = await getDb();
  const activeLoan = await db
    .select()
    .from(schema.loans)
    .where(
      and(eq(schema.loans.bookId, id), sql`${schema.loans.returnedAt} IS NULL`)
    )
    .get();

  if (activeLoan) {
    return { error: "Nie można usunąć książki z aktywnym wypożyczeniem" };
  }

  // Historia wypożyczeń trzyma FK — usuń ją przed książką
  await db.delete(schema.loans).where(eq(schema.loans.bookId, id));
  await db.delete(schema.books).where(eq(schema.books.id, id));
  revalidatePath("/");
  revalidatePath("/ksiegozbior");
  revalidatePath("/wypozyczenia");
  return { ok: true };
}

export async function getBooksByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .select()
    .from(schema.books)
    .where(inArray(schema.books.id, ids))
    .all();
}
