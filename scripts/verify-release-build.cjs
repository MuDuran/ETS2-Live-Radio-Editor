const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const indexPath = path.join(distDir, "index.html");

function fail(message) {
  console.error(`\n[verify-release-build] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail(`dist/index.html was not found at ${indexPath}. Run the renderer build first.`);
}

const html = fs.readFileSync(indexPath, "utf8");
const assetReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const localAssetReferences = assetReferences.filter((value) => !/^https?:\/\//i.test(value));

if (localAssetReferences.some((value) => value.startsWith("/"))) {
  fail(
    `Found absolute asset paths in dist/index.html (${localAssetReferences.join(
      ", "
    )}). Release builds for Electron must use relative paths.`
  );
}

const missingAssets = localAssetReferences
  .map((value) => value.split(/[?#]/)[0])
  .filter(Boolean)
  .map((value) => path.resolve(distDir, value))
  .filter((resolvedPath) => !fs.existsSync(resolvedPath));

if (missingAssets.length > 0) {
  fail(`Some release assets referenced by dist/index.html were not found:\n${missingAssets.join("\n")}`);
}

if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html)) {
  fail("dist/index.html still depends on Google Fonts. Release builds should not require remote fonts.");
}

console.log("[verify-release-build] Renderer output is suitable for Electron release packaging.");
