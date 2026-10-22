"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { returnLoan } from "@/lib/actions/loans";

export function ReturnButton({ loanId }: { loanId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost py-1.5 text-sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await returnLoan(loanId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Zwróć"}
    </button>
  );
}
