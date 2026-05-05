import json
from pathlib import Path
from urllib.parse import urlparse

from core.models import Station


class StationValidationError(ValueError):
    def __init__(self, title_key: str, body_key: str, **kwargs) -> None:
        super().__init__(body_key)
        self.title_key = title_key
        self.body_key = body_key
        self.kwargs = kwargs


class StationService:
    def __init__(self, stations_path: Path) -> None:
        self.stations_path = stations_path

    def load(self) -> list[Station]:
        if not self.stations_path.exists():
            return []
        payload = json.loads(self.stations_path.read_text(encoding="utf-8"))
        return [Station.from_dict(item) for item in payload]

    def save(self, stations: list[Station]) -> None:
        payload = [station.to_dict() for station in stations]
        self.stations_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    def suggest_next_port(self, stations: list[Station]) -> int:
        ports = [station.port for station in stations]
        return max(ports, default=18099) + 1

    def validate(self, station: Station, stations: list[Station], original_name: str | None = None) -> None:
        if not station.name.strip() or not station.source.strip():
            raise StationValidationError("error_incomplete_title", "error_incomplete_body")
        if len(station.name.strip()) < 3:
            raise StationValidationError("error_name_short_title", "error_name_short_body")
        if any(char in station.name for char in ("\n", "\r", "\t")):
            raise StationValidationError("error_name_invalid_title", "error_name_invalid_body")
        if not station.language.strip():
            raise StationValidationError("error_language_title", "error_language_body")
        if station.bitrate <= 0 or station.bitrate > 1000:
            raise StationValidationError("error_bitrate_title", "error_bitrate_body")
        if station.port < 1024 or station.port > 65535:
            raise StationValidationError("error_port_range_title", "error_port_range_body")
        if any(char in station.source for char in (" ", "\n", "\r", "\t")):
            raise StationValidationError("error_source_format_title", "error_source_format_body")

        parsed = urlparse(station.source)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise StationValidationError("error_source_url_title", "error_source_url_body")

        for existing in stations:
            if original_name and existing.name == original_name:
                continue
            if existing.port == station.port:
                raise StationValidationError("error_duplicate_port_title", "error_duplicate_port_body", port=station.port, name=existing.name)
            if existing.name.casefold() == station.name.casefold():
                raise StationValidationError("error_duplicate_name_title", "error_duplicate_name_body", name=station.name)

