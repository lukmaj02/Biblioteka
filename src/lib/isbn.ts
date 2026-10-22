import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { ensureAppDirs, getCoversDir } from "@/lib/paths";

export type IsbnLookupResult = {
  title: string;
  authors: string;
  isbn: string;
  publishedAt: string | null;
  edition: string | null;
  publisher: string | null;
  description: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  source: "openlibrary" | "google" | "bn";
};

type PartialLookup = Partial<IsbnLookupResult> & { title?: string };

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, "").toUpperCase();
}

function isValidIsbn(isbn: string): boolean {
  return /^\d{13}$/.test(isbn) || /^\d{10}$/.test(isbn) || /^\d{9}X$/.test(isbn);
}

function isbn13to10(isbn13: string): string | null {
  if (!/^97[89]\d{10}$/.test(isbn13)) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const rem = 11 - (sum % 11);
  const check = rem === 10 ? "X" : rem === 11 ? "0" : String(rem);
  return core + check;
}

function isbn10to13(isbn10: string): string | null {
  if (!/^(\d{9}[\dX])$/.test(isbn10)) return null;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}

function isbnVariants(isbn: string): string[] {
  const variants = new Set<string>([isbn]);
  if (isbn.length === 13) {
    const t = isbn13to10(isbn);
    if (t) variants.add(t);
  } else if (isbn.length === 10) {
    const t = isbn10to13(isbn);
    if (t) variants.add(t);
  }
  return [...variants];
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*$/, "")
    .replace(/[,;]\s*$/, "")
    .trim();
  return cleaned || null;
}

function cleanPublisher(value: string | null | undefined): string | null {
  if (!value) return null;
  let cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^\[|\]$/g, "")
    .replace(/\s*[,;:]\s*$/, "")
    .trim();
  // BN sometimes duplicates the short name: "Wydawnictwo Lekarskie PZWL PZWL"
  const words = cleaned.split(" ");
  if (
    words.length >= 2 &&
    words[words.length - 1] === words[words.length - 2]
  ) {
    cleaned = words.slice(0, -1).join(" ");
  }
  return cleaned || null;
}

function marcSubfield(
  fields: Record<string, unknown>[] | undefined,
  tag: string,
  code: string
): string | null {
  if (!fields) return null;
  for (const field of fields) {
    const entry = field[tag] as
      | { subfields?: { [k: string]: string }[] }
      | undefined;
    if (!entry?.subfields) continue;
    for (const sf of entry.subfields) {
      if (sf[code]) return String(sf[code]);
    }
  }
  return null;
}

function marcAllSubfields(
  fields: Record<string, unknown>[] | undefined,
  tags: string[],
  code: string
): string[] {
  if (!fields) return [];
  const out: string[] = [];
  for (const field of fields) {
    for (const tag of tags) {
      const entry = field[tag] as
        | { subfields?: { [k: string]: string }[] }
        | undefined;
      if (!entry?.subfields) continue;
      for (const sf of entry.subfields) {
        if (sf[code]) out.push(String(sf[code]).replace(/\s*,\s*$/, "").trim());
      }
    }
  }
  return out.filter(Boolean);
}

async function downloadCover(
  url: string,
  isbn: string
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BibliotekaDomowa/1.0; +https://localhost)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      return null;
    }

    const bytes = Buffer.from(await res.arrayBuffer());

    // OL placeholder GIF ≈ 43 bytes; 1×1 stubs; reject tiny / empty
    if (bytes.length < 2500) return null;
    if (contentType.includes("gif") && bytes.length < 8000) return null;

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const hash = createHash("md5").update(isbn + url).digest("hex").slice(0, 8);
    const filename = `${isbn}-${hash}.${ext}`;
    ensureAppDirs();
    const dir = getCoversDir();
    fs.writeFileSync(path.join(dir, filename), bytes);
    return `/uploads/covers/${filename}`;
  } catch {
    return null;
  }
}

function googleCoverUrls(isbn: string): string[] {
  // zoom=1 often sharper than zoom=2 for Polish titles
  return [1, 0, 2].map(
    (zoom) =>
      `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=${zoom}`
  );
}

function amazonCoverUrls(isbn: string): string[] {
  const isbn10 =
    isbn.length === 10 ? isbn : isbn.length === 13 ? isbn13to10(isbn) : null;
  if (!isbn10) return [];
  return [
    `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`,
    `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`,
    `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01._SCLZZZZZZZ_.jpg`,
  ];
}

async function lookupOpenLibrary(isbn: string): Promise<PartialLookup | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      {
        headers: { "User-Agent": "BibliotekaDomowa/1.0" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as Record<
      string,
      {
        title?: string;
        authors?: { name: string }[];
        publish_date?: string;
        publishers?: { name: string }[];
        cover?: { large?: string; medium?: string; small?: string };
        notes?: string;
        excerpts?: { text: string }[];
      }
    >;

    const book = data[`ISBN:${isbn}`];
    if (!book?.title) return null;

    let description: string | null = null;
    let publisherFromDetail: string | null = null;
    try {
      const detailRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
        headers: { "User-Agent": "BibliotekaDomowa/1.0" },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      const ct = detailRes.headers.get("content-type") ?? "";
      if (detailRes.ok && ct.includes("json")) {
        const detail = (await detailRes.json()) as {
          description?: string | { value?: string };
          publishers?: string[];
        };
        if (typeof detail.description === "string") description = detail.description;
        else if (detail.description?.value) description = detail.description.value;
        if (detail.publishers?.[0]) publisherFromDetail = detail.publishers[0];
      }
    } catch {
      /* ignore */
    }

    if (!description && book.excerpts?.[0]?.text) description = book.excerpts[0].text;
    if (!description && book.notes) description = book.notes;

    const publisher =
      cleanPublisher(book.publishers?.[0]?.name) ||
      cleanPublisher(publisherFromDetail);

    return {
      title: cleanText(book.title) ?? book.title,
      authors: (book.authors ?? []).map((a) => a.name).join(", "),
      isbn,
      publishedAt: book.publish_date ?? null,
      edition: null,
      publisher,
      description: description ? description.slice(0, 800) : null,
      coverUrl:
        book.cover?.large ?? book.cover?.medium ?? book.cover?.small ?? null,
      source: "openlibrary",
    };
  } catch {
    return null;
  }
}

async function lookupBibliotekaNarodowa(
  isbn: string
): Promise<PartialLookup | null> {
  try {
    const res = await fetch(
      `https://data.bn.org.pl/api/institutions/bibs.json?isbnIssn=${encodeURIComponent(isbn)}&limit=5`,
      {
        headers: {
          "User-Agent": "BibliotekaDomowa/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      bibs?: {
        title?: string;
        author?: string;
        publisher?: string;
        publicationYear?: string;
        subject?: string;
        genre?: string;
        marc?: { fields?: Record<string, unknown>[] };
      }[];
    };

    const bib = data.bibs?.[0];
    if (!bib) return null;

    const fields = bib.marc?.fields;
    const title =
      cleanText(marcSubfield(fields, "245", "a")) ||
      cleanText(bib.title) ||
      null;
    if (!title) return null;

    const authorsFromMarc = marcAllSubfields(fields, ["100", "700"], "a");
    const authors =
      authorsFromMarc.join(", ") ||
      cleanText(bib.author?.replace(/\s*Wydawnictwo.*$/i, "")) ||
      "";

    const edition = cleanText(marcSubfield(fields, "250", "a"));
    const yearFromMarc =
      marcSubfield(fields, "260", "c") || marcSubfield(fields, "264", "c");
    const publishedAt =
      cleanText(bib.publicationYear) ||
      cleanText(yearFromMarc?.replace(/\.$/, "")) ||
      null;

    const publisher =
      cleanPublisher(marcSubfield(fields, "260", "b")) ||
      cleanPublisher(marcSubfield(fields, "264", "b")) ||
      cleanPublisher(bib.publisher);

    const descParts = [bib.genre, bib.subject].filter(Boolean);
    const description = descParts.length
      ? descParts.join(". ").slice(0, 800)
      : null;

    return {
      title,
      authors,
      isbn,
      publishedAt,
      edition,
      publisher,
      description,
      coverUrl: null,
      source: "bn",
    };
  } catch {
    return null;
  }
}

async function lookupGoogleBooks(isbn: string): Promise<PartialLookup | null> {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", `isbn:${isbn}`);
    if (key) url.searchParams.set("key", key);

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "BibliotekaDomowa/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429 || !res.ok) return null;

    const data = (await res.json()) as {
      items?: {
        volumeInfo?: {
          title?: string;
          authors?: string[];
          publisher?: string;
          publishedDate?: string;
          description?: string;
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
            medium?: string;
            large?: string;
            extraLarge?: string;
          };
        };
      }[];
      error?: unknown;
    };
    if (data.error) return null;

    const info = data.items?.[0]?.volumeInfo;
    if (!info?.title) return null;

    let coverUrl =
      info.imageLinks?.extraLarge ??
      info.imageLinks?.large ??
      info.imageLinks?.medium ??
      info.imageLinks?.thumbnail ??
      info.imageLinks?.smallThumbnail ??
      null;
    if (coverUrl) {
      coverUrl = coverUrl
        .replace("http://", "https://")
        .replace("&edge=curl", "")
        .replace("zoom=1", "zoom=2")
        .replace("zoom=5", "zoom=2");
    }

    return {
      title: info.title,
      authors: (info.authors ?? []).join(", "),
      isbn,
      publishedAt: info.publishedDate ?? null,
      edition: null,
      publisher: cleanPublisher(info.publisher),
      description: info.description ? info.description.slice(0, 800) : null,
      coverUrl,
      source: "google",
    };
  } catch {
    return null;
  }
}

function mergeLookups(
  primary: PartialLookup,
  extras: (PartialLookup | null)[]
): PartialLookup {
  const merged = { ...primary };
  for (const extra of extras) {
    if (!extra) continue;
    if (!merged.authors && extra.authors) merged.authors = extra.authors;
    if (!merged.publishedAt && extra.publishedAt) {
      merged.publishedAt = extra.publishedAt;
    }
    if (!merged.edition && extra.edition) merged.edition = extra.edition;
    if (!merged.publisher && extra.publisher) merged.publisher = extra.publisher;
    if (!merged.description && extra.description) {
      merged.description = extra.description;
    }
    if (!merged.coverUrl && extra.coverUrl) merged.coverUrl = extra.coverUrl;
  }
  return merged;
}

function uniqueUrls(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export async function lookupIsbn(
  rawIsbn: string
): Promise<IsbnLookupResult | null> {
  const isbn = normalizeIsbn(decodeURIComponent(rawIsbn));
  if (!isValidIsbn(isbn)) return null;

  const variants = isbnVariants(isbn);
  const preferredIsbn =
    variants.find((v) => v.length === 13) ?? variants[0] ?? isbn;

  let openLib: PartialLookup | null = null;
  for (const v of variants) {
    openLib = await lookupOpenLibrary(v);
    if (openLib?.title) break;
  }

  let bn: PartialLookup | null = null;
  for (const v of variants) {
    bn = await lookupBibliotekaNarodowa(v);
    if (bn?.title) break;
  }

  let google: PartialLookup | null = null;
  for (const v of variants) {
    google = await lookupGoogleBooks(v);
    if (google?.title) break;
  }

  const primary = openLib?.title
    ? openLib
    : bn?.title
      ? bn
      : google?.title
        ? google
        : null;

  if (!primary?.title) return null;

  const merged = mergeLookups(primary, [bn, openLib, google]);

  // Prefer BN publisher for Polish books when available
  if (bn?.publisher) merged.publisher = bn.publisher;

  const coverCandidates = uniqueUrls([
    merged.coverUrl,
    ...variants.flatMap((v) => googleCoverUrls(v)),
    ...variants.flatMap((v) => amazonCoverUrls(v)),
    `https://covers.openlibrary.org/b/isbn/${preferredIsbn}-L.jpg`,
    ...variants
      .filter((v) => v.length === 10)
      .map((v) => `https://covers.openlibrary.org/b/isbn/${v}-L.jpg`),
  ]);

  let coverPath: string | null = null;
  let coverUrl: string | null = merged.coverUrl ?? null;

  for (const candidate of coverCandidates) {
    const saved = await downloadCover(candidate, preferredIsbn);
    if (saved) {
      coverPath = saved;
      coverUrl = candidate;
      break;
    }
  }

  return {
    title: merged.title ?? "",
    authors: merged.authors ?? "",
    isbn: preferredIsbn,
    publishedAt: merged.publishedAt ?? null,
    edition: merged.edition ?? null,
    publisher: merged.publisher ?? null,
    description: merged.description ?? null,
    coverPath,
    coverUrl,
    source: (merged.source as IsbnLookupResult["source"]) ?? "bn",
  };
}
