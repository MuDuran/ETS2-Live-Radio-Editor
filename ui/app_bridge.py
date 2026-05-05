from pathlib import Path

from PySide6.QtCore import (
    QAbstractListModel,
    Property,
    QModelIndex,
    QObject,
    Qt,
    Signal,
    Slot,
)

from core.models import AppSettings, Station
from localization import SUPPORTED_LANGUAGES, Translator
from relay_manager import RelayManager
from services.ets2_service import import_radios_from_ets2, sync_live_streams
from services.settings_service import SettingsService
from services.station_service import StationService, StationValidationError


class StationListModel(QAbstractListModel):
    NameRole = Qt.ItemDataRole.UserRole + 1
    GenreRole = Qt.ItemDataRole.UserRole + 2
    LanguageRole = Qt.ItemDataRole.UserRole + 3
    BitrateRole = Qt.ItemDataRole.UserRole + 4
    PortRole = Qt.ItemDataRole.UserRole + 5
    SourceRole = Qt.ItemDataRole.UserRole + 6
    StatusRole = Qt.ItemDataRole.UserRole + 7
    CheckedRole = Qt.ItemDataRole.UserRole + 8

    def __init__(self) -> None:
        super().__init__()
        self._stations: list[Station] = []
        self._statuses: dict[str, str] = {}
        self._checked_names: set[str] = set()

    def rowCount(self, parent: QModelIndex = QModelIndex()) -> int:  # type: ignore[override]
        if parent.isValid():
            return 0
        return len(self._stations)

    def roleNames(self) -> dict[int, bytes]:  # type: ignore[override]
        return {
            self.NameRole: b"name",
            self.GenreRole: b"genre",
            self.LanguageRole: b"language",
            self.BitrateRole: b"bitrate",
            self.PortRole: b"port",
            self.SourceRole: b"source",
            self.StatusRole: b"status",
            self.CheckedRole: b"checked",
        }

    def data(self, index: QModelIndex, role: int = Qt.ItemDataRole.DisplayRole):  # type: ignore[override]
        if not index.isValid() or not (0 <= index.row() < len(self._stations)):
            return None
        station = self._stations[index.row()]
        if role == self.NameRole:
            return station.name
        if role == self.GenreRole:
            return station.genre
        if role == self.LanguageRole:
            return station.language
        if role == self.BitrateRole:
            return station.bitrate
        if role == self.PortRole:
            return station.port
        if role == self.SourceRole:
            return station.source
        if role == self.StatusRole:
            return self._statuses.get(station.name, "")
        if role == self.CheckedRole:
            return station.name in self._checked_names
        return None

    def set_payload(self, stations: list[Station], statuses: dict[str, str], checked_names: set[str]) -> None:
        self.beginResetModel()
        self._stations = list(stations)
        self._statuses = dict(statuses)
        self._checked_names = set(checked_names)
        self.endResetModel()

    def station_at(self, index: int) -> Station | None:
        if 0 <= index < len(self._stations):
            return self._stations[index]
        return None

    def toggle_checked(self, index: int) -> None:
        station = self.station_at(index)
        if not station:
            return
        if station.name in self._checked_names:
            self._checked_names.discard(station.name)
        else:
            self._checked_names.add(station.name)
        changed_index = self.index(index, 0)
        self.dataChanged.emit(changed_index, changed_index, [self.CheckedRole])

    @property
    def checked_names(self) -> set[str]:
        return set(self._checked_names)


class AppBridge(QObject):
    languageChanged = Signal()
    stationsChanged = Signal()
    summaryChanged = Signal()
    helperChanged = Signal()

    def __init__(
        self,
        translator: Translator,
        settings: AppSettings,
        settings_service: SettingsService,
        station_service: StationService,
        relay_manager: RelayManager,
    ) -> None:
        super().__init__()
        self.tr = translator
        self.settings = settings
        self.settings_service = settings_service
        self.station_service = station_service
        self.relay_manager = relay_manager
        self.stations = self.station_service.load()
        self.station_model = StationListModel()
        self.helper_text = self.t("helper_ready")
        self._refresh_model()

    def t(self, key: str, **kwargs) -> str:
        return self.tr.t(key, **kwargs)

    def _status_map(self) -> dict[str, str]:
        summary = self.relay_manager.get_status_summary([station.to_dict() for station in self.stations], self.t)
        return {name: status for name, status in summary}

    def _refresh_model(self) -> None:
        self.station_model.set_payload(self.stations, self._status_map(), self.station_model.checked_names)
        self.stationsChanged.emit()
        self.summaryChanged.emit()
        self.helperChanged.emit()

    def _save_settings(self) -> None:
        self.settings_service.save(self.settings)

    def _result(self, ok: bool, title: str, message: str, extra: dict | None = None) -> dict:
        payload = {"ok": ok, "title": title, "message": message}
        if extra:
            payload.update(extra)
        return payload

    @Property(QObject, constant=True)
    def stationModel(self) -> QObject:
        return self.station_model

    @Property("QVariantList", notify=languageChanged)
    def languageOptions(self) -> list[dict]:
        return [{"code": code, "label": label} for code, label in SUPPORTED_LANGUAGES.items()]

    @Property(str, notify=languageChanged)
    def currentLanguage(self) -> str:
        return self.settings.language

    @Property(str, notify=summaryChanged)
    def ets2Dir(self) -> str:
        return self.settings.ets2_dir

    @Property(str, notify=summaryChanged)
    def ffmpegPath(self) -> str:
        return self.settings.ffmpeg_path

    @Property(int, notify=summaryChanged)
    def totalStations(self) -> int:
        return len(self.stations)

    @Property(int, notify=summaryChanged)
    def runningRelays(self) -> int:
        return self.relay_manager.active_count()

    @Property(int, notify=summaryChanged)
    def nextPort(self) -> int:
        return self.station_service.suggest_next_port(self.stations)

    @Property(int, notify=summaryChanged)
    def checkedCount(self) -> int:
        return len(self.station_model.checked_names)

    @Property(str, notify=summaryChanged)
    def runtimeSummary(self) -> str:
        return self.t("status_running_summary", running=self.runningRelays, total=self.totalStations)

    @Property(str, notify=helperChanged)
    def helperText(self) -> str:
        return self.helper_text

    @Slot(str, result=str)
    def trKey(self, key: str) -> str:
        return self.t(key)

    @Slot(str)
    def setEts2Dir(self, value: str) -> None:
        self.settings.ets2_dir = value.strip()
        self._save_settings()
        self.summaryChanged.emit()

    @Slot(str)
    def setFfmpegPath(self, value: str) -> None:
        self.settings.ffmpeg_path = value.strip()
        self._save_settings()
        self.summaryChanged.emit()

    @Slot(str, result=dict)
    def environmentInfo(self, _unused: str = "") -> dict:
        return self._result(True, self.t("config_info_title"), self.t("config_info_body"))

    @Slot(int)
    def toggleChecked(self, index: int) -> None:
        self.station_model.toggle_checked(index)
        self.helper_text = self.t("helper_checked_count", count=len(self.station_model.checked_names))
        self.helperChanged.emit()
        self.summaryChanged.emit()

    @Slot(int, result="QVariantMap")
    def stationForEdit(self, index: int) -> dict:
        station = self.station_model.station_at(index)
        if not station:
            return {}
        return station.to_dict()

    @Slot("QVariantMap", result="QVariantMap")
    def addStation(self, payload: dict) -> dict:
        station = Station.from_dict(payload)
        try:
            self.station_service.validate(station, self.stations)
        except StationValidationError as error:
            return self._result(False, self.t(error.title_key, **error.kwargs), self.t(error.body_key, **error.kwargs))
        self.stations.append(station)
        self.helper_text = self.t("helper_added", name=station.name)
        self._refresh_model()
        return self._result(True, self.t("saved_title"), self.helper_text)

    @Slot(int, "QVariantMap", result="QVariantMap")
    def updateStation(self, index: int, payload: dict) -> dict:
        original = self.station_model.station_at(index)
        if not original:
            return self._result(False, self.t("warn_nothing_selected_title"), self.t("warn_nothing_selected_body"))
        updated = Station.from_dict(payload)
        try:
            self.station_service.validate(updated, self.stations, original_name=original.name)
        except StationValidationError as error:
            return self._result(False, self.t(error.title_key, **error.kwargs), self.t(error.body_key, **error.kwargs))
        self.stations[index] = updated
        checked = self.station_model.checked_names
        if original.name in checked:
            checked.discard(original.name)
            checked.add(updated.name)
        self.helper_text = self.t("helper_updated", name=updated.name)
        self.station_model.set_payload(self.stations, self._status_map(), checked)
        self.stationsChanged.emit()
        self.summaryChanged.emit()
        self.helperChanged.emit()
        return self._result(True, self.t("saved_title"), self.helper_text)

    @Slot(result="QVariantMap")
    def deleteCheckedStations(self) -> dict:
        checked = self.station_model.checked_names
        if not checked:
            return self._result(False, self.t("warn_nothing_checked_title"), self.t("warn_nothing_checked_body"))
        deleted_count = len(checked)
        self.stations = [station for station in self.stations if station.name not in checked]
        self.station_service.save(self.stations)
        self.helper_text = self.t("helper_deleted_count", count=deleted_count, name="stations.json")
        self.station_model.set_payload(self.stations, self._status_map(), set())
        self.stationsChanged.emit()
        self.summaryChanged.emit()
        self.helperChanged.emit()
        return self._result(True, self.t("confirm_delete_title"), self.helper_text)

    @Slot(result="QVariantMap")
    def saveStations(self) -> dict:
        self.station_service.save(self.stations)
        self.helper_text = self.t("helper_saved", name="stations.json")
        self.helperChanged.emit()
        return self._result(True, self.t("saved_title"), self.t("saved_info", path=str(self.station_service.stations_path)))

    @Slot(result="QVariantMap")
    def importFromETS2(self) -> dict:
        ets2_dir = Path(self.settings.ets2_dir)
        try:
            imported = import_radios_from_ets2(ets2_dir, self.stations)
        except FileNotFoundError:
            return self._result(False, self.t("import_error_title"), self.t("import_error_missing_body", path=str(ets2_dir / "live_streams.sii")))
        if not imported:
            return self._result(False, self.t("import_error_title"), self.t("import_error_empty_body"))
        self.stations = imported
        self.station_service.save(self.stations)
        self.helper_text = self.t("helper_imported_count", count=len(imported), name="stations.json")
        self.station_model.set_payload(self.stations, self._status_map(), set())
        self.stationsChanged.emit()
        self.summaryChanged.emit()
        self.helperChanged.emit()
        return self._result(True, self.t("import_ok_title"), self.t("import_ok_body", count=len(imported), path=str(self.station_service.stations_path)))

    @Slot(result="QVariantMap")
    def syncETS2(self) -> dict:
        ets2_dir = Path(self.settings.ets2_dir)
        try:
            path = sync_live_streams(ets2_dir, self.stations)
        except FileNotFoundError:
            return self._result(False, self.t("sync_error_title"), self.t("import_error_missing_body", path=str(ets2_dir / "live_streams.sii")))
        self.helper_text = self.t("helper_synced")
        self.helperChanged.emit()
        return self._result(True, self.t("sync_ok_title"), self.t("sync_ok_body", path=str(path)))

    @Slot(result="QVariantMap")
    def startRelays(self) -> dict:
        ffmpeg_path = Path(self.settings.ffmpeg_path)
        if not ffmpeg_path.exists():
            return self._result(False, self.t("error_ffmpeg_title"), self.t("error_ffmpeg_body", path=str(ffmpeg_path)))
        self.relay_manager.ffmpeg_path = str(ffmpeg_path)
        self.relay_manager.start_relays([station.to_dict() for station in self.stations])
        self.helper_text = self.t("helper_started")
        self._refresh_model()
        return self._result(True, self.t("started_title"), self.t("started_body"))

    @Slot(result="QVariantMap")
    def stopRelays(self) -> dict:
        self.relay_manager.stop_relays()
        self.helper_text = self.t("helper_stopped")
        self._refresh_model()
        return self._result(True, self.t("stopped_title"), self.t("stopped_body"))

    @Slot(str, result="QVariantMap")
    def applyLanguage(self, language: str) -> dict:
        self.tr.set_language(language)
        self.settings.language = language
        self._save_settings()
        self.languageChanged.emit()
        self.summaryChanged.emit()
        self.helper_text = self.t("helper_ready")
        self._refresh_model()
        return self._result(True, self.t("language_changed_title"), self.t("language_changed_body"))

    @Slot(result=str)
    def helpText(self) -> str:
        return "\n".join(
            [
                self.t("help_title_usage"),
                self.t("help_usage_1"),
                self.t("help_usage_2"),
                self.t("help_usage_3"),
                self.t("help_usage_4"),
                self.t("help_usage_5"),
                self.t("help_usage_6"),
                self.t("help_usage_7"),
                "",
                self.t("help_title_fields"),
                self.t("help_fields_1"),
                self.t("help_fields_2"),
                self.t("help_fields_3"),
                self.t("help_fields_4"),
                self.t("help_fields_5"),
                self.t("help_fields_6"),
                "",
                self.t("help_title_sync"),
                self.t("help_sync_1"),
                self.t("help_sync_2"),
            ]
        )
