import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const publicSrc = path.join(root, "public");
/** Katalog kopiowany 1:1 do Resources (omija filtry electron-builder). */
const out = path.join(root, "build", "next-server");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Brak katalogu: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error(
    "Brak .next/standalone/server.js — najpierw uruchom: npm run build"
  );
}

copyDir(staticSrc, path.join(standalone, ".next", "static"));
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(standalone, "public"));
}

fs.rmSync(out, { recursive: true, force: true });
copyDir(standalone, out);

// Śledzenie Turbopack potrafi wciągnąć cały projekt — wyrzuć zbędne
for (const junk of [
  "dist-desktop",
  "build",
  "scripts",
  "src",
  "data",
  "electron",
  "node_modules/.cache",
  "package-lock.json",
  ".git",
]) {
  fs.rmSync(path.join(out, junk), { recursive: true, force: true });
}

const must = [
  path.join(out, "server.js"),
  path.join(out, "node_modules", "next"),
  path.join(out, ".next", "static"),
];
for (const p of must) {
  if (!fs.existsSync(p)) {
    throw new Error(`Po przygotowaniu brakuje: ${p}`);
  }
}

console.log(
  `Przygotowano ${out} (${(du(out) / 1024 / 1024).toFixed(1)} MB)`
);

function du(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += du(p);
    else total += fs.statSync(p).size;
  }
  return total;
}
