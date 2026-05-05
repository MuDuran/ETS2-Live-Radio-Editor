const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("radioApi", {
  getBootstrap: () => ipcRenderer.invoke("app:get-bootstrap"),
  saveSettings: (partial) => ipcRenderer.invoke("app:save-settings", partial),
  addStation: (payload) => ipcRenderer.invoke("app:add-station", payload),
  updateStation: (index, payload) => ipcRenderer.invoke("app:update-station", index, payload),
  deleteStations: (names) => ipcRenderer.invoke("app:delete-stations", names),
  saveStations: () => ipcRenderer.invoke("app:save-stations"),
  importETS2: () => ipcRenderer.invoke("app:import-ets2"),
  syncETS2: () => ipcRenderer.invoke("app:sync-ets2"),
  startRelays: () => ipcRenderer.invoke("app:start-relays"),
  stopRelays: () => ipcRenderer.invoke("app:stop-relays"),
});
