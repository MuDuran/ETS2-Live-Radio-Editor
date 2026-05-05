from dataclasses import asdict, dataclass


@dataclass(slots=True)
class Station:
    name: str
    genre: str
    language: str
    bitrate: int
    port: int
    source: str

    @classmethod
    def from_dict(cls, payload: dict) -> "Station":
        return cls(
            name=str(payload["name"]),
            genre=str(payload["genre"]),
            language=str(payload["language"]),
            bitrate=int(payload["bitrate"]),
            port=int(payload["port"]),
            source=str(payload["source"]),
        )

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class AppSettings:
    language: str
    ets2_dir: str
    ffmpeg_path: str

