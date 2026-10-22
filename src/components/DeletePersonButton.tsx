"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePerson } from "@/lib/actions/people";

export function DeletePersonButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-danger py-1.5 text-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Usunąć tę osobę?")) return;
        startTransition(async () => {
          const result = await deletePerson(id);
          if (result.error) {
            alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      Usuń
    </button>
  );
}
