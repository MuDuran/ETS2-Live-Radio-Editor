/// <reference types="vite/client" />

import type { BackendResponse, BootstrapPayload, Station } from "./types";

declare global {
  interface Window {
    radioApi: {
      getBootstrap: () => Promise<BootstrapPayload>;
      saveSettings: (partial: Partial<{ language: string; ets2Dir: string; ffmpegPath: string }>) => Promise<{ ok: boolean; settings: unknown }>;
      addStation: (payload: Station) => Promise<BackendResponse>;
      updateStation: (index: number, payload: Station) => Promise<BackendResponse>;
      deleteStations: (names: string[]) => Promise<BackendResponse>;
      saveStations: () => Promise<BackendResponse>;
      importETS2: () => Promise<BackendResponse>;
      syncETS2: () => Promise<BackendResponse>;
      startRelays: () => Promise<BackendResponse>;
      stopRelays: () => Promise<BackendResponse>;
    };
  }
}

export {};
