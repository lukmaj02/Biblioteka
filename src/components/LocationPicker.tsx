"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import type { Bookcase } from "@/lib/db/schema";
import { formatShelfSlot } from "@/lib/bookcase-codes";
import {
  createBookcase,
  deleteBookcase,
  listBookcases,
  rotateBookcase,
  updateBookcasePosition,
} from "@/lib/actions/bookcases";

type Mode = "select" | "add" | "move" | "rotate" | "delete";

type Props = {
  open: boolean;
  currentLocation?: string;
  onClose: () => void;
  onAssign: (location: string) => void;
};

export function LocationPicker({
  open,
  currentLocation,
  onClose,
  onAssign,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [cases, setCases] = useState<Bookcase[]>([]);
  const [mode, setMode] = useState<Mode>("select");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const reload = useCallback(() => {
    startTransition(async () => {
      const rows = await listBookcases();
      setCases(rows);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode("select");
    setPreviewId(null);
    setMessage(null);
    reload();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, reload]);

  if (!open || !mounted) return null;

  const preview = cases.find((c) => c.id === previewId) ?? null;

  function pctFromEvent(e: React.MouseEvent | React.PointerEvent) {
    const el = floorRef.current;
    if (!el) return { x: 10, y: 10 };
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.min(85, Math.max(0, x)),
      y: Math.min(85, Math.max(0, y)),
    };
  }

  function onFloorClick(e: React.MouseEvent) {
    if (mode !== "add") return;
    if ((e.target as HTMLElement).closest("[data-bookcase]")) return;

    const { x, y } = pctFromEvent(e);
    const raw = window.prompt("Podaj liczbę półek w regale:", "4");
    if (raw === null) return;
    const shelfCount = Number(raw);
    if (!Number.isFinite(shelfCount) || shelfCount < 1) {
      setMessage("Podaj poprawną liczbę półek (min. 1).");
      return;
    }

    startTransition(async () => {
      await createBookcase({ xPct: x, yPct: y, shelfCount });
      setMessage(null);
      setMode("select");
      reload();
    });
  }

  function onCaseClick(bc: Bookcase, e: React.MouseEvent) {
    e.stopPropagation();
    if (mode === "delete") {
      if (!confirm(`Usunąć regał ${bc.code}?`)) return;
      startTransition(async () => {
        await deleteBookcase(bc.id);
        if (previewId === bc.id) setPreviewId(null);
        reload();
      });
      return;
    }
    if (mode === "rotate") {
      startTransition(async () => {
        await rotateBookcase(bc.id);
        setPreviewId(bc.id);
        reload();
      });
      return;
    }
    if (mode === "move") return;
    setPreviewId(bc.id);
    setMessage(null);
  }

  function rotatePreview() {
    if (!preview) return;
    startTransition(async () => {
      await rotateBookcase(preview.id);
      reload();
    });
  }

  function onCasePointerDown(bc: Bookcase, e: React.PointerEvent) {
    if (mode !== "move") return;
    e.preventDefault();
    e.stopPropagation();
    setDragId(bc.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onFloorPointerMove(e: React.PointerEvent) {
    if (mode !== "move" || dragId === null) return;
    const { x, y } = pctFromEvent(e);
    setCases((prev) =>
      prev.map((c) =>
        c.id === dragId ? { ...c, xPct: Math.round(x), yPct: Math.round(y) } : c
      )
    );
  }

  function onFloorPointerUp() {
    if (mode !== "move" || dragId === null) return;
    const bc = cases.find((c) => c.id === dragId);
    const id = dragId;
    setDragId(null);
    if (!bc) return;
    startTransition(async () => {
      await updateBookcasePosition(id, bc.xPct, bc.yPct);
      reload();
    });
  }

  function pickShelf(shelfIndex: number) {
    if (!preview) return;
    const loc = formatShelfSlot(preview.code, shelfIndex);
    onAssign(loc);
    onClose();
  }

  const ui = (
    <div
      className="fixed inset-0 z-[9999] flex bg-[rgba(28,26,22,0.6)]"
      role="dialog"
      aria-modal="true"
      aria-label="Plan regałów"
    >
      <div
        className="m-auto flex flex-col overflow-hidden rounded-md border border-[var(--line)] bg-paper shadow-[var(--shadow)]"
        style={{
          width: "calc(100vw - 16px)",
          height: "calc(100vh - 16px)",
          maxWidth: "100vw",
          maxHeight: "100vh",
        }}
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-ink px-4 py-3 text-paper">
          <div>
            <h2 className="text-base font-semibold tracking-wide">
              Lokalizacja — plan regałów
            </h2>
            <p className="text-xs opacity-80">
              {currentLocation
                ? `Aktualnie: ${currentLocation}`
                : "Wybierz regał, potem półkę (np. A1.01)"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost text-paper"
            onClick={onClose}
          >
            Zamknij
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap gap-2 border-b border-[var(--line)] bg-paper-deep/50 px-3 py-2">
          {(
            [
              ["select", "Wybierz"],
              ["add", "Dodaj"],
              ["move", "Przenieś"],
              ["rotate", "Obróć"],
              ["delete", "Usuń"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              className={`btn py-1.5 text-xs ${
                mode === m ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => {
                setMode(m);
                if (m !== "select") setPreviewId(null);
                setMessage(
                  m === "add"
                    ? "Kliknij na planie, aby umieścić regał."
                    : m === "move"
                      ? "Przeciągnij regał w nowe miejsce."
                      : m === "rotate"
                        ? "Kliknij regał, aby obrócić go o 90°."
                        : m === "delete"
                          ? "Kliknij regał, aby go usunąć."
                          : null
                );
              }}
            >
              {label}
            </button>
          ))}
          {pending && (
            <span className="self-center text-xs text-muted">Zapisywanie…</span>
          )}
        </div>

        {message && (
          <p className="shrink-0 border-b border-[var(--line)] bg-[rgba(176,141,62,0.12)] px-4 py-2 text-sm text-ink">
            {message}
          </p>
        )}

        <div
          className="grid min-h-0 flex-1 overflow-hidden"
          style={{ gridTemplateColumns: "1fr 220px" }}
        >
          <div className="min-h-0 min-w-0 p-3" style={{ height: "100%" }}>
            <div
              ref={floorRef}
              className={`relative h-full w-full overflow-hidden rounded-md border border-dashed border-[var(--line)] bg-[linear-gradient(160deg,#f7f1e7,#ebe1d0)] ${
                mode === "add" ? "cursor-crosshair" : ""
              }`}
              style={{ minHeight: "100%" }}
              onClick={onFloorClick}
              onPointerMove={onFloorPointerMove}
              onPointerUp={onFloorPointerUp}
              onPointerLeave={onFloorPointerUp}
            >
              <p className="pointer-events-none absolute left-3 top-3 z-10 text-xs uppercase tracking-wide text-muted">
                Plan pomieszczenia
              </p>
              {cases.map((bc) => {
                const rotated = bc.rotation === 90;
                return (
                  <button
                    key={bc.id}
                    type="button"
                    data-bookcase
                    onClick={(e) => onCaseClick(bc, e)}
                    onPointerDown={(e) => onCasePointerDown(bc, e)}
                    className={`absolute box-border flex flex-row items-center justify-center gap-2 overflow-hidden border-2 font-semibold shadow-md transition ${
                      previewId === bc.id
                        ? "border-brass bg-ink text-paper"
                        : "border-ink/60 bg-[rgba(47,59,42,0.9)] text-paper hover:border-brass"
                    } ${
                      mode === "move"
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-pointer"
                    }`}
                    style={{
                      left: `${bc.xPct}%`,
                      top: `${bc.yPct}%`,
                      width: `${bc.wPct}%`,
                      height: `${bc.hPct}%`,
                      padding: "4px",
                      transform: rotated ? "rotate(90deg)" : undefined,
                      transformOrigin: "center center",
                    }}
                    title={`${bc.code} · ${bc.shelfCount} półek${rotated ? " · 90°" : ""}`}
                  >
                    <span className="max-w-full truncate text-sm leading-none">
                      {bc.code}
                    </span>
                    <span className="max-w-full truncate text-[11px] font-normal leading-none opacity-85">
                      {bc.shelfCount} pół.
                    </span>
                  </button>
                );
              })}
              {cases.length === 0 && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-base text-muted">
                  Brak regałów — wybierz „Dodaj” i kliknij na planie.
                </p>
              )}
            </div>
          </div>

          <aside className="min-h-0 overflow-auto border-l border-[var(--line)] bg-[rgba(255,252,246,0.95)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Półki
            </h3>
            {!preview ? (
              <p className="text-sm text-muted">
                Kliknij regał na planie, aby zobaczyć półki i wybrać lokalizację.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-base font-semibold text-ink">
                  Regał {preview.code}
                </p>
                <button
                  type="button"
                  className="btn btn-ghost w-full py-2 text-xs"
                  disabled={pending}
                  onClick={rotatePreview}
                >
                  Obróć o 90°
                </button>
                <ul className="space-y-1.5">
                  {Array.from({ length: preview.shelfCount }, (_, i) => {
                    const slot = formatShelfSlot(preview.code, i + 1);
                    const active = currentLocation === slot;
                    return (
                      <li key={slot}>
                        <button
                          type="button"
                          className={`w-full rounded border px-3 py-2 text-left text-sm tabular-nums ${
                            active
                              ? "border-brass bg-ink text-paper"
                              : "border-[var(--line)] bg-paper hover:border-brass"
                          }`}
                          onClick={() => pickShelf(i + 1)}
                        >
                          {slot}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
