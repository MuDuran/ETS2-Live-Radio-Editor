import re
from pathlib import Path

from core.models import Station


STREAM_LINE_PATTERN = re.compile(r'^\s*stream_data\[(\d+)\]: "(.*)"\s*$')


def import_radios_from_ets2(ets2_dir: Path, existing_stations: list[Station]) -> list[Station]:
    live_streams_path = ets2_dir / "live_streams.sii"
    if not live_streams_path.exists():
        raise FileNotFoundError(str(live_streams_path))

    known_by_name = {station.name.casefold(): station for station in existing_stations}
    imported: list[Station] = []

    for raw_line in live_streams_path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = STREAM_LINE_PATTERN.match(raw_line)
        if not match:
            continue
        parts = match.group(2).split("|")
        if len(parts) != 6:
            continue
        url, name, genre, language, bitrate, _favorite = parts
        known = known_by_name.get(name.casefold())
        source = known.source if known and url.startswith("http://127.0.0.1:") else url
        imported.append(
            Station(
                name=name,
                genre=genre,
                language=language,
                bitrate=int(bitrate),
                port=18100 + len(imported),
                source=source,
            )
        )
    return imported


def sync_live_streams(ets2_dir: Path, stations: list[Station]) -> Path:
    live_streams_path = ets2_dir / "live_streams.sii"
    backup_path = ets2_dir / "live_streams.gui-backup.sii"

    if live_streams_path.exists() and not backup_path.exists():
        backup_path.write_text(live_streams_path.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

    lines = [
        "SiiNunit",
        "{",
        "live_stream_def : _nameless.2a3.5106.8050 {",
        f" stream_data: {len(stations)}",
    ]
    for index, station in enumerate(stations):
        lines.append(
            f' stream_data[{index}]: "http://127.0.0.1:{station.port}|{station.name}|{station.genre}|{station.language}|{station.bitrate}|1"'
        )
    lines.extend(["}", "}"])
    live_streams_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return live_streams_path
