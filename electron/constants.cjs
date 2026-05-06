const path = require("node:path");

const PROJECT_ROOT = __dirname.includes("app.asar")
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..");
const BUNDLED_ROOT = __dirname.includes("app.asar")
  ? path.join(process.resourcesPath, "vendor")
  : path.join(PROJECT_ROOT, "vendor");

const DEFAULT_ETS2_DIR = path.join(process.env.USERPROFILE || "", "Documents", "Euro Truck Simulator 2");
const DEFAULT_FFMPEG = "C:/FFMpeg/bin/ffmpeg.exe";
const BUNDLED_FFMPEG = path.join(BUNDLED_ROOT, "ffmpeg", "ffmpeg.exe");

module.exports = {
  PROJECT_ROOT,
  BUNDLED_ROOT,
  BUNDLED_FFMPEG,
  DEFAULT_ETS2_DIR,
  DEFAULT_FFMPEG,
};
