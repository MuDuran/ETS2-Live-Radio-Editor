const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

class RelayService {
  constructor(storage, logger) {
    this.storage = storage;
    this.logger = logger;
    this.listeners = new Map();
    this.sessions = new Map();
    this.statuses = new Map();
    this.startupInProgress = false;
    this.lastStartAt = null;
    this.lastStartDurationMs = null;
  }

  isRunning() {
    return this.listeners.size > 0;
  }

  isEnabled() {
    return this.listeners.size > 0;
  }

  preparedCount() {
    return this.listeners.size;
  }

  activeCount() {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (!session.process.killed && session.process.exitCode === null) {
        count += 1;
      }
    }
    return count;
  }

  getMetrics() {
    return {
      listeningRelays: this.listeners.size,
      relayProcesses: this.activeCount(),
      startupInProgress: this.startupInProgress,
      lastStartAt: this.lastStartAt,
      lastStartDurationMs: this.lastStartDurationMs,
    };
  }

  getStatuses(stations) {
    return stations.map((station) => {
      const port = Number(station.port);
      const session = this.sessions.get(port);
      const listener = this.listeners.get(port);
      const state = this.statuses.get(port);

      if (session && !session.process.killed && session.process.exitCode === null) {
        return { name: station.name, key: "status_running", vars: { port: station.port } };
      }

      if (listener) {
        if (state?.key === "status_error") {
          return { name: station.name, key: state.key, vars: state.vars || {} };
        }
        return { name: station.name, key: "status_waiting_request", vars: { port: station.port } };
      }

      if (state?.key) {
        return { name: station.name, key: state.key, vars: state.vars || {} };
      }

      return { name: station.name, key: "status_stopped", vars: {} };
    });
  }

  async startRelays(stations, ffmpegPath) {
    this.logger?.info("Relay startup requested", {
      stationCount: Array.isArray(stations) ? stations.length : 0,
      ffmpegPath,
    });

    if (!Array.isArray(stations) || stations.length === 0) {
      this.logger?.warn("Relay startup aborted because there are no stations");
      return {
        ok: false,
        titleKey: "error_no_stations_title",
        messageKey: "error_no_stations_body",
      };
    }

    if (!fs.existsSync(ffmpegPath)) {
      this.logger?.warn("Relay startup aborted because ffmpeg was not found", { ffmpegPath });
      return {
        ok: false,
        titleKey: "error_ffmpeg_title",
        messageKey: "error_ffmpeg_body",
        vars: { path: ffmpegPath },
      };
    }

    this.stopRelays();
    this.startupInProgress = true;
    this.lastStartAt = new Date().toISOString();
    this.lastStartDurationMs = null;
    const startedAt = Date.now();

    try {
      for (const station of stations) {
        await this.createListener(station, ffmpegPath);
      }

      this.lastStartDurationMs = Date.now() - startedAt;
      this.startupInProgress = false;
      this.saveState(stations);
      this.logger?.info("Relay listeners are armed", {
        stationCount: stations.length,
        durationMs: this.lastStartDurationMs,
      });
      return {
        ok: true,
        vars: { count: stations.length, durationMs: this.lastStartDurationMs },
      };
    } catch (error) {
      this.startupInProgress = false;
      this.stopRelays();
      this.logger?.error("Relay startup failed while preparing listeners", {
        reason: error.message || "unknown",
      });
      return {
        ok: false,
        titleKey: "relay_listener_error_title",
        messageKey: "relay_listener_error_body",
        vars: { reason: error.message || "unknown" },
      };
    }
  }

  async createListener(station, ffmpegPath) {
    const port = Number(station.port);
    this.statuses.set(port, { key: "status_starting", vars: { port: station.port } });
    this.logger?.info("Creating relay listener", {
      station: station.name,
      port,
      source: station.source,
    });

    const server = http.createServer((request, response) => {
      this.handleListenerRequest(station, ffmpegPath, request, response);
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });

    server.on("error", (error) => {
      this.logger?.error("Relay listener error", {
        station: station.name,
        port,
        reason: error.message || "listener-error",
      });
      this.statuses.set(port, {
        key: "status_error",
        vars: { reason: error.message || "listener-error" },
      });
    });

    this.listeners.set(port, { port, server, station });
    this.statuses.set(port, { key: "status_waiting_request", vars: { port: station.port } });
    this.logger?.info("Relay listener ready", {
      station: station.name,
      port,
      host: "0.0.0.0",
    });
  }

  handleListenerRequest(station, ffmpegPath, request, response) {
    const port = Number(station.port);
    this.logger?.info("Relay listener received request", {
      station: station.name,
      port,
      method: request.method,
      url: request.url,
      userAgent: request.headers["user-agent"] || null,
      host: request.headers.host || null,
    });

    if (request.method === "HEAD") {
      response.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      });
      response.end();
      this.statuses.set(port, { key: "status_waiting_request", vars: { port: station.port } });
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    this.stopSession(port, true);
    this.statuses.set(port, { key: "status_starting", vars: { port: station.port } });

    const stderrPath = path.join(this.storage.logsDir, `${station.port}.stderr.log`);
    const stderr = fs.openSync(stderrPath, "a");
    const process = spawn(
      ffmpegPath,
      [
        "-nostdin",
        "-loglevel",
        "warning",
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "5",
        "-i",
        station.source,
        "-vn",
        "-c:a",
        "libmp3lame",
        "-b:a",
        `${station.bitrate}k`,
        "-content_type",
        "audio/mpeg",
        "-f",
        "mp3",
        "pipe:1",
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", stderr],
      }
    );

    const session = {
      port,
      process,
      stderr,
      response,
      expectedStop: false,
    };

    this.sessions.set(port, session);
    this.saveState(this.getListenerStations());
    this.logger?.info("Spawning ffmpeg relay session", {
      station: station.name,
      port,
      stderrPath,
      source: station.source,
    });

    const finalizeSession = (expectedStop, reason = null) => {
      const current = this.sessions.get(port);
      if (!current || current.process !== process) {
        try {
          fs.closeSync(stderr);
        } catch {}
        return;
      }

      this.sessions.delete(port);
      try {
        fs.closeSync(stderr);
      } catch {}

      if (expectedStop) {
        this.statuses.set(port, { key: "status_waiting_request", vars: { port: station.port } });
      } else {
        this.statuses.set(port, {
          key: "status_error",
          vars: { reason: reason || "unexpected-stop" },
        });
      }

      this.saveState(this.getListenerStations());
      this.logger?.info("Relay session finished", {
        station: station.name,
        port,
        expectedStop,
        reason,
      });
    };

    process.once("spawn", () => {
      response.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      });
      this.statuses.set(port, { key: "status_running", vars: { port: station.port } });
      process.stdout.pipe(response);
      this.logger?.info("ffmpeg relay session started", {
        station: station.name,
        port,
        pid: process.pid,
      });
    });

    process.once("error", (error) => {
      if (!response.headersSent) {
        response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      }
      response.end("ffmpeg error");
      this.logger?.error("ffmpeg relay process error", {
        station: station.name,
        port,
        reason: error.message || "spawn-error",
      });
      finalizeSession(false, error.message || "spawn-error");
    });

    process.once("exit", (code, signal) => {
      if (!response.writableEnded) {
        response.end();
      }

      const current = this.sessions.get(port);
      const expectedStop = current?.expectedStop || false;
      if (expectedStop || code === 0 || signal === "SIGTERM") {
        finalizeSession(true);
        return;
      }

      this.logger?.warn("ffmpeg relay exited unexpectedly", {
        station: station.name,
        port,
        code,
        signal,
      });
      finalizeSession(false, code !== null ? `exit-${code}` : signal || "unknown");
    });

    const closeSession = () => {
      this.stopSession(port, true);
    };

    request.once("aborted", closeSession);
    response.once("close", closeSession);
  }

  stopSession(port, expectedStop = false) {
    const session = this.sessions.get(Number(port));
    if (!session) return;

    session.expectedStop = expectedStop;
    this.logger?.info("Stopping relay session", {
      port: Number(port),
      expectedStop,
      pid: session.process.pid,
    });
    try {
      if (!session.process.killed && session.process.exitCode === null) {
        session.process.kill();
      }
    } catch {}
  }

  stopRelays() {
    this.startupInProgress = false;
    this.logger?.info("Stopping all relays", {
      listenerCount: this.listeners.size,
      sessionCount: this.sessions.size,
    });

    for (const port of [...this.sessions.keys()]) {
      this.stopSession(port, true);
    }

    for (const listener of this.listeners.values()) {
      try {
        listener.server.close();
      } catch {}
      this.statuses.set(listener.port, { key: "status_stopped", vars: {} });
    }

    this.listeners.clear();
    this.sessions.clear();
    this.saveState([]);
  }

  getListenerStations() {
    return [...this.listeners.values()].map((entry) => entry.station);
  }

  saveState(stations) {
    const payload = stations.map((station) => {
      const session = this.sessions.get(Number(station.port));
      return {
        name: station.name,
        port: Number(station.port),
        pid: session ? session.process.pid : null,
        listening: this.listeners.has(Number(station.port)),
      };
    });

    fs.writeFileSync(path.join(this.storage.runDir, "relay-state.json"), JSON.stringify(payload, null, 2), "utf-8");
  }
}

module.exports = {
  RelayService,
};
