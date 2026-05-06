const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("radioApi", {
  getBootstrap: () => ipcRenderer.invoke("app:get-bootstrap"),
  getRuntimeState: () => ipcRenderer.invoke("app:get-runtime-state"),
  getSearchFilters: () => ipcRenderer.invoke("app:get-search-filters"),
  searchStations: (filters) => ipcRenderer.invoke("app:search-stations", filters),
  testStreamUrl: (streamUrl) => ipcRenderer.invoke("app:test-stream-url", streamUrl),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  saveSettings: (partial) => ipcRenderer.invoke("app:save-settings", partial),
  addStation: (payload) => ipcRenderer.invoke("app:add-station", payload),
  updateStation: (index, payload) => ipcRenderer.invoke("app:update-station", index, payload),
  deleteStations: (names) => ipcRenderer.invoke("app:delete-stations", names),
  importETS2: () => ipcRenderer.invoke("app:import-ets2"),
  startRelays: () => ipcRenderer.invoke("app:start-relays"),
  stopRelays: () => ipcRenderer.invoke("app:stop-relays"),
});
