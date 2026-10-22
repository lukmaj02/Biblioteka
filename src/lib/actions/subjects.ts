"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";

const LETTER_PREFIX = /^([A-Z]+)\.\s+/;

function stripLetterPrefix(name: string): string {
  return name.replace(LETTER_PREFIX, "").trim();
}

/** Kolejna wolna litera: A…Z, potem AA, AB… */
function nextGroupLetter(existingNames: string[]): string {
  const used = new Set<string>();
  for (const n of existingNames) {
    const m = n.match(LETTER_PREFIX);
    if (m) used.add(m[1]);
  }

  for (let i = 0; i < 26; i++) {
    const L = String.fromCharCode(65 + i);
    if (!used.has(L)) return L;
  }
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const L =
        String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
      if (!used.has(L)) return L;
    }
  }
  return "Z";
}

function withLetter(letter: string, name: string): string {
  return `${letter}. ${stripLetterPrefix(name)}`;
}

export async function listSubjectOptions(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.subjectOptions)
    .orderBy(asc(schema.subjectOptions.name))
    .all();
  return rows.map((r) => r.name);
}

export async function createSubjectOption(formData: FormData) {
  const raw = String(formData.get("name") || "").trim();
  if (!raw) return { error: "Podaj nazwę tematyki" };

  const db = await getDb();
  const existing = await db.select().from(schema.subjectOptions).all();
  const letter = nextGroupLetter(existing.map((r) => r.name));
  const name = withLetter(letter, raw);

  try {
    await db.insert(schema.subjectOptions).values({ name });
  } catch {
    return { error: "Taka tematyka już istnieje" };
  }

  revalidatePath("/ustawienia/tematyka");
  revalidatePath("/ksiegozbior");
  return { ok: true };
}

export async function deleteSubjectOption(id: number) {
  const db = await getDb();
  await db
    .delete(schema.subjectOptions)
    .where(eq(schema.subjectOptions.id, id));
  revalidatePath("/ustawienia/tematyka");
  revalidatePath("/ksiegozbior");
  return { ok: true };
}

export async function listSubjectOptionsDetailed() {
  const db = await getDb();
  return db
    .select()
    .from(schema.subjectOptions)
    .orderBy(asc(schema.subjectOptions.name))
    .all();
}

/** Uzupełnia literę A./B./… dla starych pozycji bez prefiksu. */
export async function ensureSubjectLetters() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.subjectOptions)
    .orderBy(asc(schema.subjectOptions.id))
    .all();

  const named = rows.map((r) => r.name);
  for (const row of rows) {
    if (LETTER_PREFIX.test(row.name)) continue;
    const letter = nextGroupLetter(named);
    const name = withLetter(letter, row.name);
    await db
      .update(schema.subjectOptions)
      .set({ name })
      .where(eq(schema.subjectOptions.id, row.id));
    named.push(name);
  }
}
