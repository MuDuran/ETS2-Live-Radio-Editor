const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } = require("electron");
const { createStorage } = require("./storage.cjs");
const { createLogger } = require("./logger.cjs");
const {
  DEFAULT_GAME,
  DEFAULT_GAME_DIRECTORIES,
  DEFAULT_FFMPEG,
  BUNDLED_FFMPEG,
  GAME_PROFILES,
  PLATFORM,
} = require("./constants.cjs");
const {
  normalizeStation,
  suggestNextPort,
  validateStation,
  importFromGame,
  syncToGame,
} = require("./radio-service.cjs");
const { getCatalogFilters, searchStations, verifyStreamUrl } = require("./radio-browser-service.cjs");
const { RelayService } = require("./relay-service.cjs");
const { version: appVersion } = require("../package.json");
const translationPayload = require("../shared/translations.json");
const APP_USER_MODEL_ID = "com.muduran.ets2-live-radio-editor";
const STEAM_APP_IDS = {
  ets2: "227300",
  ats: "270880",
};

let mainWindow = null;
let storage = null;
let relayService = null;
let stations = [];
let settings = null;
let environment = null;
let tray = null;
let trayEnabled = false;
let isQuitting = false;
let mainLogger = null;

function shouldUseTray() {
  if (PLATFORM === "linux") {
    return process.env.ETS2_ENABLE_LINUX_TRAY === "1";
  }

  return true;
}

function configurePlatformRuntime() {
  if (PLATFORM !== "linux") {
    return;
  }

  // Linux desktop environments vary a lot across Wayland/X11 and VM setups.
  // Favor the more compatible software path for this utility-style UI.
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch(
    "disable-features",
    [
      "AcceleratedVideoDecodeLinuxGL",
      "AcceleratedVideoEncoder",
      "UseChromeOSDirectVideoDecoder",
      "VaapiVideoDecoder",
      "VaapiVideoEncoder",
    ].join(",")
  );
}

function getRendererUrl() {
  return process.env.ELECTRON_RENDERER_URL || null;
}

function getIconAssetPath(fileName) {
  return path.join(__dirname, "..", "assets", "icons", fileName);
}

function getStatusPayload() {
  return relayService.getStatuses(stations);
}

function translateMain(key, vars = {}) {
  const language = settings?.language || "pt-BR";
  const dictionary = translationPayload.translations[language] ?? translationPayload.translations.en ?? {};
  const fallback = translationPayload.translations.en ?? {};
  const raw = dictionary[key] ?? fallback[key] ?? key;
  return Object.entries(vars).reduce(
    (message, [token, value]) => message.replaceAll(`{${token}}`, String(value)),
    raw
  );
}

function getSummaryPayload() {
  return {
    totalStations: stations.length,
    runningRelays: relayService.activeCount(),
    nextPort: suggestNextPort(stations),
    relayEnabled: relayService.isEnabled(),
    preparedRelays: relayService.preparedCount(),
  };
}

function getGameProfile(gameId = DEFAULT_GAME) {
  return GAME_PROFILES[gameId] || GAME_PROFILES[DEFAULT_GAME];
}

function getCurrentGameId(currentSettings = settings) {
  return currentSettings?.activeGame || DEFAULT_GAME;
}

function getCurrentGameDir(currentSettings = settings) {
  const gameId = getCurrentGameId(currentSettings);
  return currentSettings?.gameDirs?.[gameId] || DEFAULT_GAME_DIRECTORIES[gameId];
}

function getLinuxSteamRoots() {
  const homeDir = os.homedir();

  return uniquePaths([
    path.join(homeDir, ".steam", "steam"),
    path.join(homeDir, ".steam", "root"),
    path.join(homeDir, ".local", "share", "Steam"),
    path.join(homeDir, ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam"),
  ]);
}

function getLinuxGameDirectoryCandidates(profile) {
  const steamAppId = STEAM_APP_IDS[profile.id];
  const userNames = uniquePaths([
    "steamuser",
    "deck",
    process.env.USER,
    process.env.LOGNAME,
  ]);

  const protonCandidates = getLinuxSteamRoots().flatMap((steamRoot) =>
    userNames.map((userName) =>
      path.join(
        steamRoot,
        "steamapps",
        "compatdata",
        steamAppId,
        "pfx",
        "drive_c",
        "users",
        userName,
        "Documents",
        profile.documentsFolderName
      )
    )
  );

  return uniquePaths([
    path.join(os.homedir(), "Documents", profile.documentsFolderName),
    path.join(app.getPath("home"), "Documents", profile.documentsFolderName),
    ...protonCandidates,
  ]);
}

function getGameDirectoryCandidates(currentSettings, gameId) {
  const documentsDir = app.getPath("documents");
  const profile = getGameProfile(gameId);
  const configuredDir = currentSettings?.gameDirs?.[gameId] || DEFAULT_GAME_DIRECTORIES[gameId];
  const defaultCandidates = [
    configuredDir,
    path.join(documentsDir, profile.documentsFolderName),
    DEFAULT_GAME_DIRECTORIES[gameId],
  ];

  if (PLATFORM === "win32") {
    return uniquePaths([
      ...defaultCandidates,
      path.join(process.env.USERPROFILE || "", "OneDrive", "Documents", profile.documentsFolderName),
    ]);
  }

  return uniquePaths([
    ...defaultCandidates,
    ...getLinuxGameDirectoryCandidates(profile),
  ]);
}

function detectGameAvailability(currentSettings, gameId) {
  const profile = getGameProfile(gameId);
  const configuredDir = currentSettings?.gameDirs?.[gameId] || DEFAULT_GAME_DIRECTORIES[gameId];
  const candidates = getGameDirectoryCandidates(currentSettings, gameId);
  const resolvedDir = findFirstExisting(candidates, (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());
  const finalDir = resolvedDir || configuredDir || DEFAULT_GAME_DIRECTORIES[gameId];
  const liveStreamsPath = path.join(finalDir, "live_streams.sii");

  return {
    id: profile.id,
    name: profile.name,
    shortName: profile.shortName,
    path: finalDir,
    folderExists: Boolean(resolvedDir),
    liveStreamsPath,
    liveStreamsExists: fs.existsSync(liveStreamsPath),
    autoDetected: Boolean(resolvedDir && resolvedDir !== configuredDir),
  };
}

function uniquePaths(paths) {
  return [...new Set(paths.filter((candidate) => typeof candidate === "string" && candidate.trim()))];
}

function findFirstExisting(paths, validator = (candidate) => fs.existsSync(candidate)) {
  return uniquePaths(paths).find((candidate) => {
    try {
      return validator(candidate);
    } catch {
      return false;
    }
  }) || null;
}

function readFfmpegFromPath() {
  try {
    const output = execFileSync(PLATFORM === "win32" ? "where.exe" : "which", ["ffmpeg"], {
      windowsHide: true,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getPlatformFfmpegCandidates(currentSettings) {
  if (PLATFORM === "win32") {
    return [
      path.join(process.env.ProgramFiles || "", "ffmpeg", "bin", "ffmpeg.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "", "ffmpeg", "bin", "ffmpeg.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    ];
  }

  return [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/var/lib/flatpak/exports/bin/org.ffmpeg.FFmpeg",
  ];
}

function detectEnvironment(currentSettings) {
  const activeGameId = getCurrentGameId(currentSettings);
  const activeGameState = detectGameAvailability(currentSettings, activeGameId);
  const currentGameDir = getCurrentGameDir(currentSettings);
  const games = {
    ets2: detectGameAvailability(currentSettings, "ets2"),
    ats: detectGameAvailability(currentSettings, "ats"),
  };

  const ffmpegCandidates = [
    BUNDLED_FFMPEG,
    currentSettings.ffmpegPath,
    DEFAULT_FFMPEG,
    ...getPlatformFfmpegCandidates(currentSettings),
    ...readFfmpegFromPath(),
  ];
  const resolvedFfmpegPath = findFirstExisting(ffmpegCandidates);
  const finalFfmpegPath = resolvedFfmpegPath || currentSettings.ffmpegPath || DEFAULT_FFMPEG;

  return {
    environment: {
      game: activeGameState,
      games,
      ffmpeg: {
        path: finalFfmpegPath,
        exists: Boolean(resolvedFfmpegPath),
        autoDetected: Boolean(resolvedFfmpegPath && resolvedFfmpegPath !== currentSettings.ffmpegPath),
      },
    },
    autoPatch: {
      gameDir: activeGameState.autoDetected && activeGameState.path !== currentGameDir ? activeGameState.path : null,
      ffmpegPath: resolvedFfmpegPath && resolvedFfmpegPath !== currentSettings.ffmpegPath ? resolvedFfmpegPath : null,
    },
  };
}

function refreshEnvironmentState() {
  const detection = detectEnvironment(settings);
  const patch = {};

  if (detection.autoPatch.gameDir) {
    patch.gameDirs = {
      [getCurrentGameId(settings)]: detection.autoPatch.gameDir,
    };
  }

  if (detection.autoPatch.ffmpegPath) {
    patch.ffmpegPath = detection.autoPatch.ffmpegPath;
  }

  if (Object.keys(patch).length > 0) {
    persistSettings(patch);
    environment = {
      game: {
        ...detection.environment.game,
        path: getCurrentGameDir(settings),
      },
      ffmpeg: {
        ...detection.environment.ffmpeg,
        path: settings.ffmpegPath,
      },
    };
    return environment;
  }

  environment = detection.environment;
  return environment;
}

function getTelemetryPayload() {
  const statuses = getStatusPayload();
  const counts = statuses.reduce(
    (accumulator, entry) => {
      if (entry.key === "status_running") accumulator.runningRelays += 1;
      else if (entry.key === "status_starting") accumulator.startingRelays += 1;
      else if (entry.key === "status_error") accumulator.errorRelays += 1;
      else accumulator.stoppedRelays += 1;
      return accumulator;
    },
    { runningRelays: 0, startingRelays: 0, errorRelays: 0, stoppedRelays: 0 }
  );
  const relayMetrics = relayService.getMetrics();

  return {
    mainMemoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    totalStations: stations.length,
    listeningRelays: relayMetrics.listeningRelays,
    relayProcesses: relayMetrics.relayProcesses,
    runningRelays: counts.runningRelays,
    startingRelays: counts.startingRelays,
    stoppedRelays: counts.stoppedRelays,
    errorRelays: counts.errorRelays,
    startupInProgress: relayMetrics.startupInProgress,
    lastStartAt: relayMetrics.lastStartAt,
    lastStartDurationMs: relayMetrics.lastStartDurationMs,
  };
}

function readStationsForCurrentGame() {
  return storage.readStations(getCurrentGameId(settings)).map((station) => normalizeStation(station));
}

function persistStations(nextStations) {
  stations = nextStations;
  storage.writeStations(getCurrentGameId(settings), stations);
}

function persistSettings(nextSettings) {
  settings = {
    ...settings,
    ...nextSettings,
    gameDirs: {
      ...settings.gameDirs,
      ...(nextSettings.gameDirs || {}),
    },
    theme: {
      ...settings.theme,
      ...(nextSettings.theme || {}),
    },
  };
  storage.writeSettings(settings);
  updateTrayMenu();
}

function rebuildSelectionState() {
  return {
    stations,
    statuses: getStatusPayload(),
    summary: getSummaryPayload(),
    environment,
    telemetry: getTelemetryPayload(),
  };
}

function buildStationMutationResponse(nextStations, successMessageKey, vars = {}) {
  persistStations(nextStations);
  const syncResult = syncToGame(getCurrentGameId(settings), getCurrentGameDir(settings), stations, mainLogger);

  if (!syncResult.ok) {
    mainLogger?.warn("Station mutation saved locally but game sync failed", {
      successMessageKey,
      stationCount: stations.length,
      path: syncResult.vars?.path || syncResult.path || "",
    });
    return {
      ok: false,
      titleKey: "sync_error_title",
      messageKey: "auto_sync_failed_body",
      vars: { ...vars, path: syncResult.vars?.path || syncResult.path || "" },
      stations,
      statuses: getStatusPayload(),
      summary: getSummaryPayload(),
      environment,
      telemetry: getTelemetryPayload(),
    };
  }

  mainLogger?.info("Station mutation and game sync completed", {
    successMessageKey,
    stationCount: stations.length,
    path: syncResult.path,
  });
  return {
    ok: true,
    path: syncResult.path,
    stations,
    statuses: getStatusPayload(),
    summary: getSummaryPayload(),
    environment,
    telemetry: getTelemetryPayload(),
    messageKey: successMessageKey,
    vars,
  };
}

function createTrayIcon() {
  const iconPath = getIconAssetPath("ETS2-Radio-Relay-Logo.png");
  const image = nativeImage.createFromPath(iconPath);

  if (!image.isEmpty()) {
    return image.resize({ width: 16, height: 16 });
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#0a1825"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="#19c3c0" stroke-width="5"/>
      <path d="M32 16v18" stroke="#19c3c0" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `.trim();

  return nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`)
    .resize({ width: 16, height: 16 });
}

function summaryRelayLabel() {
  return relayService?.isEnabled() ? "tray_relays_online" : "tray_relays_offline";
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function updateTrayMenu() {
  if (!trayEnabled || !tray) return;

  const visibilityKey =
    mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? "tray_status_visible" : "tray_status_hidden";

  tray.setToolTip(`ETS2 and ATS Live Radio Editor ${appVersion} • ${translateMain(summaryRelayLabel())}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: translateMain("tray_open"),
        click: () => showMainWindow(),
      },
      {
        label: translateMain(visibilityKey),
        enabled: false,
      },
      {
        label: translateMain(summaryRelayLabel()),
        enabled: false,
      },
      { type: "separator" },
      {
        label: translateMain("tray_exit"),
        click: () => {
          isQuitting = true;
          tray?.destroy();
          app.quit();
        },
      },
    ])
  );
}

function createTray() {
  if (!shouldUseTray()) {
    trayEnabled = false;
    mainLogger?.info("Tray disabled for current platform", {
      platform: PLATFORM,
    });
    return;
  }

  try {
    tray = new Tray(createTrayIcon());
    trayEnabled = true;
    tray.on("click", () => showMainWindow());
    updateTrayMenu();
    mainLogger?.info("Tray created successfully", {
      platform: PLATFORM,
    });
  } catch (error) {
    tray = null;
    trayEnabled = false;
    mainLogger?.warn("Tray initialization failed; continuing without tray", {
      platform: PLATFORM,
      reason: error.message || "unknown",
    });
  }
}

function createWindow() {
  const windowIcon = process.platform === "win32"
    ? getIconAssetPath("ETS2-Radio-Relay-Logo.ico")
    : getIconAssetPath("ETS2-Radio-Relay-Logo.png");

  mainWindow = new BrowserWindow({
    width: 1560,
    height: 940,
    backgroundColor: "#06101c",
    icon: windowIcon,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const rendererUrl = getRendererUrl();
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on("minimize", (event) => {
    if (isQuitting || !trayEnabled) return;
    event.preventDefault();
    mainWindow.hide();
    updateTrayMenu();
  });

  mainWindow.on("show", updateTrayMenu);
  mainWindow.on("hide", updateTrayMenu);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function bootstrapState() {
  storage = createStorage();
  mainLogger = createLogger(path.join(storage.logsDir, "main.log"), "main");
  relayService = new RelayService(storage, createLogger(path.join(storage.logsDir, "relay.log"), "relay"));
  settings = storage.readSettings();
  const storedStations = storage.readStations(getCurrentGameId(settings));
  stations = storedStations.map((station) => normalizeStation(station));
  refreshEnvironmentState();
  mainLogger.info("Application bootstrap complete", {
    stationCount: stations.length,
    userDataDir: storage.dataDir,
    logsDir: storage.logsDir,
    activeGame: settings.activeGame,
    gameDir: getCurrentGameDir(settings),
    ffmpegPath: settings.ffmpegPath,
  });

  const needsStationMigration = JSON.stringify(storedStations) !== JSON.stringify(stations);
  if (needsStationMigration) {
    storage.writeStations(getCurrentGameId(settings), stations);
  }
}

function registerIpc() {
  ipcMain.handle("app:get-bootstrap", () => {
    const currentEnvironment = refreshEnvironmentState();
    return {
    settings,
    ...rebuildSelectionState(),
    environment: currentEnvironment,
  };
  });

  ipcMain.handle("app:get-runtime-state", () => {
    const currentEnvironment = refreshEnvironmentState();
    return {
      statuses: getStatusPayload(),
      summary: getSummaryPayload(),
      telemetry: getTelemetryPayload(),
      environment: currentEnvironment,
    };
  });

  ipcMain.handle("app:get-search-filters", async () => {
    try {
      return { ok: true, ...await getCatalogFilters() };
    } catch {
      return {
        ok: false,
        titleKey: "search_catalog_error_title",
        messageKey: "search_catalog_error_body",
        countries: [],
        languages: [],
        tags: [],
      };
    }
  });

  ipcMain.handle("app:search-stations", async (_event, filters) => {
    try {
      const stations = await searchStations(filters);
      return {
        ok: true,
        stations,
      };
    } catch {
      return {
        ok: false,
        titleKey: "search_catalog_error_title",
        messageKey: "search_catalog_error_body",
        stations: [],
      };
    }
  });

  ipcMain.handle("app:test-stream-url", async (_event, streamUrl) => verifyStreamUrl(streamUrl));

  ipcMain.handle("app:open-external", async (_event, url) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return { ok: false };
    }

    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle("app:save-settings", (_event, partial) => {
    const previousGameId = getCurrentGameId(settings);
    const requestedGameId = partial?.activeGame;

    if (
      requestedGameId &&
      requestedGameId !== previousGameId &&
      (relayService.isEnabled() || relayService.getMetrics().startupInProgress)
    ) {
      return {
        ok: false,
        titleKey: "game_switch_blocked_title",
        messageKey: "game_switch_blocked_body",
        vars: {
          gameShortName: getGameProfile(previousGameId).shortName,
        },
        settings,
        environment,
        ...rebuildSelectionState(),
      };
    }

    persistSettings(partial);
    const nextEnvironment = refreshEnvironmentState();
    const nextGameId = getCurrentGameId(settings);

    if (nextGameId !== previousGameId) {
      stations = readStationsForCurrentGame();
    }

    mainLogger?.info("Settings updated", {
      changedKeys: Object.keys(partial || {}),
      activeGame: settings.activeGame,
      gameDir: getCurrentGameDir(settings),
      ffmpegPath: settings.ffmpegPath,
    });
    return {
      ok: true,
      settings,
      environment: nextEnvironment,
      ...rebuildSelectionState(),
    };
  });

  ipcMain.handle("app:add-station", (_event, payload) => {
    const station = normalizeStation(payload);
    const validation = validateStation(station, stations);
    if (!validation.ok) return validation;
    return buildStationMutationResponse([...stations, station], "helper_added", { name: station.name });
  });

  ipcMain.handle("app:update-station", (_event, index, payload) => {
    const current = stations[index];
    if (!current) {
      return { ok: false, titleKey: "warn_nothing_selected_title", messageKey: "warn_nothing_selected_body" };
    }
    const station = normalizeStation(payload);
    const validation = validateStation(station, stations, current.name);
    if (!validation.ok) return validation;
    const nextStations = [...stations];
    nextStations[index] = station;
    return buildStationMutationResponse(nextStations, "helper_updated", { name: station.name });
  });

  ipcMain.handle("app:delete-stations", (_event, names) => {
    if (!Array.isArray(names) || names.length === 0) {
      return { ok: false, titleKey: "warn_nothing_checked_title", messageKey: "warn_nothing_checked_body" };
    }
    const removedNames = stations.filter((station) => names.includes(station.name)).map((station) => station.name);
    return buildStationMutationResponse(
      stations.filter((station) => !names.includes(station.name)),
      "helper_deleted_count",
      { count: names.length, name: removedNames.join(", ") || "stations.json" }
    );
  });

  ipcMain.handle("app:import-game", () => {
    const result = importFromGame(getCurrentGameId(settings), getCurrentGameDir(settings), stations, mainLogger);
    if (!result.ok) return result;
    persistStations(result.stations);
    return {
      ok: true,
      stations,
      statuses: getStatusPayload(),
      summary: getSummaryPayload(),
      environment,
      telemetry: getTelemetryPayload(),
      messageKey: "helper_imported_count",
      vars: { count: stations.length, name: "stations.json" },
    };
  });

  ipcMain.handle("app:start-relays", async () => {
    const currentEnvironment = refreshEnvironmentState();
    const result = await relayService.startRelays(stations, settings.ffmpegPath);
    mainLogger?.info("Relay start request completed", {
      ok: result.ok,
      listenerCount: relayService.preparedCount(),
      activeCount: relayService.activeCount(),
    });
    if (!result.ok) {
      return { ...result, environment: currentEnvironment, telemetry: getTelemetryPayload() };
    }
    updateTrayMenu();
    return {
      ok: true,
      statuses: getStatusPayload(),
      summary: getSummaryPayload(),
      environment: currentEnvironment,
      telemetry: getTelemetryPayload(),
      messageKey: "helper_started",
      vars: result.vars,
    };
  });

  ipcMain.handle("app:stop-relays", () => {
    relayService.stopRelays();
    mainLogger?.info("Relay stop request completed");
    updateTrayMenu();
    return {
      ok: true,
      statuses: getStatusPayload(),
      summary: getSummaryPayload(),
      environment,
      telemetry: getTelemetryPayload(),
      messageKey: "helper_stopped",
    };
  });
}

configurePlatformRuntime();

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }
  bootstrapState();
  registerIpc();
  createWindow();
  createTray();
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  tray?.destroy();
  relayService?.stopRelays();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    updateTrayMenu();
    return;
  }

  showMainWindow();
});
