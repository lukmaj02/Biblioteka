import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const bookConditions = ["nowa", "dobry", "zuzyta", "uszkodzona"] as const;
export type BookCondition = (typeof bookConditions)[number];

export const bookStatuses = ["dostepna", "wypozyczona", "zarezerwowana"] as const;
export type BookStatus = (typeof bookStatuses)[number];

export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  signature: text("signature"),
  inventoryNo: text("inventory_no"),
  title: text("title").notNull(),
  authors: text("authors").notNull().default(""),
  isbn: text("isbn"),
  keywords: text("keywords"),
  publishedAt: text("published_at"),
  volume: text("volume"),
  value: text("value"),
  publisher: text("publisher"),
  edition: text("edition"),
  condition: text("condition").notNull().default("dobry").$type<BookCondition>(),
  coverPath: text("cover_path"),
  description: text("description"),
  subject: text("subject"),
  location: text("location"),
  publicationType: text("publication_type").default("Książka"),
  acquiredAt: text("acquired_at"),
  udc: text("udc"),
  /** 1 = etykieta wydrukowana / oznaczona ręcznie */
  labelMarked: integer("label_marked").notNull().default(0),
  status: text("status").notNull().default("dostepna").$type<BookStatus>(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  readerNo: text("reader_no"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: text("birth_date"),
  document: text("document"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id),
  personId: integer("person_id")
    .notNull()
    .references(() => people.id),
  borrowedAt: text("borrowed_at").notNull(),
  dueAt: text("due_at").notNull(),
  returnedAt: text("returned_at"),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  defaultLoanDays: integer("default_loan_days").notNull().default(21),
  labelCols: integer("label_cols").notNull().default(2),
  labelRows: integer("label_rows").notNull().default(5),
});

/** Słownik tematyk — pozycje wybierane w formularzu książki */
export const subjectOptions = sqliteTable("subject_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

/** Regały na planie pomieszczenia (pozycja w %, kod A1/B1, liczba półek) */
export const bookcases = sqliteTable("bookcases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  xPct: integer("x_pct").notNull().default(10),
  yPct: integer("y_pct").notNull().default(10),
  wPct: integer("w_pct").notNull().default(28),
  hPct: integer("h_pct").notNull().default(12),
  shelfCount: integer("shelf_count").notNull().default(4),
  /** 0 lub 90 — obrót wizualny bez zmiany proporcji w/h */
  rotation: integer("rotation").notNull().default(0),
});

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type SubjectOption = typeof subjectOptions.$inferSelect;
export type Bookcase = typeof bookcases.$inferSelect;
