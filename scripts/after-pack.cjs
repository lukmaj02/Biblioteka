const fs = require("fs");
const path = require("path");

/**
 * electron-builder pomija node_modules i ukryte katalogi (.next) w extraResources.
 * Doklejamy je po spakowaniu do Contents/Resources/next.
 */
exports.default = async function afterPack(context) {
  const src = path.join(__dirname, "..", "build", "next-server");
  const appName = context.packager.appInfo.productFilename;
  const dest = path.join(
    context.appOutDir,
    `${appName}.app`,
    "Contents",
    "Resources",
    "next"
  );

  if (!fs.existsSync(dest)) {
    throw new Error(`afterPack: brak ${dest}`);
  }

  for (const name of ["node_modules", ".next"]) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (!fs.existsSync(from)) {
      throw new Error(`afterPack: brak źródła ${from}`);
    }
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true, dereference: true });
    console.log(`afterPack: skopiowano ${name} → ${to}`);
  }
};
