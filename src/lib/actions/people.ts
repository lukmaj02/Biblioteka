"use server";

import { eq, desc, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

export async function listPeople(q?: string) {
  const db = await getDb();
  const query = db.select().from(schema.people).orderBy(desc(schema.people.id));
  if (q?.trim()) {
    const pattern = `%${q.trim()}%`;
    return query
      .where(
        or(
          like(schema.people.firstName, pattern),
          like(schema.people.lastName, pattern),
          like(schema.people.email, pattern),
          like(schema.people.phone, pattern),
          like(schema.people.readerNo, pattern)
        )
      )
      .all();
  }
  return query.all();
}

export async function getPerson(id: number) {
  const db = await getDb();
  return (
    (await db
      .select()
      .from(schema.people)
      .where(eq(schema.people.id, id))
      .get()) ?? null
  );
}

export async function createPerson(formData: FormData) {
  const db = await getDb();
  const firstName = String(formData.get("firstName") || "").trim();
  if (!firstName) {
    return { error: "Imię jest wymagane" };
  }

  const person = await db
    .insert(schema.people)
    .values({
      readerNo: str(formData, "readerNo"),
      firstName,
      lastName: String(formData.get("lastName") || "").trim(),
      birthDate: str(formData, "birthDate"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      notes: str(formData, "notes"),
    })
    .returning()
    .get();

  if (!person.readerNo) {
    await db
      .update(schema.people)
      .set({ readerNo: String(person.id).padStart(4, "0") })
      .where(eq(schema.people.id, person.id));
  }

  revalidatePath("/osoby");
  revalidatePath("/ustawienia/czytelnicy");
  revalidatePath("/wypozyczenia");
  return { person };
}

export async function updatePerson(id: number, formData: FormData) {
  const db = await getDb();
  const firstName = String(formData.get("firstName") || "").trim();
  if (!firstName) {
    return { error: "Imię jest wymagane" };
  }

  await db
    .update(schema.people)
    .set({
      readerNo: str(formData, "readerNo"),
      firstName,
      lastName: String(formData.get("lastName") || "").trim(),
      birthDate: str(formData, "birthDate"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      notes: str(formData, "notes"),
    })
    .where(eq(schema.people.id, id));

  revalidatePath("/osoby");
  revalidatePath("/ustawienia/czytelnicy");
  return { ok: true };
}

export async function deletePerson(id: number) {
  const db = await getDb();
  const loans = await db
    .select()
    .from(schema.loans)
    .where(eq(schema.loans.personId, id))
    .all();

  if (loans.some((l) => !l.returnedAt)) {
    return { error: "Osoba ma aktywne wypożyczenia" };
  }

  await db.delete(schema.loans).where(eq(schema.loans.personId, id));
  await db.delete(schema.people).where(eq(schema.people.id, id));
  revalidatePath("/osoby");
  revalidatePath("/ustawienia/czytelnicy");
  revalidatePath("/wypozyczenia");
  revalidatePath("/");
  return { ok: true };
}
