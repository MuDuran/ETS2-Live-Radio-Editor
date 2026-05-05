const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");
const { PROJECT_ROOT, DEFAULT_ETS2_DIR, DEFAULT_FFMPEG } = require("./constants.cjs");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

function createStorage() {
  const dataDir = app.getPath("userData");
  const logsDir = path.join(dataDir, "logs");
  const runDir = path.join(dataDir, "run");
  ensureDir(dataDir);
  ensureDir(logsDir);
  ensureDir(runDir);

  const stationsPath = path.join(dataDir, "stations.json");
  const settingsPath = path.join(dataDir, "settings.json");
  const sourceStationsPath = path.join(PROJECT_ROOT, "stations.json");
  const sourceSettingsPath = path.join(PROJECT_ROOT, "settings.json");

  if (!fs.existsSync(stationsPath) && fs.existsSync(sourceStationsPath)) {
    fs.copyFileSync(sourceStationsPath, stationsPath);
  }

  if (!fs.existsSync(settingsPath)) {
    if (fs.existsSync(sourceSettingsPath)) {
      fs.copyFileSync(sourceSettingsPath, settingsPath);
    } else {
      writeJson(settingsPath, {
        language: "pt-BR",
        ets2Dir: DEFAULT_ETS2_DIR,
        ffmpegPath: DEFAULT_FFMPEG,
      });
    }
  }

  return {
    dataDir,
    logsDir,
    runDir,
    stationsPath,
    settingsPath,
    readStations() {
      return readJsonSafe(stationsPath, []);
    },
    writeStations(stations) {
      writeJson(stationsPath, stations);
    },
    readSettings() {
      return readJsonSafe(settingsPath, {
        language: "pt-BR",
        ets2Dir: DEFAULT_ETS2_DIR,
        ffmpegPath: DEFAULT_FFMPEG,
      });
    },
    writeSettings(settings) {
      writeJson(settingsPath, settings);
    },
  };
}

module.exports = {
  createStorage,
};
