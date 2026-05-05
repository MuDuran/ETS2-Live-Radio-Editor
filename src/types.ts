export type Station = {
  name: string;
  genre: string;
  language: string;
  bitrate: number;
  port: number;
  source: string;
};

export type AppSettings = {
  language: string;
  ets2Dir: string;
  ffmpegPath: string;
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
};

export type BootstrapPayload = {
  settings: AppSettings;
  stations: Station[];
  statuses: StatusEntry[];
  summary: Summary;
};
