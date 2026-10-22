import { getSettings } from "@/lib/db";
import { saveSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function TerminZwrotuPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-ink">Termin zwrotu</h1>
        <p className="mt-1 text-sm text-muted">
          Domyślna liczba dni wypożyczenia.
        </p>
      </header>
      <SettingsForm settings={settings} action={saveSettings} />
    </div>
  );
}
