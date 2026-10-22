"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/ksiegozbior",
    label: "Książki",
    match: (p: string) =>
      p === "/" || p.startsWith("/ksiegozbior") || p.startsWith("/pulpit"),
  },
  {
    href: "/wypozyczenia",
    label: "Wypożyczenia",
    match: (p: string) => p.startsWith("/wypozyczenia"),
  },
  {
    href: "/osoby",
    label: "Czytelnicy",
    match: (p: string) => p.startsWith("/osoby"),
  },
  {
    href: "/wyszukiwarka",
    label: "Wyszukiwarka",
    match: (p: string) => p.startsWith("/wyszukiwarka"),
  },
];

const settingsChildren = [
  { href: "/ustawienia/termin", label: "Termin zwrotu" },
  { href: "/ustawienia/tematyka", label: "Tematyka" },
  { href: "/ustawienia/etykiety", label: "Etykiety" },
  { href: "/ustawienia/czytelnicy", label: "Zarządzaj czytelnikami" },
  { href: "/ustawienia/raporty", label: "Raporty" },
];

export function Sidebar() {
  const pathname = usePathname();
  const settingsOpen =
    pathname.startsWith("/ustawienia") || pathname.startsWith("/etykiety");

  return (
    <aside className="no-print hidden md:flex w-56 shrink-0 flex-col border-r border-[var(--line)] bg-[rgba(47,59,42,0.04)] px-3 py-5">
      <Link href="/ksiegozbior" className="mb-6 px-2">
        <div className="text-lg font-semibold text-ink">Biblioteka</div>
        <div className="text-xs text-muted">Domowa</div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {links.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-[rgba(47,59,42,0.08)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="mt-1">
          <Link
            href="/ustawienia/termin"
            className={`block rounded px-3 py-2 text-sm transition-colors ${
              settingsOpen
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-[rgba(47,59,42,0.08)]"
            }`}
          >
            Ustawienia
          </Link>
          {settingsOpen && (
            <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-2">
              {settingsChildren.map((child) => {
                const active =
                  pathname === child.href ||
                  (child.href === "/ustawienia/etykiety" &&
                    pathname.startsWith("/etykiety"));
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`rounded px-2 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                      active
                        ? "bg-[rgba(47,59,42,0.12)] text-ink"
                        : "text-muted hover:bg-[rgba(47,59,42,0.06)] hover:text-ink"
                    }`}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const mobile = [
    ...links,
    { href: "/ustawienia/termin", label: "Ustawienia", match: (p: string) => p.startsWith("/ustawienia") },
  ];

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--line)] bg-[rgba(247,241,231,0.94)] backdrop-blur md:hidden">
      {mobile.map((link) => {
        const active = "match" in link && link.match
          ? link.match(pathname)
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center justify-center py-3 text-[0.65rem] font-medium ${
              active ? "text-ink" : "text-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
