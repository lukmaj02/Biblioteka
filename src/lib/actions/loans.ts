"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, getSettings, schema } from "@/lib/db";
import { addDaysISO, todayISODate } from "@/lib/dates";

export async function listLoans(opts: { activeOnly?: boolean } = {}) {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.loans.id,
      bookId: schema.loans.bookId,
      personId: schema.loans.personId,
      borrowedAt: schema.loans.borrowedAt,
      dueAt: schema.loans.dueAt,
      returnedAt: schema.loans.returnedAt,
      bookTitle: schema.books.title,
      bookAuthors: schema.books.authors,
      bookCover: schema.books.coverPath,
      personFirstName: schema.people.firstName,
      personLastName: schema.people.lastName,
    })
    .from(schema.loans)
    .innerJoin(schema.books, eq(schema.loans.bookId, schema.books.id))
    .innerJoin(schema.people, eq(schema.loans.personId, schema.people.id))
    .orderBy(desc(schema.loans.id))
    .all();

  if (opts.activeOnly) {
    return rows.filter((r) => !r.returnedAt);
  }
  return rows;
}

export async function getOverdueLoans() {
  const db = await getDb();
  const today = todayISODate();
  return db
    .select({
      id: schema.loans.id,
      bookId: schema.loans.bookId,
      personId: schema.loans.personId,
      borrowedAt: schema.loans.borrowedAt,
      dueAt: schema.loans.dueAt,
      bookTitle: schema.books.title,
      personFirstName: schema.people.firstName,
      personLastName: schema.people.lastName,
    })
    .from(schema.loans)
    .innerJoin(schema.books, eq(schema.loans.bookId, schema.books.id))
    .innerJoin(schema.people, eq(schema.loans.personId, schema.people.id))
    .where(and(isNull(schema.loans.returnedAt), sql`${schema.loans.dueAt} < ${today}`))
    .all();
}

export async function createLoan(formData: FormData) {
  const db = await getDb();
  const bookId = Number(formData.get("bookId"));
  const personId = Number(formData.get("personId"));
  const borrowedAt = String(formData.get("borrowedAt") || todayISODate());
  let dueAt = String(formData.get("dueAt") || "");

  if (!bookId || !personId) {
    return { error: "Wybierz książkę i osobę" };
  }

  const book = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.id, bookId))
    .get();
  if (!book) return { error: "Nie znaleziono książki" };
  if (book.status === "wypozyczona") {
    return { error: "Książka jest już wypożyczona" };
  }

  const person = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get();
  if (!person) return { error: "Nie znaleziono osoby" };

  if (!dueAt) {
    const settings = await getSettings();
    dueAt = addDaysISO(borrowedAt, settings.defaultLoanDays);
  }

  const loan = await db
    .insert(schema.loans)
    .values({ bookId, personId, borrowedAt, dueAt })
    .returning()
    .get();

  await db
    .update(schema.books)
    .set({ status: "wypozyczona", updatedAt: new Date().toISOString() })
    .where(eq(schema.books.id, bookId));

  revalidatePath("/");
  revalidatePath("/wypozyczenia");
  revalidatePath("/ksiegozbior");
  revalidatePath("/wyszukiwarka");
  return { loan };
}

export async function returnLoan(loanId: number) {
  const db = await getDb();
  const loan = await db
    .select()
    .from(schema.loans)
    .where(eq(schema.loans.id, loanId))
    .get();

  if (!loan) return { error: "Nie znaleziono wypożyczenia" };
  if (loan.returnedAt) return { error: "Już zwrócone" };

  await db
    .update(schema.loans)
    .set({ returnedAt: todayISODate() })
    .where(eq(schema.loans.id, loanId));

  await db
    .update(schema.books)
    .set({ status: "dostepna", updatedAt: new Date().toISOString() })
    .where(eq(schema.books.id, loan.bookId));

  revalidatePath("/");
  revalidatePath("/wypozyczenia");
  revalidatePath("/ksiegozbior");
  return { ok: true };
}

export async function prolongLoan(loanId: number, extraDays?: number) {
  const db = await getDb();
  const settings = await getSettings();
  const days = extraDays ?? settings.defaultLoanDays;
  const loan = await db
    .select()
    .from(schema.loans)
    .where(eq(schema.loans.id, loanId))
    .get();

  if (!loan) return { error: "Nie znaleziono wypożyczenia" };
  if (loan.returnedAt) return { error: "Wypożyczenie już zwrócone" };

  const base = loan.dueAt > todayISODate() ? loan.dueAt : todayISODate();
  const newDue = addDaysISO(base, Math.max(1, days));

  await db
    .update(schema.loans)
    .set({ dueAt: newDue })
    .where(eq(schema.loans.id, loanId));

  revalidatePath("/");
  revalidatePath("/wypozyczenia");
  revalidatePath("/ksiegozbior");
  return { ok: true, dueAt: newDue };
}

export async function getActiveLoanForBook(bookId: number) {
  const db = await getDb();
  return (
    (await db
      .select({
        id: schema.loans.id,
        bookId: schema.loans.bookId,
        personId: schema.loans.personId,
        borrowedAt: schema.loans.borrowedAt,
        dueAt: schema.loans.dueAt,
        personFirstName: schema.people.firstName,
        personLastName: schema.people.lastName,
        personEmail: schema.people.email,
        personReaderNo: schema.people.readerNo,
      })
      .from(schema.loans)
      .innerJoin(schema.people, eq(schema.loans.personId, schema.people.id))
      .where(and(eq(schema.loans.bookId, bookId), isNull(schema.loans.returnedAt)))
      .get()) ?? null
  );
}

export async function getDashboardStats() {
  const db = await getDb();
  const bookCount =
    (await db.select({ c: sql<number>`count(*)` }).from(schema.books).get())?.c ??
    0;
  const activeLoans =
    (
      await db
        .select({ c: sql<number>`count(*)` })
        .from(schema.loans)
        .where(isNull(schema.loans.returnedAt))
        .get()
    )?.c ?? 0;
  const overdue = await getOverdueLoans();
  const peopleCount =
    (await db.select({ c: sql<number>`count(*)` }).from(schema.people).get())
      ?.c ?? 0;

  return {
    bookCount: Number(bookCount),
    activeLoans: Number(activeLoans),
    overdueCount: overdue.length,
    overdue,
    peopleCount: Number(peopleCount),
  };
}
