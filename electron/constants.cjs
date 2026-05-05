const path = require("node:path");

const PROJECT_ROOT = __dirname.includes("app.asar")
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..");

const DEFAULT_ETS2_DIR = path.join(process.env.USERPROFILE || "", "Documents", "Euro Truck Simulator 2");
const DEFAULT_FFMPEG = "C:/FFMpeg/bin/ffmpeg.exe";

module.exports = {
  PROJECT_ROOT,
  DEFAULT_ETS2_DIR,
  DEFAULT_FFMPEG,
};
