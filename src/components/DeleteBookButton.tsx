"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBook } from "@/lib/actions/books";

export function DeleteBookButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        className="btn btn-danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("Na pewno usunąć tę książkę?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteBook(id);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.push("/ksiegozbior");
            router.refresh();
          });
        }}
      >
        {pending ? "Usuwam…" : "Usuń"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
