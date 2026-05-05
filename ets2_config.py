from pathlib import Path


def sync_live_streams(ets2_dir: Path, stations: list[dict]) -> Path:
    live_streams_path = ets2_dir / "live_streams.sii"
    backup_path = ets2_dir / "live_streams.gui-backup.sii"

    if not live_streams_path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {live_streams_path}")

    content = live_streams_path.read_text(encoding="utf-8", errors="replace").splitlines()

    if not backup_path.exists():
        backup_path.write_text("\n".join(content) + "\n", encoding="utf-8")

    for index, station in enumerate(stations):
        content[4 + index] = (
            f' stream_data[{index}]: "http://127.0.0.1:{int(station["port"])}'
            f'|{station["name"]}|{station["genre"]}|{station["language"]}'
            f'|{int(station["bitrate"])}|1"'
        )

    live_streams_path.write_text("\n".join(content) + "\n", encoding="utf-8")
    return live_streams_path
