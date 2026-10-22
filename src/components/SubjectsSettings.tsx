"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SubjectOption } from "@/lib/db/schema";
import {
  createSubjectOption,
  deleteSubjectOption,
} from "@/lib/actions/subjects";

type Props = {
  subjects: SubjectOption[];
};

export function SubjectsSettings({ subjects }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await createSubjectOption(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function onDelete(id: number) {
    if (!confirm("Usunąć tę tematykę ze słownika?")) return;
    startTransition(async () => {
      await deleteSubjectOption(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={onAdd}
        className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-4 shadow-[var(--shadow)]"
      >
        <div className="field min-w-[12rem] flex-1">
          <label htmlFor="name">Nowa tematyka</label>
          <input
            id="name"
            name="name"
            required
            placeholder="np. Medycyna — litera A./B./C. doda się sama"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "…" : "Dodaj"}
        </button>
      </form>

      <p className="text-xs text-muted">
        Każda grupa dostaje kolejną literę: <strong>A. nazwa</strong>,{" "}
        <strong>B. nazwa</strong>, …
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.65)]">
        {subjects.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted">
            Brak pozycji. Dodaj pierwszą tematykę powyżej.
          </li>
        ) : (
          subjects.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="font-medium tabular-nums">{s.name}</span>
              <button
                type="button"
                className="btn btn-ghost py-1 text-xs text-danger"
                disabled={pending}
                onClick={() => onDelete(s.id)}
              >
                Usuń
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}