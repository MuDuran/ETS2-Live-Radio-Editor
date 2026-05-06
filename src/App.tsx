import { useEffect, useMemo, useState } from "react";
import { supportedLanguages, translate } from "./i18n";
import paypalBadgeUrl from "../assets/icons/BUTAODOMAJOR2.png";
import type {
  AppSettings,
  BackendResponse,
  BootstrapPayload,
  CatalogStation,
  EnvironmentReport,
  SearchOption,
  Station,
  StatusEntry,
  Summary,
  TelemetrySnapshot,
  ThemeSettings,
} from "./types";

type ViewKey = "radios" | "runtime" | "settings";
type SortKey = "index" | "name" | "source" | "genre" | "language" | "bitrate";
type SortDirection = "asc" | "desc";
type IconName = "radios" | "runtime" | "settings" | "search";
type NoticePayload = {
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

const PAGE_SIZE = 10;

const EMPTY_STATION: Station = {
  name: "",
  genre: "Rock",
  language: "PTB",
  bitrate: 128,
  port: 18100,
  source: "",
};

const DEFAULT_THEME: ThemeSettings = {
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

const PAYPAL_DONATION_URL = "https://www.paypal.com/donate/?hosted_button_id=K9MZ9W4H4V9SN";

const THEME_PRESETS: Array<{ key: string; theme: ThemeSettings }> = [
  {
    key: "appearance_preset_default",
    theme: DEFAULT_THEME,
  },
  {
    key: "appearance_preset_classic_teal",
    theme: {
      backgroundColor: "#06111a",
      surfaceColor: "#163247",
      accentColor: "#19c3c0",
      gridColor: "#5a87a5",
      textColor: "#f2fbff",
      mutedTextColor: "#90a7b8",
      buttonColor: "#124959",
      dangerColor: "#b8424d",
      highContrast: false,
    },
  },
  {
    key: "appearance_preset_amber_cab",
    theme: {
      backgroundColor: "#130d07",
      surfaceColor: "#3d2411",
      accentColor: "#f1a63f",
      gridColor: "#9b6f2e",
      textColor: "#fff3df",
      mutedTextColor: "#d0b38c",
      buttonColor: "#6f3f18",
      dangerColor: "#bb4d37",
      highContrast: false,
    },
  },
  {
    key: "appearance_preset_neutral_dark",
    theme: {
      backgroundColor: "#0e1217",
      surfaceColor: "#232c35",
      accentColor: "#78b6ff",
      gridColor: "#5d6a78",
      textColor: "#f4f8fb",
      mutedTextColor: "#a1afbc",
      buttonColor: "#314150",
      dangerColor: "#a84858",
      highContrast: false,
    },
  },
  {
    key: "appearance_preset_high_contrast",
    theme: {
      backgroundColor: "#05080c",
      surfaceColor: "#1b2631",
      accentColor: "#5ce7ff",
      gridColor: "#a9d4ff",
      textColor: "#ffffff",
      mutedTextColor: "#d0e4f6",
      buttonColor: "#1e4f66",
      dangerColor: "#ff5a68",
      highContrast: true,
    },
  },
  {
    key: "appearance_preset_ocean_cyan",
    theme: {
      backgroundColor: "#03151c",
      surfaceColor: "#0e4c5c",
      accentColor: "#58e1ff",
      gridColor: "#5aaec4",
      textColor: "#effcff",
      mutedTextColor: "#99c7d6",
      buttonColor: "#185769",
      dangerColor: "#d85968",
      highContrast: false,
    },
  },
  {
    key: "appearance_preset_forest_green",
    theme: {
      backgroundColor: "#08130d",
      surfaceColor: "#214332",
      accentColor: "#68d391",
      gridColor: "#5e9b7a",
      textColor: "#f2fff7",
      mutedTextColor: "#abc9b8",
      buttonColor: "#29513d",
      dangerColor: "#c65861",
      highContrast: false,
    },
  },
  {
    key: "appearance_preset_slate_blue",
    theme: {
      backgroundColor: "#0a1020",
      surfaceColor: "#2f3f73",
      accentColor: "#9aa7ff",
      gridColor: "#6d7fb8",
      textColor: "#f5f7ff",
      mutedTextColor: "#b5bfdc",
      buttonColor: "#384b88",
      dangerColor: "#d0617d",
      highContrast: false,
    },
  },
  {
    key: "appearance_preset_rose_night",
    theme: {
      backgroundColor: "#140b14",
      surfaceColor: "#5a2447",
      accentColor: "#ff8fc7",
      gridColor: "#b16b94",
      textColor: "#fff3fb",
      mutedTextColor: "#d7afc8",
      buttonColor: "#7a335f",
      dangerColor: "#ff6470",
      highContrast: false,
    },
  },
];

const SIDEBAR_ITEMS: Array<{ key: string; icon: IconName; view: ViewKey }> = [
  { key: "tab_radios", icon: "radios", view: "radios" },
  { key: "tab_settings", icon: "settings", view: "settings" },
];

function inferGenreFromTags(tags: string) {
  const normalized = String(tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return normalized[0] || "Various";
}

function inferLanguageCode(language: string) {
  const normalized = String(language || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  const known: Record<string, string> = {
    portuguese: "PTB",
    english: "EN",
    spanish: "ES",
    german: "DE",
    french: "FR",
    italian: "IT",
    dutch: "NL",
    greek: "GR",
  };

  if (known[normalized]) {
    return known[normalized];
  }

  if (!normalized) {
    return "INT";
  }

  return normalized.slice(0, 3).toUpperCase();
}

function normalizeHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, "#000000").replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(first: string, second: string, ratio: number) {
  const start = hexToRgb(first);
  const end = hexToRgb(second);
  const amount = Math.max(0, Math.min(1, ratio));

  return rgbToHex(
    start.r + (end.r - start.r) * amount,
    start.g + (end.g - start.g) * amount,
    start.b + (end.b - start.b) * amount
  );
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildThemeVariables(theme: ThemeSettings) {
  const background = normalizeHex(theme.backgroundColor, DEFAULT_THEME.backgroundColor);
  const surface = normalizeHex(theme.surfaceColor, DEFAULT_THEME.surfaceColor);
  const accent = normalizeHex(theme.accentColor, DEFAULT_THEME.accentColor);
  const grid = normalizeHex(theme.gridColor, DEFAULT_THEME.gridColor);
  const text = normalizeHex(theme.textColor, DEFAULT_THEME.textColor);
  const muted = normalizeHex(theme.mutedTextColor, DEFAULT_THEME.mutedTextColor);
  const button = normalizeHex(theme.buttonColor, DEFAULT_THEME.buttonColor);
  const danger = normalizeHex(theme.dangerColor, DEFAULT_THEME.dangerColor);
  const contrast = Boolean(theme.highContrast);
  const panelBase = mixHex(background, surface, contrast ? 0.78 : 0.58);
  const panelStrongBase = mixHex(background, surface, contrast ? 0.88 : 0.72);
  const panelSoftBase = mixHex(background, surface, contrast ? 0.64 : 0.42);
  const gridSurfaceBase = mixHex(panelBase, grid, contrast ? 0.28 : 0.16);
  const gridSurfaceStrongBase = mixHex(panelStrongBase, grid, contrast ? 0.38 : 0.24);
  const mutedStrong = mixHex(muted, text, contrast ? 0.28 : 0.16);
  const chipBase = mixHex(panelBase, accent, contrast ? 0.22 : 0.12);
  const rowHoverBase = mixHex(panelBase, accent, contrast ? 0.24 : 0.1);
  const rowSelectedBase = mixHex(panelStrongBase, accent, contrast ? 0.32 : 0.18);

  return {
    "--bg": background,
    "--bg-2": mixHex(background, surface, 0.28),
    "--panel": rgba(panelBase, 0.96),
    "--panel-2": rgba(panelStrongBase, 0.98),
    "--panel-3": rgba(mixHex(panelStrongBase, accent, contrast ? 0.12 : 0.06), 0.98),
    "--panel-soft": rgba(panelSoftBase, 0.82),
    "--grid-surface": rgba(gridSurfaceBase, 0.92),
    "--grid-surface-2": rgba(gridSurfaceStrongBase, 0.94),
    "--line": rgba(grid, contrast ? 0.36 : 0.18),
    "--line-strong": rgba(grid, contrast ? 0.56 : 0.34),
    "--text": text,
    "--muted": muted,
    "--muted-2": mutedStrong,
    "--accent": accent,
    "--accent-2": mixHex(accent, "#ffffff", 0.14),
    "--accent-deep": mixHex(accent, "#041219", 0.46),
    "--accent-contrast": mixHex("#041219", text, 0.06),
    "--button": button,
    "--button-2": mixHex(button, "#07131d", 0.28),
    "--danger": danger,
    "--danger-2": mixHex(danger, "#050d15", 0.28),
    "--success": contrast ? "#9fe58f" : "#7bc96f",
    "--chip-surface": rgba(chipBase, 0.92),
    "--chip-border": rgba(accent, contrast ? 0.44 : 0.22),
    "--chip-text": mixHex(text, accent, contrast ? 0.14 : 0.08),
    "--row-hover": rgba(rowHoverBase, 0.76),
    "--row-selected": rgba(rowSelectedBase, 0.9),
    "--row-selected-accent": rgba(accent, contrast ? 0.92 : 0.78),
    "--bg-glow-1": rgba(accent, contrast ? 0.22 : 0.16),
    "--bg-glow-2": rgba(mixHex(accent, "#ffffff", 0.12), contrast ? 0.16 : 0.1),
    "--bg-gradient-start": mixHex(background, "#0b1a27", 0.32),
    "--bg-gradient-end": mixHex(background, "#03080d", 0.18),
  } as Record<string, string>;
}

function AppIcon({ name }: { name: IconName }) {
  if (name === "radios") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h11A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M7 12h5" />
        <path d="M7 15h2.5" />
        <circle cx="16.5" cy="13.5" r="2.5" />
        <path d="m7 7 8-3" />
      </svg>
    );
  }

  if (name === "runtime") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v7" />
        <path d="M7.05 5.05A8 8 0 1 0 16.95 5.05" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8.75A3.25 3.25 0 1 1 8.75 12 3.25 3.25 0 0 1 12 8.75Z" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.09l.05.05a1.25 1.25 0 0 1 0 1.77l-1.02 1.02a1.25 1.25 0 0 1-1.77 0l-.05-.05a1 1 0 0 0-1.1-.2 1 1 0 0 0-.61.92V20a1.25 1.25 0 0 1-1.25 1.25h-1.45A1.25 1.25 0 0 1 11.15 20v-.07a1 1 0 0 0-.64-.92 1 1 0 0 0-1.1.2l-.05.05a1.25 1.25 0 0 1-1.77 0l-1.02-1.02a1.25 1.25 0 0 1 0-1.77l.05-.05a1 1 0 0 0 .2-1.09 1 1 0 0 0-.92-.62H4A1.25 1.25 0 0 1 2.75 13.4v-1.45A1.25 1.25 0 0 1 4 10.7h.07a1 1 0 0 0 .92-.61 1 1 0 0 0-.2-1.1l-.05-.05a1.25 1.25 0 0 1 0-1.77l1.02-1.02a1.25 1.25 0 0 1 1.77 0l.05.05a1 1 0 0 0 1.1.2 1 1 0 0 0 .62-.92V4A1.25 1.25 0 0 1 10.55 2.75H12a1.25 1.25 0 0 1 1.25 1.25v.07a1 1 0 0 0 .61.92 1 1 0 0 0 1.1-.2l.05-.05a1.25 1.25 0 0 1 1.77 0l1.02 1.02a1.25 1.25 0 0 1 0 1.77l-.05.05a1 1 0 0 0-.2 1.1 1 1 0 0 0 .92.61H20a1.25 1.25 0 0 1 1.25 1.25v1.45A1.25 1.25 0 0 1 20 14.65h-.07a1 1 0 0 0-.92.35Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

export default function App() {
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [view, setView] = useState<ViewKey>("radios");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentReport | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StatusEntry>>({});
  const [relayActionLoading, setRelayActionLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [stationDraft, setStationDraft] = useState<Station>(EMPTY_STATION);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("index");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [banner, setBanner] = useState<{ title: string; message: string; kind: "success" | "warning" | "info" } | null>(null);
  const [bannerLeaving, setBannerLeaving] = useState(false);
  const [infoDialog, setInfoDialog] = useState<{ title: string; message: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ name: string } | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFiltersLoading, setSearchFiltersLoading] = useState(false);
  const [searchFiltersAttempted, setSearchFiltersAttempted] = useState(false);
  const [searchFiltersError, setSearchFiltersError] = useState(false);
  const [searchUiState, setSearchUiState] = useState<"idle" | "loading" | "results" | "empty" | "error">("idle");
  const [streamTestLoading, setStreamTestLoading] = useState(false);
  const [catalogResults, setCatalogResults] = useState<CatalogStation[]>([]);
  const [countryOptions, setCountryOptions] = useState<SearchOption[]>([]);
  const [languageOptions, setLanguageOptions] = useState<SearchOption[]>([]);
  const [tagOptions, setTagOptions] = useState<SearchOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCountryCode, setSearchCountryCode] = useState("");
  const [searchLanguageFilter, setSearchLanguageFilter] = useState("");
  const [searchTag, setSearchTag] = useState("");

  useEffect(() => {
    window.radioApi.getBootstrap().then((payload) => {
      setBoot(payload);
      setSettings(payload.settings);
      setStations(payload.stations);
      setSummary(payload.summary);
      setEnvironment(payload.environment);
      setTelemetry(payload.telemetry);
      setStatuses(Object.fromEntries(payload.statuses.map((entry) => [entry.name, entry])));
      setWelcomeOpen(!payload.settings.hasCompletedWelcome);
      if (payload.stations.length > 0) {
        setSelectedIndex(0);
        setEditingIndex(0);
        setStationDraft(payload.stations[0]);
        setEditorOpen(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!boot) return;

    const syncRuntimeState = async () => {
      const runtimeState = await window.radioApi.getRuntimeState();
      if (runtimeState.statuses) {
        setStatuses(Object.fromEntries(runtimeState.statuses.map((entry: StatusEntry) => [entry.name, entry])));
      }
      if (runtimeState.summary) {
        setSummary(runtimeState.summary);
      }
      if (runtimeState.environment) {
        setEnvironment(runtimeState.environment);
      }
      if (runtimeState.telemetry) {
        setTelemetry(runtimeState.telemetry);
      }
    };

    syncRuntimeState();
    const timer = window.setInterval(syncRuntimeState, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [boot]);

  useEffect(() => {
    if (!searchModalOpen || searchFiltersAttempted || searchFiltersLoading) return;

    const loadFilters = async () => {
      setSearchFiltersAttempted(true);
      setSearchFiltersLoading(true);
      setSearchFiltersError(false);

      try {
        const result = await window.radioApi.getSearchFilters();
        if (!result.ok) {
          setSearchFiltersError(true);
          showResult(result);
          return;
        }

        setCountryOptions(result.countries);
        setLanguageOptions(result.languages);
        setTagOptions(result.tags);
      } catch {
        setSearchFiltersError(true);
        showResult({
          ok: false,
          titleKey: "search_catalog_error_title",
          messageKey: "search_catalog_error_body",
        });
      } finally {
        setSearchFiltersLoading(false);
      }
    };

    loadFilters();
  }, [searchModalOpen, searchFiltersAttempted, searchFiltersLoading]);

  useEffect(() => {
    const theme = settings?.theme ?? DEFAULT_THEME;
    const variables = buildThemeVariables(theme);

    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [settings?.theme]);

  const language = settings?.language ?? "pt-BR";
  const t = (key: string, vars?: Record<string, string | number>) => translate(language, key, vars);
  const currentTheme = settings?.theme ?? DEFAULT_THEME;
  const showTelemetry = settings?.showTelemetry ?? true;

  const filteredStations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return stations;
    return stations.filter((station) =>
      [station.name, station.genre, station.language, station.source, String(station.port), String(station.bitrate)]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [stations, searchTerm]);

  const sortedStations = useMemo(() => {
    const withOriginalIndex = filteredStations.map((station) => ({
      station,
      index: stations.findIndex((item) => item.name === station.name && item.port === station.port),
    }));

    withOriginalIndex.sort((left, right) => {
      let comparison = 0;
      if (sortKey === "index") {
        comparison = left.index - right.index;
      } else if (sortKey === "bitrate") {
        comparison = left.station.bitrate - right.station.bitrate;
      } else {
        const leftValue = String(left.station[sortKey]).toLowerCase();
        const rightValue = String(right.station[sortKey]).toLowerCase();
        comparison = leftValue.localeCompare(rightValue);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return withOriginalIndex;
  }, [filteredStations, stations, sortKey, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedStations.length / PAGE_SIZE));
  const pagedStations = useMemo(() => {
    const start = (pageNumber - 1) * PAGE_SIZE;
    return sortedStations.slice(start, start + PAGE_SIZE);
  }, [sortedStations, pageNumber]);

  const runtimeSummary = useMemo(() => {
    if (!summary) return "";
    if (telemetry?.startupInProgress) {
      return t("status_running_summary_starting", {
        running: summary.runningRelays,
        starting: telemetry.startingRelays,
        total: summary.preparedRelays || summary.totalStations,
      });
    }
    if (summary.relayEnabled) {
      return t("status_running_summary_armed", {
        running: summary.runningRelays,
        prepared: summary.preparedRelays,
      });
    }
    return t("status_running_summary_idle", { total: summary.totalStations });
  }, [summary, telemetry, language]);

  const selectedStation = selectedIndex === null ? null : stations[selectedIndex] ?? null;
  const selectedStatus = selectedStation ? statuses[selectedStation.name] : null;
  const selectedStatusText = selectedStatus ? t(selectedStatus.key, selectedStatus.vars) : t("status_ready");
  const relayStateLabel = summary?.relayEnabled ? t("relay_state_on") : t("relay_state_off");
  const selectedCountLabel = t("selected_count", { count: selectedStation ? 1 : 0 });
  const pageIndicator = t("page_indicator", { page: pageNumber, total: pageCount });
  const filteredCountLabel = t("station_count", { count: filteredStations.length });
  const editorModeLabel = editingIndex === null ? t("editor_mode_new") : t("editor_mode_edit");
  const editorSaveLabel = editingIndex === null ? t("editor_save_new") : t("editor_save_edit");
  const editorHint = editingIndex === null ? t("editor_hint_new") : t("editor_hint_edit", { name: selectedStation?.name ?? "-" });
  const editorBadgeLabel = editingIndex === null ? t("editor_badge_new") : t("editor_badge_edit");
  const searchHasFilters = Boolean(searchQuery.trim() || searchCountryCode || searchLanguageFilter || searchTag);
  const environmentChecking = !environment;
  const environmentReady = Boolean(environment?.ets2.liveStreamsExists && environment?.ffmpeg.exists);
  const environmentHeadline = environmentChecking ? t("env_status_checking") : environmentReady ? t("env_status_ready") : t("env_status_attention");
  const environmentBody = environmentChecking ? t("env_checking_body") : environmentReady ? t("env_ready_body") : t("env_attention_body");
  const telemetryMemoryLabel = telemetry ? t("telemetry_memory_value", { value: telemetry.mainMemoryMb }) : t("telemetry_pending_value");
  const telemetryStartupLabel = telemetry?.startupInProgress
    ? t("telemetry_starting_value", { count: telemetry.startingRelays, total: telemetry.totalStations })
    : telemetry?.lastStartDurationMs
      ? t("telemetry_last_start_value", { seconds: (telemetry.lastStartDurationMs / 1000).toFixed(1) })
      : summary?.relayEnabled
        ? t("telemetry_armed_value", { count: summary.preparedRelays })
        : t("telemetry_waiting_value");

  useEffect(() => {
    if (selectedIndex === null || !stations[selectedIndex]) return;
    setEditingIndex(selectedIndex);
    setStationDraft(stations[selectedIndex]);
    setEditorOpen(true);
  }, [selectedIndex, stations]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);

  useEffect(() => {
    if (pageNumber > pageCount) setPageNumber(pageCount);
  }, [pageCount, pageNumber]);

  useEffect(() => {
    if (!banner) return;

    setBannerLeaving(false);
    const timer = window.setTimeout(() => {
      setBannerLeaving(true);
      window.setTimeout(() => setBanner(null), 180);
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [banner]);

  function patchFromResponse(result: NoticePayload) {
    if (result.stations) setStations(result.stations);
    if (result.summary) setSummary(result.summary);
    if (result.statuses) setStatuses(Object.fromEntries(result.statuses.map((entry) => [entry.name, entry])));
    if (result.environment) setEnvironment(result.environment);
    if (result.telemetry) setTelemetry(result.telemetry);
  }

  function showResult(result: NoticePayload) {
    patchFromResponse(result);
    const title = result.titleKey ? t(result.titleKey, result.vars) : result.ok ? t("saved_title") : t("import_error_title");
    const message = result.messageKey ? t(result.messageKey, result.vars) : result.path ?? "";
    setBannerLeaving(false);
    setBanner({ title, message, kind: result.ok ? "success" : "warning" });
  }

  function dismissBanner() {
    if (!banner) return;
    setBannerLeaving(true);
    window.setTimeout(() => setBanner(null), 180);
  }

  function openInfo(title: string, message: string) {
    setInfoDialog({ title, message });
  }

  function openSearchModal() {
    if (!countryOptions.length && !languageOptions.length && !tagOptions.length) {
      setSearchFiltersAttempted(false);
    }
    setSearchUiState("idle");
    setSearchModalOpen(true);
  }

  async function saveSettings(patch: Partial<AppSettings>) {
    const next = { ...settings!, ...patch };
    setSettings(next);
    const result = await window.radioApi.saveSettings(patch);
    setSettings(result.settings);
    setEnvironment(result.environment);
  }

  function previewTheme(patch: Partial<ThemeSettings>) {
    if (!settings) return;
    setSettings({
      ...settings,
      theme: {
        ...currentTheme,
        ...patch,
      },
    });
  }

  async function saveTheme(patch: Partial<ThemeSettings>) {
    if (!settings) return;
    const nextTheme = {
      ...currentTheme,
      ...patch,
    };
    setSettings({
      ...settings,
      theme: nextTheme,
    });
    const result = await window.radioApi.saveSettings({ theme: nextTheme });
    setSettings(result.settings);
    setEnvironment(result.environment);
  }

  async function applyThemePreset(theme: ThemeSettings) {
    if (!settings) return;
    previewTheme(theme);
    await saveTheme(theme);
  }

  async function toggleTelemetryVisibility() {
    if (!settings) return;
    await saveSettings({ showTelemetry: !showTelemetry });
  }

  function openPayPalDonation() {
    void window.radioApi.openExternal(PAYPAL_DONATION_URL);
  }

  async function applyLanguage(nextLanguage: string) {
    await saveSettings({ language: nextLanguage });
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function sortIndicator(column: SortKey) {
    if (sortKey !== column) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function startNewRadio() {
    setView("radios");
    setSelectedIndex(null);
    setEditingIndex(null);
    setStationDraft({ ...EMPTY_STATION, port: summary?.nextPort ?? 18100 });
    setEditorOpen(true);
  }

  async function addCatalogStation(station: CatalogStation) {
    const stationToAdd = {
      name: station.name,
      genre: inferGenreFromTags(station.tags),
      language: inferLanguageCode(station.language),
      bitrate: station.bitrate > 0 ? station.bitrate : 128,
      port: summary?.nextPort ?? 18100,
      source: station.streamUrl,
    };

    const result = await window.radioApi.addStation(stationToAdd);
    showResult(result);

    if (result.stations) {
      const newIndex = result.stations.findIndex((item) => item.name === stationToAdd.name && item.port === stationToAdd.port);
      if (newIndex >= 0) {
        setSelectedIndex(newIndex);
        setEditingIndex(newIndex);
        setStationDraft(result.stations[newIndex]);
      }
      setEditorOpen(true);
      setSearchModalOpen(false);
    }
  }

  async function saveStationDraft() {
    const result =
      editingIndex === null
        ? await window.radioApi.addStation(stationDraft)
        : await window.radioApi.updateStation(editingIndex, stationDraft);
    showResult(result);
    if (result.stations && editingIndex === null) {
      const newIndex = result.stations.findIndex((item) => item.name === stationDraft.name && item.port === stationDraft.port);
      setSelectedIndex(newIndex >= 0 ? newIndex : 0);
    }
    setEditorOpen(true);
  }

  function closeEditor() {
    setSelectedIndex(null);
    setEditingIndex(null);
    setStationDraft({ ...EMPTY_STATION, port: summary?.nextPort ?? 18100 });
    setEditorOpen(false);
  }

  async function deleteSelectedStation() {
    if (!deleteDialog) return;

    const result = await window.radioApi.deleteStations([deleteDialog.name]);
    showResult(result);
    setDeleteDialog(null);
    if (result.stations && result.stations.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(null);
      setEditingIndex(null);
      setStationDraft({ ...EMPTY_STATION, port: summary?.nextPort ?? 18100 });
      setEditorOpen(false);
    }
  }

  async function performCatalogSearch() {
    if (!searchHasFilters) {
      setSearchUiState("idle");
      setBanner({
        title: t("search_empty_filters_title"),
        message: t("search_empty_filters_body"),
        kind: "warning",
      });
      return;
    }

    setSearchLoading(true);
    setSearchUiState("loading");
    setCatalogResults([]);

    try {
      const result = await window.radioApi.searchStations({
        query: searchQuery.trim(),
        countryCode: searchCountryCode,
        language: searchLanguageFilter,
        tag: searchTag,
      });

      if (!result.ok) {
        setSearchUiState("error");
        showResult(result);
        return;
      }

      setCatalogResults(result.stations);
      setSearchUiState(result.stations.length > 0 ? "results" : "empty");
      setBanner({
        title: t("search_results_title"),
        message: t("search_results_body", { count: result.stations.length }),
        kind: result.stations.length > 0 ? "success" : "info",
      });
    } catch {
      setSearchUiState("error");
      showResult({
        ok: false,
        titleKey: "search_catalog_error_title",
        messageKey: "search_catalog_error_body",
      });
    } finally {
      setSearchLoading(false);
    }
  }

  async function testCurrentStream() {
    setStreamTestLoading(true);
    const result = await window.radioApi.testStreamUrl(stationDraft.source);
    setStreamTestLoading(false);
    showResult(result);
  }

  async function importFromETS2() {
    const result = await window.radioApi.importETS2();
    showResult(result);
    if (result.ok) {
      setSelectedIndex(0);
      setEditorOpen(false);
    }
  }

  async function startRelays() {
    setRelayActionLoading(true);
    try {
      const result = await window.radioApi.startRelays();
      showResult(result);
    } finally {
      setRelayActionLoading(false);
    }
  }

  async function stopRelays() {
    setRelayActionLoading(true);
    try {
      const result = await window.radioApi.stopRelays();
      showResult(result);
    } finally {
      setRelayActionLoading(false);
    }
  }

  async function toggleRelayPower() {
    if (summary!.relayEnabled) {
      await stopRelays();
    } else {
      await startRelays();
    }
  }

  if (!boot || !settings || !summary) {
    return <div className="loading-shell">Loading...</div>;
  }

  return (
    <div className="desktop-shell">
      <aside className="left-sidebar">
        <div className="sidebar-top">
          <button
            className={summary.relayEnabled ? "brand-panel relay-on" : "brand-panel relay-off"}
            onClick={toggleRelayPower}
            disabled={relayActionLoading}
          >
            <div className="brand-mark" aria-hidden="true">
              <span className="brand-power-icon">
                <AppIcon name="runtime" />
              </span>
            </div>

            <div className="brand-copy">
              <div className="brand-heading-row">
                <span className="panel-kicker">{t("app_title")}</span>
                <span className={summary.relayEnabled ? "relay-state-pill on" : "relay-state-pill off"}>{relayStateLabel}</span>
              </div>
              <strong>ET2</strong>
              <span className="brand-subtitle">RADIO RELAYS</span>
              <small>{runtimeSummary}</small>
            </div>
          </button>

          <nav className="sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => {
              const active = item.view === view;
              const label = t(item.key);
              return (
                <button key={item.key} className={active ? "sidebar-link active" : "sidebar-link"} onClick={() => setView(item.view)}>
                  <span className="sidebar-icon">
                    <AppIcon name={item.icon} />
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {showTelemetry && (
            <div className="telemetry-card">
              <div className="env-head telemetry-head">
                <div>
                  <span>{t("telemetry_title")}</span>
                  <strong className="env-neutral">{telemetry?.startupInProgress ? t("telemetry_live_badge") : t("telemetry_idle_badge")}</strong>
                </div>
              </div>
              <div className="telemetry-grid">
                <div className="telemetry-metric">
                  <span>{t("telemetry_memory_label")}</span>
                  <strong>{telemetryMemoryLabel}</strong>
                </div>
                <div className="telemetry-metric">
                  <span>{t("telemetry_relays_label")}</span>
                  <strong>{telemetry?.runningRelays ?? 0}</strong>
                </div>
                <div className="telemetry-metric">
                  <span>{t("telemetry_errors_label")}</span>
                  <strong>{telemetry?.errorRelays ?? 0}</strong>
                </div>
                <div className="telemetry-metric">
                  <span>{t("telemetry_processes_label")}</span>
                  <strong>{telemetry?.relayProcesses ?? 0}</strong>
                </div>
                <div className="telemetry-metric">
                  <span>{t("telemetry_listening_label")}</span>
                  <strong>{telemetry?.listeningRelays ?? summary.preparedRelays ?? 0}</strong>
                </div>
              </div>
              <p className="telemetry-note">{telemetryStartupLabel}</p>
            </div>
          )}

          <div className="sidebar-support">
            <button className="paypal-badge-button" onClick={openPayPalDonation}>
              <img src={paypalBadgeUrl} alt="" aria-hidden="true" className="paypal-badge-image" />
              <strong className="paypal-badge-label">{t("support_paypal_button")}</strong>
            </button>
          </div>
        </div>
      </aside>

      <main className="workspace-shell">
        <header className="app-topbar">
          <div className="topbar-heading">
            {view !== "settings" && <p className="section-kicker">{t("table_section_kicker")}</p>}
            <strong>{view === "radios" ? t("radios_title") : t("settings_title")}</strong>
          </div>

          {view === "radios" && (
            <>
              <div className="toolbar-cluster">
                <button className="toolbar-button primary" onClick={openSearchModal}>
                  {t("search_open_button")}
                </button>
                <button className="toolbar-button" onClick={startNewRadio}>
                  + {t("manual_add_button")}
                </button>
                <button className="toolbar-button" onClick={importFromETS2}>
                  {t("import_from_ets2")}
                </button>
                <button
                  className="toolbar-button danger"
                  onClick={() => {
                    if (!selectedStation) {
                      showResult({ ok: false, titleKey: "warn_nothing_selected_title", messageKey: "warn_nothing_selected_body" });
                      return;
                    }
                    setDeleteDialog({ name: selectedStation.name });
                  }}
                >
                  {t("delete_selected_button")}
                </button>
              </div>

              <div className="toolbar-tools">
                <div className="search-shell">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t("search_placeholder")}
                  />
                  <span className="search-icon">
                    <AppIcon name="search" />
                  </span>
                </div>
              </div>
            </>
          )}
        </header>

        {view === "radios" && (
          <section className={editorOpen ? "control-room-grid editor-visible" : "control-room-grid editor-hidden"}>
            <div className="table-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">{t("table_section_kicker")}</p>
                  <h2>{t("radios_title")}</h2>
                </div>

                <div className="section-head-meta">
                  <span className="info-chip">{filteredCountLabel}</span>
                  <span className="info-chip subtle">{selectedCountLabel}</span>
                </div>
              </div>

              <div className="radio-table-wrap">
                {pagedStations.length > 0 ? (
                  <table className="radio-table">
                    <thead>
                      <tr>
                        <th>
                          <button className="sort-button" onClick={() => toggleSort("index")}>
                            # {sortIndicator("index")}
                          </button>
                        </th>
                        <th>
                          <button className="sort-button" onClick={() => toggleSort("name")}>
                            {t("col_name")} {sortIndicator("name")}
                          </button>
                        </th>
                        <th>
                          <button className="sort-button" onClick={() => toggleSort("source")}>
                            {t("field_source")} {sortIndicator("source")}
                          </button>
                        </th>
                        <th>
                          <button className="sort-button" onClick={() => toggleSort("genre")}>
                            {t("field_genre")} {sortIndicator("genre")}
                          </button>
                        </th>
                        <th>
                          <button className="sort-button" onClick={() => toggleSort("language")}>
                            {t("field_language")} {sortIndicator("language")}
                          </button>
                        </th>
                        <th>
                          <button className="sort-button" onClick={() => toggleSort("bitrate")}>
                            {t("field_bitrate")} {sortIndicator("bitrate")}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStations.map(({ station, index: originalIndex }, rowIndex) => {
                        const selected = selectedIndex === originalIndex;
                        return (
                          <tr
                            key={`${station.name}-${station.port}`}
                            className={selected ? "selected-row" : undefined}
                            onClick={() => setSelectedIndex(originalIndex)}
                          >
                            <td>{(pageNumber - 1) * PAGE_SIZE + rowIndex + 1}</td>
                            <td className="station-name-cell">
                              <strong>{station.name}</strong>
                              <span>127.0.0.1:{station.port}</span>
                            </td>
                            <td className="table-url">{station.source}</td>
                            <td>{station.genre}</td>
                            <td>{station.language}</td>
                            <td>{station.bitrate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <strong>{t("table_empty_title")}</strong>
                    <p>{t("table_empty_body")}</p>
                  </div>
                )}
              </div>

              <footer className="table-footer">
                <span>{selectedCountLabel}</span>
                <span>{pageIndicator}</span>
                <div className="pagination-controls">
                  <button className="page-button" disabled={pageNumber === 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
                    {t("pagination_prev")}
                  </button>
                  <button className="page-button" disabled={pageNumber === pageCount} onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}>
                    {t("pagination_next")}
                  </button>
                </div>
                <strong>{runtimeSummary}</strong>
              </footer>
            </div>

            <aside className="editor-card">
              <div className={editorOpen ? "editor-panel is-open" : "editor-panel is-idle"}>
                {editorOpen ? (
                  <>
                    <div className="section-head compact editor-head">
                      <div>
                        <p className="section-kicker">{editorModeLabel}</p>
                        <h3>{t("editor_title")}</h3>
                      </div>
                      <div className="editor-head-actions">
                        <span className={editingIndex === null ? "editor-mode-badge new" : "editor-mode-badge"}>
                          {editorBadgeLabel}
                        </span>
                        <button className="circle-tool" onClick={closeEditor} aria-label={t("editor_close_button")}>
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="editor-status-card">
                      <strong>{editorHint}</strong>
                      <span>{selectedStatusText}</span>
                    </div>

                    <p className="editor-copy">{t("editor_body")}</p>
                    <div className="editor-help-callout">
                      <strong>{t("manual_help_title")}</strong>
                      <p>{t("manual_help_body")}</p>
                    </div>

                    <div className="editor-form">
                      <label>
                        <span>{t("field_name")}</span>
                        <input value={stationDraft.name} onChange={(event) => setStationDraft({ ...stationDraft, name: event.target.value })} />
                      </label>

                      <label>
                        <span>{t("field_source")}</span>
                        <input value={stationDraft.source} onChange={(event) => setStationDraft({ ...stationDraft, source: event.target.value })} />
                      </label>

                      <label>
                        <span>{t("field_genre")}</span>
                        <input value={stationDraft.genre} onChange={(event) => setStationDraft({ ...stationDraft, genre: event.target.value })} />
                      </label>

                      <label>
                        <span>{t("field_language")}</span>
                        <input value={stationDraft.language} onChange={(event) => setStationDraft({ ...stationDraft, language: event.target.value })} />
                      </label>

                      <label>
                        <span>{t("field_bitrate")}</span>
                        <input
                          type="number"
                          value={stationDraft.bitrate}
                          onChange={(event) => setStationDraft({ ...stationDraft, bitrate: Number(event.target.value) })}
                        />
                      </label>

                      <label>
                        <span>{t("field_port")}</span>
                        <input
                          type="number"
                          value={stationDraft.port}
                          onChange={(event) => setStationDraft({ ...stationDraft, port: Number(event.target.value) })}
                        />
                      </label>
                    </div>

                    <div className="editor-actions">
                      <button className="editor-cancel" onClick={testCurrentStream} disabled={streamTestLoading}>
                        {streamTestLoading ? t("search_test_loading") : t("search_test_button")}
                      </button>
                      <button className="editor-cancel" onClick={closeEditor}>
                        {t("cancel_button")}
                      </button>
                      <button className="editor-save" onClick={saveStationDraft}>
                        {editorSaveLabel}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="editor-idle-state">
                    <strong>{t("editor_idle_title")}</strong>
                    <p>{t("editor_idle_body")}</p>
                  </div>
                )}
              </div>
            </aside>
          </section>
        )}

        {view === "settings" && (
          <section className="support-grid">
            <article className="support-card full">
              <div className="settings-subsection">
                <div className="section-head compact">
                  <h3>{t("language_section_title")}</h3>
                </div>

                <label className="support-field narrow">
                  <span>{t("change_language")}</span>
                  <select value={settings.language} onChange={(event) => applyLanguage(event.target.value)}>
                    {Object.entries(supportedLanguages).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="settings-section">
                <div className="section-head compact">
                  <h3>{t("config_title")}</h3>
                  <button className="circle-tool" onClick={() => openInfo(t("config_info_title"), t("config_info_body"))}>
                    i
                  </button>
                </div>

                <label className="support-field">
                  <span>{t("ets2_dir")}</span>
                  <input
                    value={settings.ets2Dir}
                    onChange={(event) => setSettings({ ...settings, ets2Dir: event.target.value })}
                    onBlur={() => saveSettings({ ets2Dir: settings.ets2Dir })}
                  />
                </label>

                <label className="support-field">
                  <span>{t("ffmpeg_path")}</span>
                  <input
                    value={settings.ffmpegPath}
                    onChange={(event) => setSettings({ ...settings, ffmpegPath: event.target.value })}
                    onBlur={() => saveSettings({ ffmpegPath: settings.ffmpegPath })}
                  />
                </label>

                <div className="diagnostics-summary">
                  <div className="env-head">
                    <span>{t("environment_status_title")}</span>
                    <strong className={environmentChecking ? "env-neutral" : environmentReady ? "env-ok" : "env-warning"}>{environmentHeadline}</strong>
                  </div>
                  <p>{environmentBody}</p>
                </div>

                <div className="settings-diagnostics">
                  <div className="diagnostic-item">
                    <span>{t("settings_ets2_status_label")}</span>
                    <strong>
                      {environmentChecking
                        ? t("env_checking_short")
                        : environment?.ets2.liveStreamsExists
                          ? t("env_check_ready")
                          : environment?.ets2.folderExists
                            ? t("env_check_partial")
                            : t("env_check_missing")}
                    </strong>
                    <small>{environment?.ets2.liveStreamsPath ?? settings.ets2Dir}</small>
                  </div>
                  <div className="diagnostic-item">
                    <span>{t("settings_ffmpeg_status_label")}</span>
                    <strong>{environmentChecking ? t("env_checking_short") : environment?.ffmpeg.exists ? t("env_check_ready") : t("env_check_missing")}</strong>
                    <small>{environment?.ffmpeg.path ?? settings.ffmpegPath}</small>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="section-head compact">
                  <div>
                    <h3>{t("appearance_section_title")}</h3>
                    <p className="settings-inline-copy">{t("appearance_section_body")}</p>
                  </div>
                  <button className="toolbar-button" onClick={() => saveTheme(DEFAULT_THEME)}>
                    {t("appearance_reset_button")}
                  </button>
                </div>

                <div className="theme-presets">
                  {THEME_PRESETS.map((preset) => (
                    <button key={preset.key} className="theme-preset-button" onClick={() => void applyThemePreset(preset.theme)}>
                      {t(preset.key)}
                    </button>
                  ))}
                </div>

                <div className="theme-grid">
                  <label className="theme-field">
                    <span>{t("appearance_background_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.backgroundColor}
                        onChange={(event) => previewTheme({ backgroundColor: event.target.value })}
                        onBlur={() => saveTheme({ backgroundColor: currentTheme.backgroundColor })}
                      />
                      <code>{currentTheme.backgroundColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_surface_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.surfaceColor}
                        onChange={(event) => previewTheme({ surfaceColor: event.target.value })}
                        onBlur={() => saveTheme({ surfaceColor: currentTheme.surfaceColor })}
                      />
                      <code>{currentTheme.surfaceColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_accent_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.accentColor}
                        onChange={(event) => previewTheme({ accentColor: event.target.value })}
                        onBlur={() => saveTheme({ accentColor: currentTheme.accentColor })}
                      />
                      <code>{currentTheme.accentColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_grid_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.gridColor}
                        onChange={(event) => previewTheme({ gridColor: event.target.value })}
                        onBlur={() => saveTheme({ gridColor: currentTheme.gridColor })}
                      />
                      <code>{currentTheme.gridColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_text_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.textColor}
                        onChange={(event) => previewTheme({ textColor: event.target.value })}
                        onBlur={() => saveTheme({ textColor: currentTheme.textColor })}
                      />
                      <code>{currentTheme.textColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_muted_text_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.mutedTextColor}
                        onChange={(event) => previewTheme({ mutedTextColor: event.target.value })}
                        onBlur={() => saveTheme({ mutedTextColor: currentTheme.mutedTextColor })}
                      />
                      <code>{currentTheme.mutedTextColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_button_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.buttonColor}
                        onChange={(event) => previewTheme({ buttonColor: event.target.value })}
                        onBlur={() => saveTheme({ buttonColor: currentTheme.buttonColor })}
                      />
                      <code>{currentTheme.buttonColor}</code>
                    </div>
                  </label>

                  <label className="theme-field">
                    <span>{t("appearance_danger_label")}</span>
                    <div className="theme-control">
                      <input
                        type="color"
                        value={currentTheme.dangerColor}
                        onChange={(event) => previewTheme({ dangerColor: event.target.value })}
                        onBlur={() => saveTheme({ dangerColor: currentTheme.dangerColor })}
                      />
                      <code>{currentTheme.dangerColor}</code>
                    </div>
                  </label>
                </div>

                <label className="theme-toggle">
                  <input
                    type="checkbox"
                    checked={currentTheme.highContrast}
                    onChange={(event) => {
                      previewTheme({ highContrast: event.target.checked });
                      void saveTheme({ highContrast: event.target.checked });
                    }}
                  />
                  <div>
                    <strong>{t("appearance_contrast_label")}</strong>
                    <span>{t("appearance_contrast_body")}</span>
                  </div>
                </label>

                <label className="theme-toggle">
                  <input type="checkbox" checked={showTelemetry} onChange={() => void toggleTelemetryVisibility()} />
                  <div>
                    <strong>{t("telemetry_toggle_label")}</strong>
                    <span>{t("telemetry_toggle_body")}</span>
                  </div>
                </label>
              </div>

              <div className="help-box">
                <button className="accordion-toggle refined" onClick={() => setHelpOpen((value) => !value)}>
                  {helpOpen ? `${t("how_to_use_button")} ▾` : `${t("how_to_use_button")} ▸`}
                </button>
                {helpOpen && (
                  <pre className="help-content">
                    {[
                      t("help_title_usage"),
                      t("help_usage_1"),
                      t("help_usage_2"),
                      t("help_usage_3"),
                      t("help_usage_4"),
                      t("help_usage_5"),
                      t("help_usage_6"),
                      t("help_usage_7"),
                      "",
                      t("help_title_fields"),
                      t("help_fields_1"),
                      t("help_fields_2"),
                      t("help_fields_3"),
                      t("help_fields_4"),
                      t("help_fields_5"),
                      t("help_fields_6"),
                      "",
                      t("help_title_sync"),
                      t("help_sync_1"),
                      t("help_sync_2"),
                    ].join("\n")}
                  </pre>
                )}
              </div>
            </article>
          </section>
        )}
      </main>

      {welcomeOpen && (
        <div className="overlay">
          <div className="welcome-modal compact-welcome">
            <p className="eyebrow">{t("welcome_title")}</p>
            <h2>{t("welcome_heading")}</h2>
            <pre>{t("welcome_body")}</pre>
            <label className="support-field narrow">
              <span>{t("language_label")}</span>
              <select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value })}>
                {Object.entries(supportedLanguages).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button
                className="editor-save"
                onClick={async () => {
                  await saveSettings({
                    language: settings.language,
                    hasCompletedWelcome: true,
                  });
                  setWelcomeOpen(false);
                }}
              >
                {t("continue_button")}
              </button>
            </div>
          </div>
        </div>
      )}

      {banner && (
        <div className="toast-stack" onClick={dismissBanner}>
          <div className={`toast-card ${banner.kind} ${bannerLeaving ? "leaving" : "entering"}`} onClick={(event) => event.stopPropagation()}>
            <strong>{banner.title}</strong>
            <p>{banner.message}</p>
          </div>
        </div>
      )}

      {searchModalOpen && (
        <div className="overlay" onClick={() => setSearchModalOpen(false)}>
          <div className="search-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-head compact">
              <div>
                <p className="section-kicker">{t("search_modal_kicker")}</p>
                <h3>{t("search_modal_title")}</h3>
              </div>
              <button className="circle-tool" onClick={() => setSearchModalOpen(false)}>
                ×
              </button>
            </div>

            <p className="support-text">{t("search_modal_body")}</p>

            <div className="search-form-grid">
              <label className="support-field">
                <span>{t("search_query_label")}</span>
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("search_query_placeholder")} />
              </label>

              <label className="support-field">
                <span>{t("search_country_label")}</span>
                <select value={searchCountryCode} onChange={(event) => setSearchCountryCode(event.target.value)} disabled={searchFiltersLoading}>
                  <option value="">{t("search_any_option")}</option>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="support-field">
                <span>{t("search_language_filter_label")}</span>
                <select value={searchLanguageFilter} onChange={(event) => setSearchLanguageFilter(event.target.value)} disabled={searchFiltersLoading}>
                  <option value="">{t("search_any_option")}</option>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="support-field">
                <span>{t("search_tag_label")}</span>
                <select value={searchTag} onChange={(event) => setSearchTag(event.target.value)} disabled={searchFiltersLoading}>
                  <option value="">{t("search_any_option")}</option>
                  {tagOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="search-modal-actions">
              <button
                className="toolbar-button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchCountryCode("");
                  setSearchLanguageFilter("");
                  setSearchTag("");
                  setCatalogResults([]);
                  setSearchUiState("idle");
                }}
              >
                {t("search_clear_button")}
              </button>
              <button className="toolbar-button primary" onClick={performCatalogSearch} disabled={searchLoading}>
                {searchLoading ? t("search_loading_button") : t("search_submit_button")}
              </button>
            </div>

            <div className="search-results-shell">
              {searchFiltersLoading ? (
                <div className="empty-state compact">
                  <strong>{t("search_filters_loading_title")}</strong>
                  <p>{t("search_filters_loading_body")}</p>
                </div>
              ) : searchLoading ? (
                <div className="search-loading-shell" aria-live="polite">
                  <div className="search-loading-copy">
                    <strong>{t("search_loading_title")}</strong>
                    <p>{t("search_loading_body")}</p>
                  </div>
                  <div className="catalog-loading-grid">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="catalog-loading-card">
                        <span className="loading-line title" />
                        <span className="loading-line subtitle" />
                        <div className="loading-chip-row">
                          <span className="loading-chip" />
                          <span className="loading-chip" />
                          <span className="loading-chip" />
                        </div>
                        <span className="loading-line body" />
                        <span className="loading-line body short" />
                        <div className="loading-button-row">
                          <span className="loading-button" />
                          <span className="loading-button accent" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : catalogResults.length > 0 ? (
                <div className="catalog-results">
                  {catalogResults.map((station) => (
                    <article key={station.stationUuid} className="catalog-card">
                      <div className="catalog-card-head">
                        <div>
                          <strong>{station.name}</strong>
                          <span>{station.country || t("search_unknown_country")} • {station.language || t("search_unknown_language")}</span>
                        </div>
                        <span className={station.lastCheckOk ? "catalog-health ok" : "catalog-health warning"}>
                          {station.lastCheckOk ? t("search_status_ok") : t("search_status_check")}
                        </span>
                      </div>

                      <div className="catalog-meta">
                        <span>{station.codec || "?"}</span>
                        <span>{station.bitrate || 0} kbps</span>
                        <span>{station.hls ? "HLS" : "Direct"}</span>
                      </div>

                      <p className="catalog-tags">{station.tags || t("search_no_tags")}</p>

                      <div className="catalog-card-actions">
                        <button
                          className="toolbar-button"
                          onClick={() => window.radioApi.openExternal(station.homepage)}
                          disabled={!station.homepage}
                        >
                          {t("search_open_site_button")}
                        </button>
                        <button className="toolbar-button primary" onClick={() => addCatalogStation(station)}>
                          {t("search_add_button")}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : searchUiState === "error" ? (
                <div className="empty-state compact">
                  <strong>{t("search_catalog_error_title")}</strong>
                  <p>{t("search_catalog_error_body")}</p>
                </div>
              ) : searchFiltersError ? (
                <div className="empty-state compact">
                  <strong>{t("search_filters_error_title")}</strong>
                  <p>{t("search_filters_error_body")}</p>
                </div>
              ) : (
                <div className="empty-state compact">
                  <strong>{searchUiState === "empty" ? t("search_no_results_title") : t("search_start_title")}</strong>
                  <p>{searchUiState === "empty" ? t("search_no_results_body") : t("search_start_body")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {infoDialog && (
        <div className="overlay" onClick={() => setInfoDialog(null)}>
          <div
            className="info-modal"
            onClick={(event) => {
              event.stopPropagation();
              setInfoDialog(null);
            }}
          >
            <h3>{infoDialog.title}</h3>
            <p>{infoDialog.message}</p>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="overlay" onClick={() => setDeleteDialog(null)}>
          <div className="info-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t("confirm_delete_single_title")}</h3>
            <p>{t("confirm_delete_single_body", { name: deleteDialog.name })}</p>
            <div className="modal-actions confirm-actions">
              <button className="editor-cancel" onClick={() => setDeleteDialog(null)}>
                {t("cancel_button")}
              </button>
              <button className="editor-save danger-fill" onClick={deleteSelectedStation}>
                {t("confirm_delete_button")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
