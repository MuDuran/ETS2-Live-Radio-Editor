import sys

from PySide6.QtCore import QUrl
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine

from core.app_paths import BASE_DIR, SETTINGS_PATH, STATIONS_PATH
from localization import Translator
from relay_manager import RelayManager
from services.settings_service import SettingsService
from services.station_service import StationService
from ui.app_bridge import AppBridge


def main() -> int:
    app = QGuiApplication(sys.argv)

    settings_service = SettingsService(SETTINGS_PATH)
    settings = settings_service.load()
    translator = Translator(settings.language)

    station_service = StationService(STATIONS_PATH)
    relay_manager = RelayManager(BASE_DIR, settings.ffmpeg_path)
    bridge = AppBridge(translator, settings, settings_service, station_service, relay_manager)

    engine = QQmlApplicationEngine()
    engine.rootContext().setContextProperty("backend", bridge)
    engine.load(QUrl.fromLocalFile(str(BASE_DIR / "qml" / "Main.qml")))

    if not engine.rootObjects():
        return 1

    app.aboutToQuit.connect(lambda: relay_manager.stop_relays() if relay_manager.is_running() else None)
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
