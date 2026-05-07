/// <reference types="vite/client" />

import type {
  BackendResponse,
  BootstrapPayload,
  EnvironmentReport,
  GameId,
  SearchFiltersPayload,
  SearchStationsPayload,
  Station,
  StatusEntry,
  Summary,
  TelemetrySnapshot,
  ThemeSettings,
} from "./types";

declare global {
  interface Window {
    radioApi: {
      getBootstrap: () => Promise<BootstrapPayload>;
      getRuntimeState: () => Promise<{ statuses: StatusEntry[]; summary: Summary; telemetry: TelemetrySnapshot; environment: EnvironmentReport }>;
      getSearchFilters: () => Promise<SearchFiltersPayload>;
      searchStations: (filters: { query?: string; countryCode?: string; language?: string; tag?: string }) => Promise<SearchStationsPayload>;
      testStreamUrl: (streamUrl: string) => Promise<BackendResponse>;
      openExternal: (url: string) => Promise<{ ok: boolean }>;
      saveSettings: (
        partial: Partial<{
          language: string;
          activeGame: GameId;
          lastSelectedGame: GameId;
          gameDirs: Partial<Record<GameId, string>>;
          ffmpegPath: string;
          hasCompletedWelcome: boolean;
          showTelemetry: boolean;
          theme: Partial<ThemeSettings>;
        }>
      ) => Promise<{
        ok: boolean;
        settings: {
          language: string;
          activeGame: GameId;
          lastSelectedGame: GameId;
          gameDirs: Record<GameId, string>;
          ffmpegPath: string;
          hasCompletedWelcome: boolean;
          showTelemetry: boolean;
          theme: ThemeSettings;
        };
        environment: EnvironmentReport;
        stations?: Station[];
        statuses?: StatusEntry[];
        summary?: Summary;
        telemetry?: TelemetrySnapshot;
      }>;
      addStation: (payload: Station) => Promise<BackendResponse>;
      updateStation: (index: number, payload: Station) => Promise<BackendResponse>;
      deleteStations: (names: string[]) => Promise<BackendResponse>;
      importGame: () => Promise<BackendResponse>;
      startRelays: () => Promise<BackendResponse>;
      stopRelays: () => Promise<BackendResponse>;
    };
  }
}

export {};
