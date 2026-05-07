const fs = require("node:fs");
const path = require("node:path");

const STREAM_LINE_PATTERN = /^\s*stream_data\[(\d+)\]: "(.*)"\s*$/;
const GAME_STREAM_HOST = "localhost";
const LOCAL_RELAY_URL_PATTERN = /^http:\/\/(?:127\.0\.0\.1|localhost):/i;
const { GAME_PROFILES, DEFAULT_GAME } = require("./constants.cjs");

function getGameProfile(gameId = DEFAULT_GAME) {
  return GAME_PROFILES[gameId] || GAME_PROFILES[DEFAULT_GAME];
}

function normalizeStation(payload) {
  return {
    name: String(payload.name || "").trim(),
    genre: String(payload.genre || "").trim(),
    language: String(payload.language || "").trim(),
    bitrate: Number(payload.bitrate),
    port: Number(payload.port),
    source: String(payload.source || "").trim(),
    favorite: Boolean(payload.favorite),
  };
}

function suggestNextPort(stations) {
  const ports = stations.map((station) => Number(station.port) || 0);
  return Math.max(18099, ...ports) + 1;
}

function validateStation(station, stations, originalName = null) {
  if (!station.name || !station.source) {
    return { ok: false, titleKey: "error_incomplete_title", messageKey: "error_incomplete_body" };
  }
  if (station.name.length < 3) {
    return { ok: false, titleKey: "error_name_short_title", messageKey: "error_name_short_body" };
  }
  if (/[\n\r\t]/.test(station.name)) {
    return { ok: false, titleKey: "error_name_invalid_title", messageKey: "error_name_invalid_body" };
  }
  if (!station.language) {
    return { ok: false, titleKey: "error_language_title", messageKey: "error_language_body" };
  }
  if (!Number.isInteger(station.bitrate) || station.bitrate <= 0 || station.bitrate > 1000) {
    return { ok: false, titleKey: "error_bitrate_title", messageKey: "error_bitrate_body" };
  }
  if (!Number.isInteger(station.port) || station.port < 1024 || station.port > 65535) {
    return { ok: false, titleKey: "error_port_range_title", messageKey: "error_port_range_body" };
  }
  if (/\s/.test(station.source)) {
    return { ok: false, titleKey: "error_source_format_title", messageKey: "error_source_format_body" };
  }
  if (!/^https?:\/\//i.test(station.source)) {
    return { ok: false, titleKey: "error_source_url_title", messageKey: "error_source_url_body" };
  }

  for (const existing of stations) {
    if (originalName && existing.name === originalName) {
      continue;
    }
    if (existing.port === station.port) {
      return {
        ok: false,
        titleKey: "error_duplicate_port_title",
        messageKey: "error_duplicate_port_body",
        vars: { port: station.port, name: existing.name },
      };
    }
    if (existing.name.toLowerCase() === station.name.toLowerCase()) {
      return {
        ok: false,
        titleKey: "error_duplicate_name_title",
        messageKey: "error_duplicate_name_body",
        vars: { name: station.name },
      };
    }
  }

  return { ok: true };
}

function importFromGame(gameId, gameDir, currentStations, logger = null) {
  const profile = getGameProfile(gameId);
  const liveStreamsPath = path.join(gameDir, "live_streams.sii");
  logger?.info("Import requested from game", {
    gameId: profile.id,
    gameName: profile.name,
    gameDir,
    liveStreamsPath,
  });

  if (!fs.existsSync(liveStreamsPath)) {
    logger?.warn("Game import failed because live_streams.sii was not found", {
      gameId: profile.id,
      liveStreamsPath,
    });
    return {
      ok: false,
      titleKey: "import_error_title",
      messageKey: "import_error_missing_body",
      vars: { path: liveStreamsPath },
    };
  }

  const knownByName = new Map(currentStations.map((station) => [station.name.toLowerCase(), station]));
  const imported = [];
  const lines = fs.readFileSync(liveStreamsPath, "utf-8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(STREAM_LINE_PATTERN);
    if (!match) continue;
    const parts = match[2].split("|");
    if (parts.length !== 6) continue;
    const [url, name, genre, language, bitrate, favoriteFlag] = parts;
    const known = knownByName.get(name.toLowerCase());
    imported.push({
      name,
      genre,
      language,
      bitrate: Number(bitrate),
      port: 18100 + imported.length,
      source: known && LOCAL_RELAY_URL_PATTERN.test(url) ? known.source : url,
      favorite: favoriteFlag === "1",
    });
  }

  if (!imported.length) {
    logger?.warn("Game import found no valid stations", {
      gameId: profile.id,
      liveStreamsPath,
    });
    return {
      ok: false,
      titleKey: "import_error_title",
      messageKey: "import_error_empty_body",
    };
  }

  logger?.info("Game import completed", {
    gameId: profile.id,
    gameName: profile.name,
    liveStreamsPath,
    stationCount: imported.length,
  });

  return { ok: true, stations: imported };
}

function syncToGame(gameId, gameDir, stations, logger = null) {
  const profile = getGameProfile(gameId);
  const liveStreamsPath = path.join(gameDir, "live_streams.sii");
  const backupPath = path.join(gameDir, "live_streams.gui-backup.sii");
  logger?.info("Game sync requested", {
    gameId: profile.id,
    gameName: profile.name,
    gameDir,
    liveStreamsPath,
    stationCount: stations.length,
  });

  if (!fs.existsSync(liveStreamsPath)) {
    logger?.warn("Game sync failed because live_streams.sii was not found", {
      gameId: profile.id,
      liveStreamsPath,
    });
    return {
      ok: false,
      titleKey: "sync_error_title",
      messageKey: "import_error_missing_body",
      vars: { path: liveStreamsPath },
    };
  }

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(liveStreamsPath, backupPath);
    logger?.info("Game backup created", {
      gameId: profile.id,
      backupPath,
    });
  }

  const lines = [
    "SiiNunit",
    "{",
    "live_stream_def : _nameless.2a3.5106.8050 {",
    ` stream_data: ${stations.length}`,
  ];

  stations.forEach((station, index) => {
    lines.push(
      ` stream_data[${index}]: "http://${GAME_STREAM_HOST}:${station.port}|${station.name}|${station.genre}|${station.language}|${station.bitrate}|${
        station.favorite ? 1 : 0
      }"`
    );
  });

  lines.push("}");
  lines.push("}");

  fs.writeFileSync(liveStreamsPath, lines.join("\n") + "\n", "utf-8");
  logger?.info("Game sync completed", {
    gameId: profile.id,
    gameName: profile.name,
    liveStreamsPath,
    backupPath,
    stationCount: stations.length,
    firstRelayUrl: stations[0] ? `http://${GAME_STREAM_HOST}:${stations[0].port}` : null,
  });

  return {
    ok: true,
    path: liveStreamsPath,
  };
}

module.exports = {
  normalizeStation,
  suggestNextPort,
  validateStation,
  importFromGame,
  syncToGame,
  GAME_STREAM_HOST,
};
