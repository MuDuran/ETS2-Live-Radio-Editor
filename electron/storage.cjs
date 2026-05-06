const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");
const { PROJECT_ROOT, DEFAULT_ETS2_DIR, DEFAULT_FFMPEG } = require("./constants.cjs");

const DEFAULT_THEME = {
  backgroundColor: "#06111a",
  surfaceColor: "#163247",
  accentColor: "#19c3c0",
  gridColor: "#5a87a5",
  textColor: "#f2fbff",
  mutedTextColor: "#90a7b8",
  buttonColor: "#124959",
  dangerColor: "#b8424d",
  highContrast: false,
};

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

function normalizeThemeShape(rawTheme = {}) {
  return {
    backgroundColor: typeof rawTheme.backgroundColor === "string" ? rawTheme.backgroundColor : DEFAULT_THEME.backgroundColor,
    surfaceColor: typeof rawTheme.surfaceColor === "string" ? rawTheme.surfaceColor : DEFAULT_THEME.surfaceColor,
    accentColor: typeof rawTheme.accentColor === "string" ? rawTheme.accentColor : DEFAULT_THEME.accentColor,
    gridColor: typeof rawTheme.gridColor === "string" ? rawTheme.gridColor : DEFAULT_THEME.gridColor,
    textColor: typeof rawTheme.textColor === "string" ? rawTheme.textColor : DEFAULT_THEME.textColor,
    mutedTextColor: typeof rawTheme.mutedTextColor === "string" ? rawTheme.mutedTextColor : DEFAULT_THEME.mutedTextColor,
    buttonColor: typeof rawTheme.buttonColor === "string" ? rawTheme.buttonColor : DEFAULT_THEME.buttonColor,
    dangerColor: typeof rawTheme.dangerColor === "string" ? rawTheme.dangerColor : DEFAULT_THEME.dangerColor,
    highContrast: Boolean(rawTheme.highContrast),
  };
}

function normalizeSettingsShape(rawSettings = {}) {
  const language = rawSettings.language || "pt-BR";
  const ets2Dir = rawSettings.ets2Dir || rawSettings.ets2_dir || DEFAULT_ETS2_DIR;
  const ffmpegPath = rawSettings.ffmpegPath || rawSettings.ffmpeg_path || DEFAULT_FFMPEG;
  const hasCompletedWelcome = Boolean(rawSettings.hasCompletedWelcome);
  const showTelemetry = rawSettings.showTelemetry !== false;

  return {
    language,
    ets2Dir,
    ffmpegPath,
    hasCompletedWelcome,
    showTelemetry,
    theme: normalizeThemeShape(rawSettings.theme),
  };
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
        hasCompletedWelcome: false,
        showTelemetry: true,
        theme: DEFAULT_THEME,
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
      const fallback = {
        language: "pt-BR",
        ets2Dir: DEFAULT_ETS2_DIR,
        ffmpegPath: DEFAULT_FFMPEG,
        hasCompletedWelcome: false,
        showTelemetry: true,
        theme: DEFAULT_THEME,
      };
      const rawSettings = readJsonSafe(settingsPath, fallback);
      const normalizedSettings = normalizeSettingsShape(rawSettings);

      const needsMigration =
        rawSettings.ets2Dir !== normalizedSettings.ets2Dir ||
        rawSettings.ffmpegPath !== normalizedSettings.ffmpegPath ||
        rawSettings.hasCompletedWelcome !== normalizedSettings.hasCompletedWelcome ||
        rawSettings.showTelemetry !== normalizedSettings.showTelemetry ||
        JSON.stringify(rawSettings.theme || {}) !== JSON.stringify(normalizedSettings.theme) ||
        rawSettings.ets2_dir !== undefined ||
        rawSettings.ffmpeg_path !== undefined;

      if (needsMigration) {
        writeJson(settingsPath, normalizedSettings);
      }

      return normalizedSettings;
    },
    writeSettings(settings) {
      writeJson(settingsPath, normalizeSettingsShape(settings));
    },
  };
}

module.exports = {
  createStorage,
};
