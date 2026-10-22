"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Book } from "@/lib/db/schema";
import { bookConditions } from "@/lib/db/schema";
import { conditionLabels } from "@/lib/labels";
import {
  createBook,
  deleteBook,
  getNextInventoryNo,
  setBookLabelMarked,
  setBookLocation,
  updateBook,
} from "@/lib/actions/books";
import { BookCover } from "./BookCover";
import { LocationPicker } from "./LocationPicker";

type Props = {
  book?: Book;
  subjects?: string[];
  locations?: string[];
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Kod tematyki z prefiksu „A. nazwa” → „A” */
function subjectCode(subject: string): string | null {
  const m = subject.trim().match(/^([A-Z]+)\./);
  return m?.[1] ?? null;
}

/** UKD = kod tematyki: kod lokalizacji (np. A: A1.01) */
function buildUdc(subject: string, location: string): string {
  const code = subjectCode(subject);
  const loc = location.trim();
  if (code && loc) return `${code}: ${loc}`;
  return "";
}

export function BookForm({ book, subjects = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  /** Nowa książka od razu w trybie edycji; istniejąca — najpierw podgląd */
  const [editing, setEditing] = useState(!book);
  const [fields, setFields] = useState({
    signature: book?.signature ?? "",
    inventoryNo: book?.inventoryNo ?? (book ? String(book.id) : ""),
    title: book?.title ?? "",
    authors: book?.authors ?? "",
    isbn: book?.isbn ?? "",
    keywords: book?.keywords ?? "",
    publishedAt: book?.publishedAt ?? "",
    volume: book?.volume ?? "",
    value: book?.value ?? "",
    publisher: book?.publisher ?? "",
    edition: book?.edition ?? "",
    condition: book?.condition ?? "dobry",
    description: book?.description ?? "",
    subject: book?.subject ?? "",
    location: book?.location ?? "",
    publicationType: book?.publicationType ?? "Książka",
    acquiredAt: book?.acquiredAt ?? (book ? "" : todayDate()),
    udc: book?.udc ?? "",
    coverPath: book?.coverPath ?? "",
    labelMarked: Boolean(book?.labelMarked),
  });

  const snapshot = book
    ? {
        signature: book.signature ?? "",
        inventoryNo: book.inventoryNo ?? String(book.id),
        title: book.title ?? "",
        authors: book.authors ?? "",
        isbn: book.isbn ?? "",
        keywords: book.keywords ?? "",
        publishedAt: book.publishedAt ?? "",
        volume: book.volume ?? "",
        value: book.value ?? "",
        publisher: book.publisher ?? "",
        edition: book.edition ?? "",
        condition: book.condition ?? "dobry",
        description: book.description ?? "",
        subject: book.subject ?? "",
        location: book.location ?? "",
        publicationType: book.publicationType ?? "Książka",
        acquiredAt: book.acquiredAt ?? "",
        udc: book.udc ?? "",
        coverPath: book.coverPath ?? "",
        labelMarked: Boolean(book.labelMarked),
      }
    : null;

  /** Lewa kolumna (dane publikacji) — tylko do odczytu poza trybem edycji */
  const leftLocked = Boolean(book) && !editing;

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function setSubject(subject: string) {
    setFields((f) => ({
      ...f,
      subject,
      udc: buildUdc(subject, f.location),
    }));
  }

  function setLocation(location: string) {
    setFields((f) => ({
      ...f,
      location,
      udc: buildUdc(f.subject, location),
    }));
  }

  async function fetchIsbn() {
    const isbn = fields.isbn.trim();
    if (!isbn) {
      setError("Podaj numer ISBN");
      return;
    }
    setError(null);
    setIsbnLoading(true);
    try {
      const res = await fetch(`/api/isbn/${encodeURIComponent(isbn)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nie udało się pobrać danych");
        return;
      }
      setFields((f) => ({
        ...f,
        title: data.title || f.title,
        authors: data.authors || f.authors,
        isbn: data.isbn || f.isbn,
        publishedAt: data.publishedAt || f.publishedAt,
        edition: data.edition || f.edition,
        description: data.description || f.description,
        coverPath: data.coverPath || f.coverPath,
        publisher: data.publisher || f.publisher,
      }));
    } catch {
      setError("Błąd połączenia przy pobieraniu ISBN");
    } finally {
      setIsbnLoading(false);
    }
  }

  async function createInventoryNo() {
    setInventoryLoading(true);
    setError(null);
    try {
      const next = await getNextInventoryNo();
      setFields((f) => ({
        ...f,
        inventoryNo: next,
        signature: next,
      }));
    } catch {
      setError("Nie udało się wygenerować numeru inwentarzowego");
    } finally {
      setInventoryLoading(false);
    }
  }

  function startEdit() {
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    if (snapshot) setFields(snapshot);
    setEditing(false);
    setError(null);
  }

  function toggleLabelMarked() {
    const next = !fields.labelMarked;
    set("labelMarked", next);
    // W podglądzie zapis od razu; w edycji — razem z formularzem
    if (!book || editing) return;
    startTransition(async () => {
      await setBookLabelMarked(book.id, next);
      router.refresh();
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (book && !editing) return;
    const formData = new FormData(e.currentTarget);
    formData.set("coverPath", fields.coverPath);
    formData.set("labelMarked", fields.labelMarked ? "1" : "0");
    setError(null);
    startTransition(async () => {
      const result = book
        ? await updateBook(book.id, formData)
        : await createBook(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (book) {
        setEditing(false);
        router.refresh();
      } else {
        router.push("/ksiegozbior");
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!book) return;
    if (!confirm("Usunąć tę książkę?")) return;
    startTransition(async () => {
      const result = await deleteBook(book.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/ksiegozbior");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full min-h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.88)] shadow-[var(--shadow)]"
    >
      <header className="border-b border-[var(--line)] bg-ink px-4 py-2.5 text-paper">
        <h1 className="text-sm font-semibold tracking-wide">Książka</h1>
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-2">
        <section
          className={`space-y-3 border-b border-[var(--line)] p-4 lg:border-b-0 lg:border-r ${
            leftLocked ? "[&_input]:bg-paper-deep/40 [&_textarea]:bg-paper-deep/40" : ""
          }`}
        >
          <h2 className="border-b border-[var(--line)] pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Dane publikacji
            {leftLocked && (
              <span className="ml-2 font-normal normal-case tracking-normal">
                (podgląd)
              </span>
            )}
          </h2>

          <input type="hidden" name="signature" value={fields.inventoryNo} />
          <input
            type="hidden"
            name="labelMarked"
            value={fields.labelMarked ? "1" : "0"}
          />

          <div className="flex items-start gap-4">
            <div className="flex shrink-0 flex-col items-start gap-2">
              <BookCover
                src={fields.coverPath || null}
                title={fields.title || "Bez tytułu"}
                size="lg"
              />
              {!leftLocked && (
                <div className="field w-full max-w-[9rem]">
                  <label htmlFor="cover">Okładka</label>
                  <input id="cover" name="cover" type="file" accept="image/*" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="field">
                <label htmlFor="inventoryNo">Sygnatura</label>
                <div className="flex gap-2">
                  <input
                    id="inventoryNo"
                    name="inventoryNo"
                    value={fields.inventoryNo}
                    readOnly={leftLocked}
                    onChange={(e) => {
                      set("inventoryNo", e.target.value);
                      set("signature", e.target.value);
                    }}
                  />
                  {!leftLocked && (
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0"
                      onClick={createInventoryNo}
                      disabled={inventoryLoading}
                    >
                      {inventoryLoading ? "…" : "Utwórz"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="authors">Autor</label>
            <input
              id="authors"
              name="authors"
              value={fields.authors}
              readOnly={leftLocked}
              onChange={(e) => set("authors", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="title">Tytuł</label>
            <textarea
              id="title"
              name="title"
              required
              rows={3}
              value={fields.title}
              readOnly={leftLocked}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="description">Opis woluminu</label>
            <textarea
              id="description"
              name="description"
              rows={2}
              value={fields.description}
              readOnly={leftLocked}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="isbn">ISBN / ISSN</label>
            <div className="flex gap-2">
              <input
                id="isbn"
                name="isbn"
                value={fields.isbn}
                readOnly={leftLocked}
                onChange={(e) => set("isbn", e.target.value)}
              />
              {!leftLocked && (
                <button
                  type="button"
                  className="btn btn-brass shrink-0"
                  onClick={fetchIsbn}
                  disabled={isbnLoading}
                >
                  {isbnLoading ? "…" : "Wyszukaj"}
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="keywords">Słowa kluczowe</label>
            <input
              id="keywords"
              name="keywords"
              value={fields.keywords}
              readOnly={leftLocked}
              onChange={(e) => set("keywords", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="publishedAt">Rok wydania</label>
              <input
                id="publishedAt"
                name="publishedAt"
                value={fields.publishedAt}
                readOnly={leftLocked}
                onChange={(e) => set("publishedAt", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="volume">Tom</label>
              <input
                id="volume"
                name="volume"
                value={fields.volume}
                readOnly={leftLocked}
                onChange={(e) => set("volume", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="value">Wartość</label>
              <input
                id="value"
                name="value"
                value={fields.value}
                readOnly={leftLocked}
                onChange={(e) => set("value", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="edition">Wydanie</label>
              <input
                id="edition"
                name="edition"
                value={fields.edition}
                readOnly={leftLocked}
                onChange={(e) => set("edition", e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="publisher">Wydawca</label>
            <input
              id="publisher"
              name="publisher"
              value={fields.publisher}
              readOnly={leftLocked}
              onChange={(e) => set("publisher", e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-3 p-4">
          <h2 className="border-b border-[var(--line)] pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Dane opisowe
          </h2>

          <div className="field">
            <label htmlFor="subject">Tematyka</label>
            <select
              id="subject"
              name="subject"
              value={fields.subject}
              disabled={leftLocked}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">— wybierz —</option>
              {fields.subject &&
                !subjects.includes(fields.subject) && (
                  <option value={fields.subject}>{fields.subject}</option>
                )}
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!leftLocked && subjects.length === 0 && (
              <p className="text-xs text-muted">
                Brak pozycji — dodaj je w{" "}
                <a href="/ustawienia/tematyka" className="underline">
                  Ustawienia → Tematyka
                </a>
                .
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="publicationType">Typ publikacji</label>
            <select
              id="publicationType"
              name="publicationType"
              value={fields.publicationType}
              disabled={leftLocked}
              onChange={(e) => set("publicationType", e.target.value)}
            >
              <option>Książka</option>
              <option>Czasopismo</option>
              <option>Podręcznik</option>
              <option>Druk</option>
              <option>Inne</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="condition">Stan</label>
            <select
              id="condition"
              name="condition"
              value={fields.condition}
              disabled={leftLocked}
              onChange={(e) =>
                set("condition", e.target.value as typeof fields.condition)
              }
            >
              {bookConditions.map((c) => (
                <option key={c} value={c}>
                  {conditionLabels[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="acquiredAt">Data dodania</label>
            <input
              id="acquiredAt"
              name="acquiredAt"
              type="date"
              value={fields.acquiredAt}
              readOnly={leftLocked}
              onChange={(e) => set("acquiredAt", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="udc">Symbol UKD</label>
            <input
              id="udc"
              name="udc"
              value={fields.udc}
              readOnly
              title="Uzupełniane automatycznie: kod tematyki: kod lokalizacji"
            />
          </div>

          <div className="field">
            <label>Lokalizacja</label>
            <input type="hidden" name="location" value={fields.location} />
            <button
              type="button"
              className="flex w-full items-center gap-2 overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.9)] px-3 py-2.5 text-left text-sm"
              onClick={() => setLocationOpen(true)}
            >
              {fields.location ? (
                <>
                  <span className="min-w-0 truncate font-semibold tabular-nums text-ink">
                    {fields.location}
                  </span>
                  <span className="shrink-0 text-xs text-muted">· zmień</span>
                </>
              ) : (
                <span className="text-muted">Przypisz</span>
              )}
            </button>
          </div>

          <div className="field">
            <label>Etykieta</label>
            <label className="flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.9)] px-3 py-2.5 text-sm font-normal normal-case tracking-normal">
              <input
                type="checkbox"
                className="shrink-0"
                checked={fields.labelMarked}
                onChange={toggleLabelMarked}
              />
              <span className="min-w-0 truncate">
                {fields.labelMarked ? (
                  <span className="text-ok">oznaczona</span>
                ) : (
                  <span className="text-muted">brak</span>
                )}
              </span>
            </label>
          </div>
        </section>
      </div>

      <LocationPicker
        open={locationOpen}
        currentLocation={fields.location}
        onClose={() => setLocationOpen(false)}
        onAssign={(loc) => {
          const udc = buildUdc(fields.subject, loc);
          setLocation(loc);
          if (book && !editing) {
            startTransition(async () => {
              await setBookLocation(book.id, loc, udc);
              router.refresh();
            });
          }
        }}
      />

      {error && (
        <p className="border-t border-[var(--line)] px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] bg-paper-deep/50 px-3 py-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push("/ksiegozbior/nowa")}
        >
          Nowy egzemplarz
        </button>
        {book && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDelete}
            disabled={pending}
          >
            Usuń
          </button>
        )}
        {book && !editing && (
          <button type="button" className="btn btn-primary" onClick={startEdit}>
            Edytuj
          </button>
        )}
        {editing && (
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Zapisuję…" : book ? "Uaktualnij" : "Zapisz"}
          </button>
        )}
        {book && editing && (
          <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
            Anuluj edycję
          </button>
        )}
        {book && (
          <a
            href={`/etykiety?ids=${book.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-brass"
          >
            Generuj etykietę
          </a>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push("/ksiegozbior")}
        >
          Zakończ
        </button>
        <p className="ml-auto text-xs text-muted">
          {!book
            ? "Dodaj nową książkę do systemu"
            : editing
              ? `Edycja pozycji #${book.id}`
              : `Podgląd pozycji #${book.id}`}
        </p>
      </footer>
    </form>
  );
}
