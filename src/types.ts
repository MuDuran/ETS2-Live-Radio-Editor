export type Station = {
  name: string;
  genre: string;
  language: string;
  bitrate: number;
  port: number;
  source: string;
  favorite: boolean;
};

export type ThemeSettings = {
  backgroundColor: string;
  surfaceColor: string;
  accentColor: string;
  gridColor: string;
  textColor: string;
  mutedTextColor: string;
  buttonColor: string;
  dangerColor: string;
  highContrast: boolean;
};

export type AppSettings = {
  language: string;
  ets2Dir: string;
  ffmpegPath: string;
  hasCompletedWelcome: boolean;
  showTelemetry: boolean;
  theme: ThemeSettings;
};

export type EnvironmentReport = {
  ets2: {
    path: string;
    folderExists: boolean;
    liveStreamsPath: string;
    liveStreamsExists: boolean;
    autoDetected: boolean;
  };
  ffmpeg: {
    path: string;
    exists: boolean;
    autoDetected: boolean;
  };
};

export type TelemetrySnapshot = {
  mainMemoryMb: number;
  totalStations: number;
  listeningRelays: number;
  relayProcesses: number;
  runningRelays: number;
  startingRelays: number;
  stoppedRelays: number;
  errorRelays: number;
  startupInProgress: boolean;
  lastStartAt: string | null;
  lastStartDurationMs: number | null;
};

export type StatusEntry = {
  name: string;
  key: string;
  vars: Record<string, string | number>;
};

export type Summary = {
  totalStations: number;
  runningRelays: number;
  nextPort: number;
  relayEnabled: boolean;
  preparedRelays: number;
};

export type BackendResponse = {
  ok: boolean;
  titleKey?: string;
  messageKey?: string;
  vars?: Record<string, string | number>;
  path?: string;
  stations?: Station[];
  statuses?: StatusEntry[];
  summary?: Summary;
  environment?: EnvironmentReport;
  telemetry?: TelemetrySnapshot;
};

export type BootstrapPayload = {
  settings: AppSettings;
  stations: Station[];
  statuses: StatusEntry[];
  summary: Summary;
  environment: EnvironmentReport;
  telemetry: TelemetrySnapshot;
};

export type SearchOption = {
  value: string;
  label: string;
  count: number;
};

export type CatalogStation = {
  stationUuid: string;
  name: string;
  streamUrl: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countryCode: string;
  state: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
  clickCount: number;
  clickTrend: number;
  lastCheckOk: boolean;
  hls: boolean;
};

export type SearchFiltersPayload = {
  ok: boolean;
  titleKey?: string;
  messageKey?: string;
  countries: SearchOption[];
  languages: SearchOption[];
  tags: SearchOption[];
};

export type SearchStationsPayload = {
  ok: boolean;
  titleKey?: string;
  messageKey?: string;
  stations: CatalogStation[];
};
