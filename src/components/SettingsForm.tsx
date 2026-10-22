"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Settings } from "@/lib/db/schema";

type Props = {
  settings: Settings;
  action: (formData: FormData) => Promise<{ settings: Settings }>;
};

export function SettingsForm({ settings, action }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Zachowaj dotychczasowy układ etykiet w bazie
    formData.set("labelCols", String(settings.labelCols));
    formData.set("labelRows", String(settings.labelRows));
    setSaved(false);
    startTransition(async () => {
      await action(formData);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-md border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-5 shadow-[var(--shadow)]"
    >
      <div className="field max-w-xs">
        <label htmlFor="defaultLoanDays">Domyślny termin wypożyczenia (dni)</label>
        <input
          id="defaultLoanDays"
          name="defaultLoanDays"
          type="number"
          min={1}
          max={365}
          defaultValue={settings.defaultLoanDays}
          required
        />
        <p className="mt-1 text-xs text-muted">
          Używany przy nowym wypożyczeniu, gdy nie podasz innego terminu.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Zapisuję…" : "Zapisz"}
        </button>
        {saved && <span className="text-sm text-ok">Zapisano</span>}
      </div>
    </form>
  );
}
