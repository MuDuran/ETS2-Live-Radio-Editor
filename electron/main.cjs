const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } = require("electron");
const { createStorage } = require("./storage.cjs");
const { createLogger } = require("./logger.cjs");
const { DEFAULT_ETS2_DIR, DEFAULT_FFMPEG, BUNDLED_FFMPEG } = require("./constants.cjs");
const {
  normalizeStation,
  suggestNextPort,
  validateStation,
  importFromETS2,
  syncToETS2,
} = require("./radio-service.cjs");
const { getCatalogFilters, searchStations, verifyStreamUrl } = require("./radio-browser-service.cjs");
const { RelayService } = require("./relay-service.cjs");
const { version: appVersion } = require("../package.json");
const translationPayload = require("../shared/translations.json");
const APP_USER_MODEL_ID = "com.muduran.ets2-live-radio-editor";

let mainWindow = null;
let storage = null;
let relayService = null;
let stations = [];
let settings = null;
let environment = null;
let tray = null;
let isQuitting = false;
let mainLogger = null;

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
    const output = execFileSync("where.exe", ["ffmpeg"], {
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

function detectEnvironment(currentSettings) {
  const documentsDir = app.getPath("documents");
  const ets2Candidates = [
    currentSettings.ets2Dir,
    path.join(documentsDir, "Euro Truck Simulator 2"),
    DEFAULT_ETS2_DIR,
    path.join(process.env.USERPROFILE || "", "OneDrive", "Documents", "Euro Truck Simulator 2"),
  ];
  const resolvedEts2Dir = findFirstExisting(ets2Candidates, (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());
  const finalEts2Dir = resolvedEts2Dir || currentSettings.ets2Dir || DEFAULT_ETS2_DIR;
  const liveStreamsPath = path.join(finalEts2Dir, "live_streams.sii");

  const ffmpegCandidates = [
    BUNDLED_FFMPEG,
    currentSettings.ffmpegPath,
    DEFAULT_FFMPEG,
    path.join(process.env.ProgramFiles || "", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    ...readFfmpegFromPath(),
  ];
  const resolvedFfmpegPath = findFirstExisting(ffmpegCandidates);
  const finalFfmpegPath = resolvedFfmpegPath || currentSettings.ffmpegPath || DEFAULT_FFMPEG;

  return {
    environment: {
      ets2: {
        path: finalEts2Dir,
        folderExists: Boolean(resolvedEts2Dir),
        liveStreamsPath,
        liveStreamsExists: fs.existsSync(liveStreamsPath),
        autoDetected: Boolean(resolvedEts2Dir && resolvedEts2Dir !== currentSettings.ets2Dir),
      },
      ffmpeg: {
        path: finalFfmpegPath,
        exists: Boolean(resolvedFfmpegPath),
        autoDetected: Boolean(resolvedFfmpegPath && resolvedFfmpegPath !== currentSettings.ffmpegPath),
      },
    },
    autoPatch: {
      ets2Dir: resolvedEts2Dir && resolvedEts2Dir !== currentSettings.ets2Dir ? resolvedEts2Dir : null,
      ffmpegPath: resolvedFfmpegPath && resolvedFfmpegPath !== currentSettings.ffmpegPath ? resolvedFfmpegPath : null,
    },
  };
}

function refreshEnvironmentState() {
  const detection = detectEnvironment(settings);
  const patch = {};

  if (detection.autoPatch.ets2Dir) {
    patch.ets2Dir = detection.autoPatch.ets2Dir;
  }

  if (detection.autoPatch.ffmpegPath) {
    patch.ffmpegPath = detection.autoPatch.ffmpegPath;
  }

  if (Object.keys(patch).length > 0) {
    persistSettings(patch);
    environment = {
      ets2: {
        ...detection.environment.ets2,
        path: settings.ets2Dir,
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

function persistStations(nextStations) {
  stations = nextStations;
  storage.writeStations(stations);
}

function persistSettings(nextSettings) {
  settings = {
    ...settings,
    ...nextSettings,
    theme: {
      ...settings.theme,
      ...(nextSettings.theme || {}),
    },
  };
  storage.writeSettings(settings);
  updateTrayMenu();
}

function buildStationMutationResponse(nextStations, successMessageKey, vars = {}) {
  persistStations(nextStations);
  const syncResult = syncToETS2(settings.ets2Dir, stations, mainLogger);

  if (!syncResult.ok) {
    mainLogger?.warn("Station mutation saved locally but ETS2 sync failed", {
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

  mainLogger?.info("Station mutation and ETS2 sync completed", {
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
  if (!tray) return;

  const visibilityKey =
    mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? "tray_status_visible" : "tray_status_hidden";

  tray.setToolTip(`ET2 Radio Relays ${appVersion} • ${translateMain(summaryRelayLabel())}`);
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
  tray = new Tray(createTrayIcon());
  tray.on("click", () => showMainWindow());
  updateTrayMenu();
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
    if (isQuitting) return;
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
  const storedStations = storage.readStations();
  stations = storedStations.map((station) => normalizeStation(station));
  settings = storage.readSettings();
  refreshEnvironmentState();
  mainLogger.info("Application bootstrap complete", {
    stationCount: stations.length,
    userDataDir: storage.dataDir,
    logsDir: storage.logsDir,
    ets2Dir: settings.ets2Dir,
    ffmpegPath: settings.ffmpegPath,
  });

  const needsStationMigration = JSON.stringify(storedStations) !== JSON.stringify(stations);
  if (needsStationMigration) {
    storage.writeStations(stations);
  }
}

function registerIpc() {
  ipcMain.handle("app:get-bootstrap", () => {
    const currentEnvironment = refreshEnvironmentState();
    return {
      settings,
      stations,
      statuses: getStatusPayload(),
      summary: getSummaryPayload(),
      environment: currentEnvironment,
      telemetry: getTelemetryPayload(),
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
    persistSettings(partial);
    const nextEnvironment = refreshEnvironmentState();
    mainLogger?.info("Settings updated", {
      changedKeys: Object.keys(partial || {}),
      ets2Dir: settings.ets2Dir,
      ffmpegPath: settings.ffmpegPath,
    });
    return { ok: true, settings, environment: nextEnvironment };
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

  ipcMain.handle("app:import-ets2", () => {
    const result = importFromETS2(settings.ets2Dir, stations, mainLogger);
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
