import { useEffect, useMemo, useState } from "react";
import { translate, supportedLanguages } from "./i18n";
import type { AppSettings, BackendResponse, BootstrapPayload, Station, StatusEntry, Summary } from "./types";

type PageKey = "runtime" | "radios" | "settings";

const EMPTY_STATION: Station = {
  name: "",
  genre: "Pop",
  language: "PTB",
  bitrate: 128,
  port: 18100,
  source: "",
};

export default function App() {
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [page, setPage] = useState<PageKey>("runtime");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StatusEntry>>({});
  const [checkedNames, setCheckedNames] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [stationDraft, setStationDraft] = useState<Station>(EMPTY_STATION);
  const [banner, setBanner] = useState<{ title: string; message: string; kind: "success" | "warning" | "info" } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    window.radioApi.getBootstrap().then((payload) => {
      setBoot(payload);
      setSettings(payload.settings);
      setStations(payload.stations);
      setSummary(payload.summary);
      setStatuses(Object.fromEntries(payload.statuses.map((entry) => [entry.name, entry])));
    });
  }, []);

  const language = settings?.language ?? "pt-BR";
  const t = (key: string, vars?: Record<string, string | number>) => translate(language, key, vars);

  const runtimeSummary = useMemo(() => {
    if (!summary) return "";
    return t("status_running_summary", { running: summary.runningRelays, total: summary.totalStations });
  }, [summary, language]);

  const selectedStation = selectedIndex !== null ? stations[selectedIndex] : null;
  const selectedStatus = selectedStation ? statuses[selectedStation.name] : null;

  const helperText = useMemo(() => {
    if (checkedNames.length) {
      return t("helper_checked_count", { count: checkedNames.length });
    }
    return t("helper_ready");
  }, [checkedNames.length, language]);

  function patchFromResponse(result: BackendResponse) {
    if (result.stations) setStations(result.stations);
    if (result.summary) setSummary(result.summary);
    if (result.statuses) setStatuses(Object.fromEntries(result.statuses.map((entry) => [entry.name, entry])));
  }

  function showResult(result: BackendResponse) {
    patchFromResponse(result);
    const title = result.titleKey ? t(result.titleKey, result.vars) : result.ok ? t("saved_title") : t("import_error_title");
    const message = result.messageKey ? t(result.messageKey, result.vars) : result.path ?? "";
    setBanner({ title, message, kind: result.ok ? "success" : "warning" });
  }

  async function saveSettings(patch: Partial<AppSettings>) {
    const next = { ...settings!, ...patch };
    setSettings(next);
    await window.radioApi.saveSettings(patch);
  }

  async function applyLanguage(nextLanguage: string) {
    await saveSettings({ language: nextLanguage });
  }

  function toggleChecked(name: string) {
    setCheckedNames((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  function openNewStation() {
    setEditingIndex(null);
    setStationDraft({ ...EMPTY_STATION, port: summary?.nextPort ?? 18100 });
    setEditorOpen(true);
  }

  function openEditStation() {
    if (selectedIndex === null) {
      setBanner({
        title: t("warn_nothing_selected_title"),
        message: t("warn_nothing_selected_body"),
        kind: "warning",
      });
      return;
    }
    setEditingIndex(selectedIndex);
    setStationDraft(stations[selectedIndex]);
    setEditorOpen(true);
  }

  async function saveStationDraft() {
    const result =
      editingIndex === null
        ? await window.radioApi.addStation(stationDraft)
        : await window.radioApi.updateStation(editingIndex, stationDraft);
    showResult(result);
    if (result.ok) {
      setEditorOpen(false);
      setEditingIndex(null);
    }
  }

  async function deleteCheckedStations() {
    const result = await window.radioApi.deleteStations(checkedNames);
    showResult(result);
    if (result.ok) {
      setCheckedNames([]);
      setSelectedIndex(null);
    }
  }

  async function saveStations() {
    const result = await window.radioApi.saveStations();
    showResult(result);
  }

  if (!boot || !settings || !summary) {
    return <div className="loading-shell">Loading...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">ETS2 Control Room</p>
          <h1>{t("app_title")}</h1>
          <p>{t("app_subtitle")}</p>
        </div>

        <nav className="side-nav">
          <button className={page === "runtime" ? "nav-button active" : "nav-button"} onClick={() => setPage("runtime")}>
            {t("tab_runtime")}
          </button>
          <button className={page === "radios" ? "nav-button active" : "nav-button"} onClick={() => setPage("radios")}>
            {t("tab_radios")}
          </button>
          <button className={page === "settings" ? "nav-button active" : "nav-button"} onClick={() => setPage("settings")}>
            {t("tab_settings")}
          </button>
        </nav>

        <div className="side-note">
          <span className="note-pulse" />
          <div>
            <strong>{t("metric_running")}</strong>
            <p>{summary.runningRelays}</p>
          </div>
        </div>

        <div className="warning-card">
          <span>{t("footer_warning")}</span>
        </div>
      </aside>

      <main className="main-panel">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Control Room</p>
            <h2>{t("app_title")}</h2>
            <p>{t("app_subtitle")}</p>
          </div>

          <div className="hero-stats">
            <article className="stat-card accent">
              <span>{t("metric_total")}</span>
              <strong>{summary.totalStations}</strong>
            </article>
            <article className="stat-card cyan">
              <span>{t("metric_running")}</span>
              <strong>{summary.runningRelays}</strong>
            </article>
            <article className="stat-card amber">
              <span>{t("metric_next_port")}</span>
              <strong>{summary.nextPort}</strong>
            </article>
          </div>
        </section>

        {page === "runtime" && (
          <section className="page-grid runtime-grid">
            <article className="panel-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">{t("config_title")}</p>
                  <h3>{t("config_title")}</h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() =>
                    setBanner({
                      title: t("config_info_title"),
                      message: t("config_info_body"),
                      kind: "info",
                    })
                  }
                >
                  ⓘ
                </button>
              </div>

              <p className="muted">{t("config_body")}</p>

              <label className="field-block">
                <span>{t("ets2_dir")}</span>
                <input value={settings.ets2Dir} onChange={(event) => setSettings({ ...settings, ets2Dir: event.target.value })} onBlur={() => saveSettings({ ets2Dir: settings.ets2Dir })} />
              </label>

              <label className="field-block">
                <span>{t("ffmpeg_path")}</span>
                <input value={settings.ffmpegPath} onChange={(event) => setSettings({ ...settings, ffmpegPath: event.target.value })} onBlur={() => saveSettings({ ffmpegPath: settings.ffmpegPath })} />
              </label>
            </article>

            <article className="panel-card action-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">{t("runtime_title")}</p>
                  <h3>{t("runtime_title")}</h3>
                </div>
              </div>

              <p className="muted">{t("runtime_body")}</p>

              <div className="stack-actions">
                <button className="primary-button" onClick={() => window.radioApi.syncETS2().then(showResult)}>
                  {t("sync_button")}
                </button>
                <button className="primary-button" onClick={() => window.radioApi.startRelays().then(showResult)}>
                  {t("start_button")}
                </button>
                <button className="secondary-button" onClick={() => window.radioApi.stopRelays().then(showResult)}>
                  {t("stop_button")}
                </button>
              </div>
            </article>

            <article className="panel-card summary-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">{t("summary_title")}</p>
                  <h3>{t("summary_title")}</h3>
                </div>
              </div>

              <div className="summary-pills">
                <span>{runtimeSummary}</span>
              </div>

              <div className="summary-list">
                {stations.slice(0, 8).map((station) => {
                  const status = statuses[station.name];
                  return (
                    <div key={station.name} className="summary-item">
                      <div>
                        <strong>{station.name}</strong>
                        <p>{station.genre}</p>
                      </div>
                      <span>{status ? t(status.key, status.vars) : t("status_stopped")}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {page === "radios" && (
          <section className="page-grid radios-grid">
            <article className="toolbar-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">{t("radios_title")}</p>
                  <h3>{t("radios_title")}</h3>
                </div>
                <div className="toolbar-actions">
                  <button className="primary-button" onClick={openNewStation}>
                    {t("add_button")}
                  </button>
                  <button className="secondary-button" onClick={openEditStation}>
                    {t("load_form")}
                  </button>
                  <button className="secondary-button" onClick={() => window.radioApi.importETS2().then((result) => { showResult(result); if (result.ok) setCheckedNames([]); })}>
                    {t("import_from_ets2")}
                  </button>
                  <button className="secondary-button" onClick={saveStations}>
                    {t("save_button")}
                  </button>
                  <button className="danger-button" onClick={deleteCheckedStations}>
                    {t("remove_selected")}
                  </button>
                </div>
              </div>
              <p className="muted">{helperText}</p>
            </article>

            <div className="radios-layout">
              <article className="radios-list-card">
                <div className="radio-list">
                  {stations.map((station, index) => {
                    const checked = checkedNames.includes(station.name);
                    const selected = selectedIndex === index;
                    const status = statuses[station.name];
                    return (
                      <button
                        key={`${station.name}-${station.port}`}
                        className={selected ? "radio-item selected" : "radio-item"}
                        onClick={() => setSelectedIndex(index)}
                      >
                        <label className="radio-check" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={checked} onChange={() => toggleChecked(station.name)} />
                          <span />
                        </label>

                        <div className="radio-main">
                          <div className="radio-topline">
                            <strong>{station.name}</strong>
                            <span className="status-pill">{status ? t(status.key, status.vars) : t("status_stopped")}</span>
                          </div>
                          <p>{station.genre} • {station.language} • {station.bitrate} kbps</p>
                          <small>{station.source}</small>
                        </div>

                        <div className="radio-side">
                          <span>{t("col_port")}</span>
                          <strong>{station.port}</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>

              <aside className="inspector-card">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Live Inspector</p>
                    <h3>{selectedStation ? selectedStation.name : t("helper_ready")}</h3>
                  </div>
                  <span className="signal-pill">{selectedStation ? "LIVE DATA" : "IDLE"}</span>
                </div>

                {selectedStation ? (
                  <>
                    <div className="inspector-status">
                      <span>{selectedStatus ? t(selectedStatus.key, selectedStatus.vars) : t("status_stopped")}</span>
                    </div>

                    <div className="inspector-grid">
                      <div>
                        <label>{t("field_genre")}</label>
                        <strong>{selectedStation.genre}</strong>
                      </div>
                      <div>
                        <label>{t("field_language")}</label>
                        <strong>{selectedStation.language}</strong>
                      </div>
                      <div>
                        <label>{t("field_bitrate")}</label>
                        <strong>{selectedStation.bitrate} kbps</strong>
                      </div>
                      <div>
                        <label>{t("field_port")}</label>
                        <strong>{selectedStation.port}</strong>
                      </div>
                    </div>

                    <div className="inspector-source">
                      <label>{t("field_source")}</label>
                      <p>{selectedStation.source}</p>
                    </div>

                    <div className="inspector-actions">
                      <button className="primary-button" onClick={openEditStation}>{t("load_form")}</button>
                      <button className="secondary-button" onClick={() => window.radioApi.syncETS2().then(showResult)}>{t("sync_button")}</button>
                    </div>
                  </>
                ) : (
                  <div className="inspector-empty">
                    <p>{t("helper_ready")}</p>
                    <span>{t("runtime_body")}</span>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}

        {page === "settings" && (
          <section className="page-grid settings-grid">
            <article className="panel-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">{t("settings_title")}</p>
                  <h3>{t("settings_title")}</h3>
                </div>
              </div>

              <p className="muted">{t("settings_body")}</p>

              <label className="field-block">
                <span>{t("change_language")}</span>
                <select value={settings.language} onChange={(event) => applyLanguage(event.target.value)}>
                  {Object.entries(supportedLanguages).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="accordion-card">
                <button className="accordion-toggle" onClick={() => setHelpOpen((value) => !value)}>
                  {helpOpen ? `${t("how_to_use_button")} ▾` : `${t("how_to_use_button")} ▸`}
                </button>
                {helpOpen && <pre className="help-content">{[
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
                ].join("\n")}</pre>}
              </div>
            </article>
          </section>
        )}
      </main>

      {welcomeOpen && (
        <div className="overlay">
          <div className="welcome-modal">
            <p className="eyebrow">{t("welcome_title")}</p>
            <h2>{t("welcome_heading")}</h2>
            <pre>{t("welcome_body")}</pre>
            <label className="field-block">
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
                className="primary-button"
                onClick={async () => {
                  await applyLanguage(settings.language);
                  setWelcomeOpen(false);
                }}
              >
                {t("continue_button")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="overlay">
          <div className="editor-modal">
            <p className="eyebrow">{t("editor_title")}</p>
            <h2>{t("editor_title")}</h2>
            <p className="muted">{t("editor_body")}</p>

            <div className="editor-grid">
              <label className="field-block">
                <span>{t("field_name")}</span>
                <input value={stationDraft.name} onChange={(event) => setStationDraft({ ...stationDraft, name: event.target.value })} />
              </label>

              <label className="field-block span-2">
                <span>{t("field_source")}</span>
                <input value={stationDraft.source} onChange={(event) => setStationDraft({ ...stationDraft, source: event.target.value })} />
              </label>

              <label className="field-block">
                <span>{t("field_genre")}</span>
                <input value={stationDraft.genre} onChange={(event) => setStationDraft({ ...stationDraft, genre: event.target.value })} />
              </label>

              <label className="field-block">
                <span>{t("field_language")}</span>
                <input value={stationDraft.language} onChange={(event) => setStationDraft({ ...stationDraft, language: event.target.value })} />
              </label>

              <label className="field-block">
                <span>{t("field_bitrate")}</span>
                <input type="number" value={stationDraft.bitrate} onChange={(event) => setStationDraft({ ...stationDraft, bitrate: Number(event.target.value) })} />
              </label>

              <label className="field-block">
                <span>{t("field_port")}</span>
                <input type="number" value={stationDraft.port} onChange={(event) => setStationDraft({ ...stationDraft, port: Number(event.target.value) })} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditorOpen(false)}>
                {t("cancel_button")}
              </button>
              <button className="primary-button" onClick={saveStationDraft}>
                {editingIndex === null ? t("add_button") : t("update_selected")}
              </button>
            </div>
          </div>
        </div>
      )}

      {banner && (
        <div className="toast-stack" onClick={() => setBanner(null)}>
          <div className={`toast-card ${banner.kind}`}>
            <strong>{banner.title}</strong>
            <p>{banner.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
