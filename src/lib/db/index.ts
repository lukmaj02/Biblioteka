import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { ensureAppDirs, getDbPath } from "@/lib/paths";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  bibliotekaDb?: Db;
  bibliotekaClient?: Client;
};

async function addColumnIfMissing(
  client: Client,
  table: string,
  column: string,
  definition: string
) {
  try {
    await client.execute(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
  } catch {
    /* column already exists */
  }
}

async function migrate(client: Client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signature TEXT,
      inventory_no TEXT,
      title TEXT NOT NULL,
      authors TEXT NOT NULL DEFAULT '',
      isbn TEXT,
      keywords TEXT,
      published_at TEXT,
      volume TEXT,
      value TEXT,
      publisher TEXT,
      edition TEXT,
      condition TEXT NOT NULL DEFAULT 'dobry',
      cover_path TEXT,
      description TEXT,
      subject TEXT,
      location TEXT,
      publication_type TEXT DEFAULT 'Książka',
      acquired_at TEXT,
      udc TEXT,
      label_marked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'dostepna',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reader_no TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT,
      document TEXT,
      pesel TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id),
      person_id INTEGER NOT NULL REFERENCES people(id),
      borrowed_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      returned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      default_loan_days INTEGER NOT NULL DEFAULT 21,
      label_cols INTEGER NOT NULL DEFAULT 2,
      label_rows INTEGER NOT NULL DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS subject_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS bookcases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      x_pct INTEGER NOT NULL DEFAULT 10,
      y_pct INTEGER NOT NULL DEFAULT 10,
      w_pct INTEGER NOT NULL DEFAULT 28,
      h_pct INTEGER NOT NULL DEFAULT 12,
      shelf_count INTEGER NOT NULL DEFAULT 4,
      rotation INTEGER NOT NULL DEFAULT 0
    );
  `);

  const bookCols: [string, string][] = [
    ["signature", "TEXT"],
    ["inventory_no", "TEXT"],
    ["keywords", "TEXT"],
    ["volume", "TEXT"],
    ["value", "TEXT"],
    ["publisher", "TEXT"],
    ["subject", "TEXT"],
    ["publication_type", "TEXT"],
    ["acquired_at", "TEXT"],
    ["udc", "TEXT"],
    ["label_marked", "INTEGER NOT NULL DEFAULT 0"],
  ];
  for (const [col, def] of bookCols) {
    await addColumnIfMissing(client, "books", col, def);
  }

  const peopleCols: [string, string][] = [
    ["reader_no", "TEXT"],
    ["birth_date", "TEXT"],
    ["document", "TEXT"],
    ["pesel", "TEXT"],
    ["address", "TEXT"],
  ];
  for (const [col, def] of peopleCols) {
    await addColumnIfMissing(client, "people", col, def);
  }

  await addColumnIfMissing(
    client,
    "bookcases",
    "rotation",
    "INTEGER NOT NULL DEFAULT 0"
  );

  // Jednorazowo przenieś istniejące tematyki z książek do słownika
  const existingOpts = await client.execute(
    "SELECT COUNT(*) AS c FROM subject_options"
  );
  const optCount = Number(existingOpts.rows[0]?.c ?? 0);
  if (optCount === 0) {
    const fromBooks = await client.execute(
      "SELECT DISTINCT subject FROM books WHERE subject IS NOT NULL AND TRIM(subject) != ''"
    );
    let letterIdx = 0;
    for (const row of fromBooks.rows) {
      let name = String(row.subject ?? "").trim();
      if (!name) continue;
      if (!/^[A-Z]+\.\s+/.test(name)) {
        const letter = String.fromCharCode(65 + (letterIdx % 26));
        name = `${letter}. ${name}`;
        letterIdx++;
      }
      try {
        await client.execute({
          sql: "INSERT INTO subject_options (name) VALUES (?)",
          args: [name],
        });
      } catch {
        /* unique */
      }
    }
  } else {
    // Dopisz litery do pozycji bez prefiksu A./B./…
    const unlabeled = await client.execute(
      "SELECT id, name FROM subject_options WHERE name NOT GLOB '[A-Z]. *' AND name NOT GLOB '[A-Z][A-Z]. *' ORDER BY id"
    );
    if (unlabeled.rows.length > 0) {
      const all = await client.execute("SELECT name FROM subject_options");
      const used = new Set<string>();
      for (const r of all.rows) {
        const m = String(r.name).match(/^([A-Z]+)\.\s/);
        if (m) used.add(m[1]);
      }
      const nextLetter = () => {
        for (let i = 0; i < 26; i++) {
          const L = String.fromCharCode(65 + i);
          if (!used.has(L)) {
            used.add(L);
            return L;
          }
        }
        return "Z";
      };
      for (const row of unlabeled.rows) {
        const letter = nextLetter();
        const name = `${letter}. ${String(row.name).trim()}`;
        await client.execute({
          sql: "UPDATE subject_options SET name = ? WHERE id = ?",
          args: [name, row.id],
        });
      }
    }
  }
}

export async function getDb(): Promise<Db> {
  ensureAppDirs();

  if (!globalForDb.bibliotekaClient) {
    globalForDb.bibliotekaClient = createClient({
      url: `file:${getDbPath()}`,
    });
  }
  if (!globalForDb.bibliotekaDb) {
    globalForDb.bibliotekaDb = drizzle(globalForDb.bibliotekaClient, {
      schema,
    });
  }

  // Migracje idempotentne — zawsze, żeby HMR / nowa kolumna nie ominęła ALTER
  await migrate(globalForDb.bibliotekaClient);

  const rows = await globalForDb.bibliotekaDb
    .select()
    .from(schema.settings)
    .all();
  if (rows.length === 0) {
    await globalForDb.bibliotekaDb
      .insert(schema.settings)
      .values({ defaultLoanDays: 21, labelCols: 2, labelRows: 5 });
  }

  return globalForDb.bibliotekaDb;
}

export async function getSettings() {
  const database = await getDb();
  const rows = await database.select().from(schema.settings).all();
  return (
    rows[0] ?? {
      id: 1,
      defaultLoanDays: 21,
      labelCols: 2,
      labelRows: 5,
    }
  );
}

export async function updateSettings(values: {
  defaultLoanDays?: number;
  labelCols?: number;
  labelRows?: number;
}) {
  const database = await getDb();
  const current = await getSettings();
  await database
    .update(schema.settings)
    .set(values)
    .where(eq(schema.settings.id, current.id));
  return getSettings();
}

export { schema };
