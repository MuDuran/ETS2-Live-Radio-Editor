const path = require("node:path");

const PROJECT_ROOT = __dirname.includes("app.asar")
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..");
const BUNDLED_ROOT = __dirname.includes("app.asar")
  ? path.join(process.resourcesPath, "vendor")
  : path.join(PROJECT_ROOT, "vendor");
const GAME_PROFILES = require("../shared/gameProfiles.json");

const DEFAULT_GAME = "ets2";
const DEFAULT_GAME_DIRECTORIES = Object.fromEntries(
  Object.values(GAME_PROFILES).map((profile) => [
    profile.id,
    path.join(process.env.USERPROFILE || "", "Documents", profile.documentsFolderName),
  ])
);
const DEFAULT_FFMPEG = "C:/FFMpeg/bin/ffmpeg.exe";
const BUNDLED_FFMPEG = path.join(BUNDLED_ROOT, "ffmpeg", "ffmpeg.exe");

module.exports = {
  PROJECT_ROOT,
  BUNDLED_ROOT,
  BUNDLED_FFMPEG,
  DEFAULT_GAME,
  DEFAULT_GAME_DIRECTORIES,
  GAME_PROFILES,
  DEFAULT_FFMPEG,
};
