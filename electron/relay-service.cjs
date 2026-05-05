const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

class RelayService {
  constructor(storage) {
    this.storage = storage;
    this.processes = new Map();
  }

  isRunning() {
    for (const entry of this.processes.values()) {
      if (!entry.process.killed && entry.process.exitCode === null) {
        return true;
      }
    }
    return false;
  }

  activeCount() {
    let count = 0;
    for (const entry of this.processes.values()) {
      if (!entry.process.killed && entry.process.exitCode === null) {
        count += 1;
      }
    }
    return count;
  }

  getStatuses(stations) {
    return stations.map((station) => {
      const entry = this.processes.get(Number(station.port));
      if (!entry) {
        return { name: station.name, key: "status_stopped", vars: {} };
      }
      if (!entry.process.killed && entry.process.exitCode === null) {
        return { name: station.name, key: "status_running", vars: { port: station.port } };
      }
      return { name: station.name, key: "status_error", vars: {} };
    });
  }

  startRelays(stations, ffmpegPath) {
    if (!fs.existsSync(ffmpegPath)) {
      return {
        ok: false,
        titleKey: "error_ffmpeg_title",
        messageKey: "error_ffmpeg_body",
        vars: { path: ffmpegPath },
      };
    }

    this.stopRelays();

    for (const station of stations) {
      const stdoutPath = path.join(this.storage.logsDir, `${station.port}.stdout.log`);
      const stderrPath = path.join(this.storage.logsDir, `${station.port}.stderr.log`);
      const stdout = fs.openSync(stdoutPath, "a");
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
          "-listen",
          "1",
          `http://127.0.0.1:${station.port}`,
        ],
        {
          windowsHide: true,
          stdio: ["ignore", stdout, stderr],
        }
      );

      this.processes.set(Number(station.port), {
        process,
        stdout,
        stderr,
      });
    }

    this.saveState(stations);
    return { ok: true };
  }

  stopRelays() {
    for (const entry of this.processes.values()) {
      try {
        if (!entry.process.killed && entry.process.exitCode === null) {
          entry.process.kill();
        }
      } catch {}

      try {
        fs.closeSync(entry.stdout);
      } catch {}
      try {
        fs.closeSync(entry.stderr);
      } catch {}
    }
    this.processes.clear();
  }

  saveState(stations) {
    const payload = stations.map((station) => {
      const entry = this.processes.get(Number(station.port));
      return {
        name: station.name,
        port: Number(station.port),
        pid: entry ? entry.process.pid : null,
      };
    });
    fs.writeFileSync(path.join(this.storage.runDir, "relay-state.json"), JSON.stringify(payload, null, 2), "utf-8");
  }
}

module.exports = {
  RelayService,
};
