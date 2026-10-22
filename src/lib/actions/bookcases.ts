"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assignBookcaseCodes } from "@/lib/bookcase-codes";
import { getDb, schema } from "@/lib/db";
import type { Bookcase } from "@/lib/db/schema";

export async function listBookcases(): Promise<Bookcase[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.bookcases).all();
  return rows.sort((a, b) => a.code.localeCompare(b.code, "pl"));
}

async function renumberAll() {
  const db = await getDb();
  const rows = await db.select().from(schema.bookcases).all();
  const codes = assignBookcaseCodes(
    rows.map((r) => ({ id: r.id, xPct: r.xPct, yPct: r.yPct }))
  );
  for (const row of rows) {
    const code = codes.get(row.id);
    if (code && code !== row.code) {
      await db
        .update(schema.bookcases)
        .set({ code })
        .where(eq(schema.bookcases.id, row.id));
    }
  }
}

export async function createBookcase(input: {
  xPct: number;
  yPct: number;
  shelfCount: number;
  wPct?: number;
  hPct?: number;
}) {
  const shelfCount = Math.min(20, Math.max(1, Math.round(input.shelfCount)));
  const xPct = Math.min(88, Math.max(0, Math.round(input.xPct)));
  const yPct = Math.min(70, Math.max(0, Math.round(input.yPct)));
  // Widok z góry: wyraźnie prostokątny i dobrze widoczny na planie
  const wPct = input.wPct ?? 28;
  const hPct = input.hPct ?? 12;

  const db = await getDb();
  const tempCode = `TMP${Date.now()}`;
  const created = await db
    .insert(schema.bookcases)
    .values({
      code: tempCode,
      xPct,
      yPct,
      wPct,
      hPct,
      shelfCount,
      rotation: 0,
    })
    .returning()
    .get();

  await renumberAll();
  revalidatePath("/ksiegozbior");

  const updated = await db
    .select()
    .from(schema.bookcases)
    .where(eq(schema.bookcases.id, created.id))
    .get();
  return { bookcase: updated ?? created };
}

export async function updateBookcasePosition(
  id: number,
  xPct: number,
  yPct: number
) {
  const db = await getDb();
  await db
    .update(schema.bookcases)
    .set({
      xPct: Math.min(88, Math.max(0, Math.round(xPct))),
      yPct: Math.min(70, Math.max(0, Math.round(yPct))),
    })
    .where(eq(schema.bookcases.id, id));
  await renumberAll();
  revalidatePath("/ksiegozbior");
  return { ok: true };
}

export async function deleteBookcase(id: number) {
  const db = await getDb();
  await db.delete(schema.bookcases).where(eq(schema.bookcases.id, id));
  await renumberAll();
  revalidatePath("/ksiegozbior");
  return { ok: true };
}

/** Obrót o 90° — bez zmiany proporcji w/h (tylko kąt 0 ↔ 90). */
export async function rotateBookcase(id: number) {
  const db = await getDb();
  const existing = await db
    .select()
    .from(schema.bookcases)
    .where(eq(schema.bookcases.id, id))
    .get();
  if (!existing) return { error: "Nie znaleziono regału" };

  const nextRotation = existing.rotation === 90 ? 0 : 90;
  await db
    .update(schema.bookcases)
    .set({ rotation: nextRotation })
    .where(eq(schema.bookcases.id, id));

  revalidatePath("/ksiegozbior");
  const updated = await db
    .select()
    .from(schema.bookcases)
    .where(eq(schema.bookcases.id, id))
    .get();
  return { bookcase: updated ?? existing };
}
