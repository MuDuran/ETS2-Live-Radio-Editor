const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");
const { PROJECT_ROOT, DEFAULT_GAME, DEFAULT_GAME_DIRECTORIES, DEFAULT_FFMPEG, GAME_PROFILES } = require("./constants.cjs");

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

function normalizeGameId(rawGameId) {
  if (typeof rawGameId !== "string") {
    return DEFAULT_GAME;
  }

  return Object.prototype.hasOwnProperty.call(GAME_PROFILES, rawGameId) ? rawGameId : DEFAULT_GAME;
}

function normalizeSettingsShape(rawSettings = {}) {
  const language = rawSettings.language || "pt-BR";
  const activeGame = normalizeGameId(rawSettings.activeGame || rawSettings.lastSelectedGame);
  const lastSelectedGame = normalizeGameId(rawSettings.lastSelectedGame || activeGame);
  const rawGameDirs = rawSettings.gameDirs || {};
  const legacyEts2Dir = rawSettings.ets2Dir || rawSettings.ets2_dir || DEFAULT_GAME_DIRECTORIES.ets2;
  const ffmpegPath = rawSettings.ffmpegPath || rawSettings.ffmpeg_path || DEFAULT_FFMPEG;
  const hasCompletedWelcome = Boolean(rawSettings.hasCompletedWelcome);
  const showTelemetry = rawSettings.showTelemetry !== false;

  return {
    language,
    activeGame,
    lastSelectedGame,
    gameDirs: {
      ets2: typeof rawGameDirs.ets2 === "string" && rawGameDirs.ets2.trim() ? rawGameDirs.ets2 : legacyEts2Dir,
      ats: typeof rawGameDirs.ats === "string" && rawGameDirs.ats.trim() ? rawGameDirs.ats : DEFAULT_GAME_DIRECTORIES.ats,
    },
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

  const legacyStationsPath = path.join(dataDir, "stations.json");
  const stationsPaths = {
    ets2: path.join(dataDir, "stations-ets2.json"),
    ats: path.join(dataDir, "stations-ats.json"),
  };
  const settingsPath = path.join(dataDir, "settings.json");
  const sourceStationsPath = path.join(PROJECT_ROOT, "stations.json");
  const sourceSettingsPath = path.join(PROJECT_ROOT, "settings.json");

  if (!fs.existsSync(legacyStationsPath) && fs.existsSync(sourceStationsPath)) {
    fs.copyFileSync(sourceStationsPath, legacyStationsPath);
  }

  if (!fs.existsSync(stationsPaths.ets2)) {
    if (fs.existsSync(legacyStationsPath)) {
      fs.copyFileSync(legacyStationsPath, stationsPaths.ets2);
    } else if (fs.existsSync(sourceStationsPath)) {
      fs.copyFileSync(sourceStationsPath, stationsPaths.ets2);
    } else {
      writeJson(stationsPaths.ets2, []);
    }
  }

  if (!fs.existsSync(stationsPaths.ats)) {
    writeJson(stationsPaths.ats, []);
  }

  if (!fs.existsSync(settingsPath)) {
    if (fs.existsSync(sourceSettingsPath)) {
      fs.copyFileSync(sourceSettingsPath, settingsPath);
    } else {
      writeJson(settingsPath, {
        language: "pt-BR",
        activeGame: DEFAULT_GAME,
        lastSelectedGame: DEFAULT_GAME,
        gameDirs: DEFAULT_GAME_DIRECTORIES,
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
    stationsPaths,
    settingsPath,
    readStations(gameId = DEFAULT_GAME) {
      const normalizedGameId = normalizeGameId(gameId);
      return readJsonSafe(stationsPaths[normalizedGameId], []);
    },
    writeStations(gameId, stations) {
      const normalizedGameId = normalizeGameId(gameId);
      writeJson(stationsPaths[normalizedGameId], stations);
    },
    readSettings() {
      const fallback = {
        language: "pt-BR",
        activeGame: DEFAULT_GAME,
        lastSelectedGame: DEFAULT_GAME,
        gameDirs: DEFAULT_GAME_DIRECTORIES,
        ffmpegPath: DEFAULT_FFMPEG,
        hasCompletedWelcome: false,
        showTelemetry: true,
        theme: DEFAULT_THEME,
      };
      const rawSettings = readJsonSafe(settingsPath, fallback);
      const normalizedSettings = normalizeSettingsShape(rawSettings);

      const needsMigration =
        rawSettings.activeGame !== normalizedSettings.activeGame ||
        rawSettings.lastSelectedGame !== normalizedSettings.lastSelectedGame ||
        JSON.stringify(rawSettings.gameDirs || {}) !== JSON.stringify(normalizedSettings.gameDirs) ||
        rawSettings.ffmpegPath !== normalizedSettings.ffmpegPath ||
        rawSettings.hasCompletedWelcome !== normalizedSettings.hasCompletedWelcome ||
        rawSettings.showTelemetry !== normalizedSettings.showTelemetry ||
        JSON.stringify(rawSettings.theme || {}) !== JSON.stringify(normalizedSettings.theme) ||
        rawSettings.ets2_dir !== undefined ||
        rawSettings.ets2Dir !== undefined ||
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
