import json
from pathlib import Path

from core.app_paths import DEFAULT_ETS2_DIR, DEFAULT_FFMPEG
from core.models import AppSettings


class SettingsService:
    def __init__(self, settings_path: Path) -> None:
        self.settings_path = settings_path

    def load(self) -> AppSettings:
        if self.settings_path.exists():
            payload = json.loads(self.settings_path.read_text(encoding="utf-8"))
        else:
            payload = {}
        return AppSettings(
            language=payload.get("language", "en"),
            ets2_dir=payload.get("ets2_dir", str(DEFAULT_ETS2_DIR)),
            ffmpeg_path=payload.get("ffmpeg_path", str(DEFAULT_FFMPEG)),
        )

    def save(self, settings: AppSettings) -> None:
        payload = {
            "language": settings.language,
            "ets2_dir": settings.ets2_dir,
            "ffmpeg_path": settings.ffmpeg_path,
        }
        self.settings_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

