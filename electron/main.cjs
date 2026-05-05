const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { createStorage } = require("./storage.cjs");
const {
  normalizeStation,
  suggestNextPort,
  validateStation,
  importFromETS2,
  syncToETS2,
} = require("./radio-service.cjs");
const { RelayService } = require("./relay-service.cjs");

let mainWindow = null;
let storage = null;
let relayService = null;
let stations = [];
let settings = null;

function getRendererUrl() {
  return process.env.ELECTRON_RENDERER_URL || null;
}

function getStatusPayload() {
  return relayService.getStatuses(stations);
}

function persistStations(nextStations) {
  stations = nextStations;
  storage.writeStations(stations);
}

function persistSettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  storage.writeSettings(settings);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 940,
    backgroundColor: "#06101c",
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
}

function bootstrapState() {
  storage = createStorage();
  relayService = new RelayService(storage);
  stations = storage.readStations();
  settings = storage.readSettings();
}

function registerIpc() {
  ipcMain.handle("app:get-bootstrap", () => ({
    settings,
    stations,
    statuses: getStatusPayload(),
    summary: {
      totalStations: stations.length,
      runningRelays: relayService.activeCount(),
      nextPort: suggestNextPort(stations),
    },
  }));

  ipcMain.handle("app:save-settings", (_event, partial) => {
    persistSettings(partial);
    return { ok: true, settings };
  });

  ipcMain.handle("app:add-station", (_event, payload) => {
    const station = normalizeStation(payload);
    const validation = validateStation(station, stations);
    if (!validation.ok) return validation;
    stations = [...stations, station];
    storage.writeStations(stations);
    return {
      ok: true,
      stations,
      statuses: getStatusPayload(),
      summary: {
        totalStations: stations.length,
        runningRelays: relayService.activeCount(),
        nextPort: suggestNextPort(stations),
      },
      messageKey: "helper_added",
      vars: { name: station.name },
    };
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
    persistStations(nextStations);
    return {
      ok: true,
      stations,
      statuses: getStatusPayload(),
      summary: {
        totalStations: stations.length,
        runningRelays: relayService.activeCount(),
        nextPort: suggestNextPort(stations),
      },
      messageKey: "helper_updated",
      vars: { name: station.name },
    };
  });

  ipcMain.handle("app:delete-stations", (_event, names) => {
    if (!Array.isArray(names) || names.length === 0) {
      return { ok: false, titleKey: "warn_nothing_checked_title", messageKey: "warn_nothing_checked_body" };
    }
    persistStations(stations.filter((station) => !names.includes(station.name)));
    return {
      ok: true,
      stations,
      statuses: getStatusPayload(),
      summary: {
        totalStations: stations.length,
        runningRelays: relayService.activeCount(),
        nextPort: suggestNextPort(stations),
      },
      messageKey: "helper_deleted_count",
      vars: { count: names.length, name: "stations.json" },
    };
  });

  ipcMain.handle("app:save-stations", () => {
    storage.writeStations(stations);
    return {
      ok: true,
      path: storage.stationsPath,
      messageKey: "helper_saved",
      vars: { name: "stations.json" },
    };
  });

  ipcMain.handle("app:import-ets2", () => {
    const result = importFromETS2(settings.ets2Dir, stations);
    if (!result.ok) return result;
    persistStations(result.stations);
    return {
      ok: true,
      stations,
      statuses: getStatusPayload(),
      summary: {
        totalStations: stations.length,
        runningRelays: relayService.activeCount(),
        nextPort: suggestNextPort(stations),
      },
      messageKey: "helper_imported_count",
      vars: { count: stations.length, name: "stations.json" },
    };
  });

  ipcMain.handle("app:sync-ets2", () => {
    const result = syncToETS2(settings.ets2Dir, stations);
    if (!result.ok) return result;
    return {
      ok: true,
      path: result.path,
      messageKey: "helper_synced",
    };
  });

  ipcMain.handle("app:start-relays", () => {
    const result = relayService.startRelays(stations, settings.ffmpegPath);
    if (!result.ok) return result;
    return {
      ok: true,
      statuses: getStatusPayload(),
      summary: {
        totalStations: stations.length,
        runningRelays: relayService.activeCount(),
        nextPort: suggestNextPort(stations),
      },
      messageKey: "helper_started",
    };
  });

  ipcMain.handle("app:stop-relays", () => {
    relayService.stopRelays();
    return {
      ok: true,
      statuses: getStatusPayload(),
      summary: {
        totalStations: stations.length,
        runningRelays: relayService.activeCount(),
        nextPort: suggestNextPort(stations),
      },
      messageKey: "helper_stopped",
    };
  });
}

app.whenReady().then(() => {
  bootstrapState();
  registerIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  relayService?.stopRelays();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
