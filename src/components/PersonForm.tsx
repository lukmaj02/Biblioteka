"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Person } from "@/lib/db/schema";
import { createPerson, updatePerson } from "@/lib/actions/people";

type Props = {
  person?: Person;
  onDone?: () => void;
};

export function PersonForm({ person, onDone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = person
        ? await updatePerson(person.id, formData)
        : await createPerson(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
      if (!person) (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-4 shadow-[var(--shadow)]"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {person ? "Edytuj czytelnika" : "Nowy czytelnik"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field sm:col-span-2">
          <label htmlFor="readerNo">Numer czytelnika</label>
          <input
            id="readerNo"
            name="readerNo"
            defaultValue={person?.readerNo ?? ""}
            placeholder="auto"
          />
        </div>
        <div className="field">
          <label htmlFor="firstName">Imię</label>
          <input
            id="firstName"
            name="firstName"
            required
            defaultValue={person?.firstName}
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nazwisko</label>
          <input
            id="lastName"
            name="lastName"
            defaultValue={person?.lastName ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="birthDate">Data urodzenia</label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={person?.birthDate ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" defaultValue={person?.phone ?? ""} />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            defaultValue={person?.email ?? ""}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="address">Adres</label>
        <input id="address" name="address" defaultValue={person?.address ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="notes">Notatki</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={person?.notes ?? ""}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Zapisuję…" : person ? "Zapisz" : "Dodaj czytelnika"}
      </button>
    </form>
  );
}
