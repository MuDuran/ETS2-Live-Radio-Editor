const os = require("node:os");
const path = require("node:path");

const PROJECT_ROOT = __dirname.includes("app.asar")
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..");
const BUNDLED_ROOT = __dirname.includes("app.asar")
  ? path.join(process.resourcesPath, "vendor")
  : path.join(PROJECT_ROOT, "vendor");
const GAME_PROFILES = require("../shared/gameProfiles.json");
const PLATFORM = process.platform;
const HOME_DIR = os.homedir();

function getDefaultDocumentsRoot() {
  if (PLATFORM === "win32") {
    return path.join(process.env.USERPROFILE || HOME_DIR, "Documents");
  }

  return path.join(HOME_DIR, "Documents");
}

const DEFAULT_GAME = "ets2";
const DEFAULT_GAME_DIRECTORIES = Object.fromEntries(
  Object.values(GAME_PROFILES).map((profile) => [
    profile.id,
    path.join(getDefaultDocumentsRoot(), profile.documentsFolderName),
  ])
);
const DEFAULT_FFMPEG = PLATFORM === "win32" ? "C:/FFMpeg/bin/ffmpeg.exe" : "/usr/bin/ffmpeg";
const BUNDLED_FFMPEG = path.join(BUNDLED_ROOT, "ffmpeg", PLATFORM === "win32" ? "ffmpeg.exe" : "ffmpeg");

module.exports = {
  PROJECT_ROOT,
  BUNDLED_ROOT,
  BUNDLED_FFMPEG,
  DEFAULT_GAME,
  DEFAULT_GAME_DIRECTORIES,
  GAME_PROFILES,
  DEFAULT_FFMPEG,
  PLATFORM,
};
