const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const minimumExpectedSizeBytes = 5 * 1024 * 1024;

function resolveTargetPath() {
  const customPath = process.argv[2];
  if (customPath) {
    return path.resolve(projectRoot, customPath);
  }
  return path.join(projectRoot, "vendor", "ffmpeg", "ffmpeg.exe");
}

const bundledFfmpegPath = resolveTargetPath();

function fail(message) {
  console.error(`[verify-bundled-ffmpeg] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(bundledFfmpegPath)) {
  fail(`Bundled ffmpeg was not found at ${bundledFfmpegPath}`);
}

const stats = fs.statSync(bundledFfmpegPath);
if (stats.size < minimumExpectedSizeBytes) {
  fail(
    `Bundled ffmpeg looks too small (${stats.size} bytes). This usually means a wrapper or shim was copied instead of the real executable.`
  );
}

try {
  const versionOutput = execFileSync(bundledFfmpegPath, ["-version"], {
    windowsHide: true,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const firstLine = versionOutput.split(/\r?\n/).find(Boolean) || "unknown";
  console.log("[verify-bundled-ffmpeg] Bundled ffmpeg is valid.");
  console.log(`  • path: ${bundledFfmpegPath}`);
  console.log(`  • size: ${stats.size} bytes`);
  console.log(`  • version: ${firstLine}`);
} catch (error) {
  fail(`Bundled ffmpeg failed to execute '-version': ${error.message}`);
}
