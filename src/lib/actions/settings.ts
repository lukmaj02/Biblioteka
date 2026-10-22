"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/db";

export async function loadSettings() {
  return getSettings();
}

export async function saveSettings(formData: FormData) {
  const defaultLoanDays = Math.max(
    1,
    Number(formData.get("defaultLoanDays") || 21)
  );
  const labelCols = Math.min(
    4,
    Math.max(1, Number(formData.get("labelCols") || 2))
  );
  const labelRows = Math.min(
    10,
    Math.max(1, Number(formData.get("labelRows") || 5))
  );

  const settings = await updateSettings({
    defaultLoanDays,
    labelCols,
    labelRows,
  });

  revalidatePath("/ustawienia");
  revalidatePath("/ustawienia/termin");
  revalidatePath("/etykiety");
  revalidatePath("/wypozyczenia");
  return { settings };
}
