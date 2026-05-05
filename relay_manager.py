import json
import subprocess
from dataclasses import dataclass
from pathlib import Path


CREATE_NO_WINDOW = 0x08000000


@dataclass
class RelayProcess:
    process: subprocess.Popen
    stdout_handle: object
    stderr_handle: object


class RelayManager:
    def __init__(self, base_dir: Path, ffmpeg_path: str) -> None:
        self.base_dir = base_dir
        self.ffmpeg_path = ffmpeg_path
        self.logs_dir = base_dir / "logs"
        self.run_dir = base_dir / "run"
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.processes: dict[int, RelayProcess] = {}

    def is_running(self) -> bool:
        return any(item.process.poll() is None for item in self.processes.values())

    def active_count(self) -> int:
        return sum(1 for item in self.processes.values() if item.process.poll() is None)

    def start_relays(self, stations: list[dict]) -> None:
        self.stop_relays()

        for station in stations:
            port = int(station["port"])
            stdout_path = self.logs_dir / f"{port}.stdout.log"
            stderr_path = self.logs_dir / f"{port}.stderr.log"
            stdout_handle = open(stdout_path, "ab")
            stderr_handle = open(stderr_path, "ab")
            command = [
                self.ffmpeg_path,
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
                station["source"],
                "-vn",
                "-c:a",
                "libmp3lame",
                "-b:a",
                f"{int(station['bitrate'])}k",
                "-content_type",
                "audio/mpeg",
                "-f",
                "mp3",
                "-listen",
                "1",
                f"http://127.0.0.1:{port}",
            ]
            process = subprocess.Popen(
                command,
                stdout=stdout_handle,
                stderr=stderr_handle,
                creationflags=CREATE_NO_WINDOW,
            )
            self.processes[port] = RelayProcess(
                process=process,
                stdout_handle=stdout_handle,
                stderr_handle=stderr_handle,
            )

        self._save_run_state(stations)

    def stop_relays(self) -> None:
        for item in self.processes.values():
            if item.process.poll() is None:
                item.process.kill()
                item.process.wait(timeout=5)
            item.stdout_handle.close()
            item.stderr_handle.close()
        self.processes.clear()

    def get_status_summary(self, stations: list[dict], translate) -> list[tuple[str, str]]:
        summary: list[tuple[str, str]] = []
        for station in stations:
            port = int(station["port"])
            item = self.processes.get(port)
            if item is None:
                status = translate("status_stopped")
            elif item.process.poll() is None:
                status = translate("status_running", port=port)
            else:
                status = translate("status_error")
            summary.append((station["name"], status))
        return summary

    def _save_run_state(self, stations: list[dict]) -> None:
        state_path = self.run_dir / "relay-state.json"
        payload = []
        for station in stations:
            port = int(station["port"])
            item = self.processes.get(port)
            payload.append(
                {
                    "name": station["name"],
                    "port": port,
                    "pid": item.process.pid if item else None,
                }
            )
        state_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
