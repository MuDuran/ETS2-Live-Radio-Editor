const RADIO_BROWSER_BASE = "https://de1.api.radio-browser.info";
const USER_AGENT = "ETS2LiveRadioEditor/0.1.0";
const REQUEST_TIMEOUT_MS = 10000;
const regionNames = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchJson(pathname, params = {}) {
  const url = new URL(pathname, RADIO_BROWSER_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    throw new Error(`radio-browser-http-${response.status}`);
  }

  return response.json();
}

function titleCaseWords(value) {
  return normalizeText(value)
    .replace(/^#/, "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mapFacetEntries(entries, valueKey = "name", labelKey = "name") {
  return entries
    .map((entry) => ({
      value: normalizeText(entry[valueKey]),
      label: normalizeText(entry[labelKey] || entry[valueKey]),
      count: normalizeNumber(entry.stationcount, 0),
    }))
    .filter((entry) => entry.value);
}

function mapCountryEntries(entries) {
  return entries
    .map((entry) => {
      const code = normalizeText(entry.name).toUpperCase();
      return {
        value: code,
        label: regionNames?.of(code) || code,
        count: normalizeNumber(entry.stationcount, 0),
      };
    })
    .filter((entry) => entry.value)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function mapLanguageEntries(entries) {
  return entries
    .map((entry) => ({
      value: normalizeText(entry.name),
      label: titleCaseWords(entry.name),
      count: normalizeNumber(entry.stationcount, 0),
    }))
    .filter((entry) => entry.value)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function mapStationResult(entry) {
  return {
    stationUuid: normalizeText(entry.stationuuid),
    name: normalizeText(entry.name),
    streamUrl: normalizeText(entry.url_resolved || entry.url),
    homepage: normalizeText(entry.homepage),
    favicon: normalizeText(entry.favicon),
    tags: normalizeText(entry.tags),
    country: normalizeText(entry.country),
    countryCode: normalizeText(entry.countrycode).toUpperCase(),
    state: normalizeText(entry.state),
    language: normalizeText(entry.language),
    codec: normalizeText(entry.codec).toUpperCase(),
    bitrate: normalizeNumber(entry.bitrate, 128),
    votes: normalizeNumber(entry.votes, 0),
    clickCount: normalizeNumber(entry.clickcount, 0),
    clickTrend: normalizeNumber(entry.clicktrend, 0),
    lastCheckOk: Number(entry.lastcheckok) === 1,
    hls: Number(entry.hls) === 1,
  };
}

async function getCatalogFilters() {
  const [countries, languages, tags] = await Promise.all([
    fetchJson("/json/countrycodes"),
    fetchJson("/json/languages"),
    fetchJson("/json/tags", { hidebroken: true, order: "stationcount", reverse: true, limit: 100 }),
  ]);

  return {
    countries: mapCountryEntries(countries),
    languages: mapLanguageEntries(languages),
    tags: mapFacetEntries(tags, "name", "name"),
  };
}

async function searchStations(filters = {}) {
  const query = normalizeText(filters.query);
  const countryCode = normalizeText(filters.countryCode).toUpperCase();
  const language = normalizeText(filters.language);
  const tag = normalizeText(filters.tag);

  if (!query && !countryCode && !language && !tag) {
    return [];
  }

  const results = await fetchJson("/json/stations/search", {
    name: query || undefined,
    countrycode: countryCode || undefined,
    language: language || undefined,
    tag: tag || undefined,
    order: "clickcount",
    reverse: true,
    hidebroken: true,
    limit: 30,
  });

  return results
    .map(mapStationResult)
    .filter((station) => station.name && station.streamUrl)
    .sort((left, right) => {
      if (left.lastCheckOk !== right.lastCheckOk) {
        return left.lastCheckOk ? -1 : 1;
      }
      return right.clickCount - left.clickCount;
    });
}

async function verifyStreamUrl(streamUrl) {
  const normalizedUrl = normalizeText(streamUrl);
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return {
      ok: false,
      titleKey: "search_test_invalid_title",
      messageKey: "search_test_invalid_body",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        Range: "bytes=0-2048",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const looksLikeStream =
      contentType.includes("audio") ||
      contentType.includes("video") ||
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegurl") ||
      contentType.includes("application/octet-stream");

    return {
      ok: response.ok,
      titleKey: response.ok ? "search_test_ok_title" : "search_test_error_title",
      messageKey: response.ok
        ? looksLikeStream
          ? "search_test_ok_body"
          : "search_test_unknown_body"
        : "search_test_error_body",
      vars: {
        status: response.status,
        type: contentType || "unknown",
      },
    };
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    return {
      ok: false,
      titleKey: "search_test_error_title",
      messageKey: isAbort ? "search_test_timeout_body" : "search_test_error_body",
      vars: {
        status: 0,
        type: isAbort ? "timeout" : "network-error",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  getCatalogFilters,
  searchStations,
  verifyStreamUrl,
};
