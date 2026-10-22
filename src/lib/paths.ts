import fs from "fs";
import path from "path";

/**
 * Katalog danych aplikacji.
 * W aplikacji desktopowej: BIBLIOTEKA_DATA_DIR (np. ~/Library/Application Support/Biblioteka/data).
 * W trybie web/dev: ./data w katalogu projektu.
 */
export function getDataDir(): string {
  const fromEnv = process.env.BIBLIOTEKA_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(/*turbopackIgnore: true*/ fromEnv);
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

export function getDbPath(): string {
  return path.join(getDataDir(), "biblioteka.db");
}

/** Okładki — zapisywane poza bundlem (zapisywalny katalog użytkownika). */
export function getCoversDir(): string {
  return path.join(getDataDir(), "covers");
}

/** Stary katalog z wersji webowej — tylko do odczytu przy migracji. */
export function getLegacyCoversDir(): string {
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "uploads",
    "covers"
  );
}

export function ensureAppDirs() {
  for (const dir of [getDataDir(), getCoversDir()]) {
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
  }
}
