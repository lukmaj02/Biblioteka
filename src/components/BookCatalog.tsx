"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/db/schema";
import { bookConditions, bookStatuses } from "@/lib/db/schema";
import { conditionLabels, statusLabels } from "@/lib/labels";
import { BookCover } from "./BookCover";

type Props = {
  books: Book[];
  locations: string[];
  initialQ?: string;
  initialCondition?: string;
  initialStatus?: string;
  initialLocation?: string;
};

export function BookCatalog({
  books,
  locations,
  initialQ = "",
  initialCondition = "",
  initialStatus = "",
  initialLocation = "",
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [q, setQ] = useState(initialQ);
  const [condition, setCondition] = useState(initialCondition);
  const [status, setStatus] = useState(initialStatus);
  const [location, setLocation] = useState(initialLocation);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (condition) params.set("condition", condition);
    if (status) params.set("status", status);
    if (location) params.set("location", location);
    router.push(`/ksiegozbior?${params.toString()}`);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === books.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(books.map((b) => b.id)));
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={applyFilters}
        className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[rgba(255,252,246,0.55)] p-4 md:flex-row md:flex-wrap md:items-end"
      >
        <div className="field min-w-[12rem] flex-1">
          <label htmlFor="q">Szukaj</label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tytuł, autor, ISBN…"
          />
        </div>
        <div className="field w-full md:w-40">
          <label htmlFor="condition">Stan</label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {bookConditions.map((c) => (
              <option key={c} value={c}>
                {conditionLabels[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field w-full md:w-44">
          <label htmlFor="status">Dostępność</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {bookStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field w-full md:w-48">
          <label htmlFor="location">Lokalizacja</label>
          <select
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filtruj
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={books.length > 0 && selected.size === books.length}
              onChange={toggleAll}
            />
            Zaznacz ({selected.size})
          </label>
        </div>
        <div className="flex gap-1 rounded-md border border-[var(--line)] p-1">
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${view === "grid" ? "bg-ink text-paper" : ""}`}
            onClick={() => setView("grid")}
          >
            Siatka
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${view === "list" ? "bg-ink text-paper" : ""}`}
            onClick={() => setView("list")}
          >
            Lista
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <p className="py-12 text-center text-muted">
          Brak książek.{" "}
          <Link href="/ksiegozbior/nowa" className="text-brass-deep underline">
            Dodaj pierwszą
          </Link>
        </p>
      ) : view === "grid" ? (
        <ul className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {books.map((book) => (
            <li key={book.id} className="relative">
              <label className="absolute left-2 top-2 z-10">
                <input
                  type="checkbox"
                  checked={selected.has(book.id)}
                  onChange={() => toggle(book.id)}
                  className="h-4 w-4"
                />
              </label>
              <Link
                href={`/ksiegozbior/${book.id}`}
                className="flex flex-col gap-2"
              >
                <div className="cover-hover relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[linear-gradient(145deg,#3d4a36,#2a3324)] shadow-[var(--shadow)]">
                  {book.coverPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverPath}
                      alt={`Okładka: ${book.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-end p-3">
                      <p className="font-display text-xs text-paper line-clamp-4">
                        {book.title}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-base leading-snug line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted line-clamp-1">
                    {book.authors || "—"}
                  </p>
                  <span
                    className={`badge mt-1 ${book.status === "dostepna" ? "badge-ok" : "badge-warn"}`}
                  >
                    {statusLabels[book.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="stagger divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[rgba(255,252,246,0.55)]">
          {books.map((book) => (
            <li
              key={book.id}
              className="flex items-center gap-3 px-3 py-3 md:gap-4 md:px-4"
            >
              <input
                type="checkbox"
                checked={selected.has(book.id)}
                onChange={() => toggle(book.id)}
              />
              <BookCover src={book.coverPath} title={book.title} size="sm" />
              <Link href={`/ksiegozbior/${book.id}`} className="min-w-0 flex-1">
                <h3 className="font-display text-lg leading-tight truncate">
                  {book.title}
                </h3>
                <p className="text-sm text-muted truncate">
                  {book.authors || "—"}
                  {book.location ? ` · ${book.location}` : ""}
                </p>
              </Link>
              <span
                className={`badge shrink-0 ${book.status === "dostepna" ? "badge-ok" : "badge-warn"}`}
              >
                {statusLabels[book.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
