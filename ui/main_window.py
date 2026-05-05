from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QAbstractItemView,
    QButtonGroup,
    QCheckBox,
    QComboBox,
    QFormLayout,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from core.models import AppSettings, Station
from localization import SUPPORTED_LANGUAGES, Translator
from relay_manager import RelayManager
from services.ets2_service import import_radios_from_ets2, sync_live_streams
from services.settings_service import SettingsService
from services.station_service import StationService, StationValidationError
from ui.station_dialog import StationDialog


class MainWindow(QMainWindow):
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
        self.checked_names: set[str] = set()
        self._skip_close_guard = False
        self._replacement_window: MainWindow | None = None

        self.setWindowTitle(self.t("app_title"))
        self.showMaximized()

        self.central = QWidget()
        self.setCentralWidget(self.central)
        self.root_layout = QHBoxLayout(self.central)
        self.root_layout.setContentsMargins(18, 18, 18, 18)
        self.root_layout.setSpacing(18)

        self._build_sidebar()
        self._build_content()
        self.refresh_all()

    def t(self, key: str, **kwargs) -> str:
        return self.tr.t(key, **kwargs)

    def _build_sidebar(self) -> None:
        sidebar = QFrame()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(250)
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        title = QLabel(self.t("app_title"))
        title.setProperty("cardTitle", True)
        layout.addWidget(title)

        subtitle = QLabel(self.t("app_subtitle"))
        subtitle.setProperty("muted", True)
        subtitle.setWordWrap(True)
        layout.addWidget(subtitle)

        layout.addSpacing(12)
        self.nav_group = QButtonGroup(self)
        self.nav_group.setExclusive(True)

        self.runtime_nav = self._nav_button(self.t("tab_runtime"), True)
        self.radios_nav = self._nav_button(self.t("tab_radios"))
        self.settings_nav = self._nav_button(self.t("tab_settings"))

        self.runtime_nav.clicked.connect(lambda: self.pages.setCurrentIndex(0))
        self.radios_nav.clicked.connect(lambda: self.pages.setCurrentIndex(1))
        self.settings_nav.clicked.connect(lambda: self.pages.setCurrentIndex(2))

        layout.addWidget(self.runtime_nav)
        layout.addWidget(self.radios_nav)
        layout.addWidget(self.settings_nav)
        layout.addStretch(1)

        warning = QLabel(self.t("footer_warning"))
        warning.setProperty("muted", True)
        warning.setWordWrap(True)
        layout.addWidget(warning)

        self.root_layout.addWidget(sidebar)

    def _nav_button(self, text: str, active: bool = False) -> QPushButton:
        button = QPushButton(text)
        button.setCheckable(True)
        button.setChecked(active)
        button.setProperty("nav", True)
        button.setProperty("active", active)
        self.nav_group.addButton(button)
        button.toggled.connect(lambda checked, btn=button: self._refresh_nav_button(btn, checked))
        button.style().unpolish(button)
        button.style().polish(button)
        return button

    def _refresh_nav_button(self, button: QPushButton, checked: bool) -> None:
        button.setProperty("active", checked)
        button.style().unpolish(button)
        button.style().polish(button)
        button.update()

    def sync_nav_state(self, index: int) -> None:
        if index == 0:
            self.runtime_nav.setChecked(True)
        elif index == 1:
            self.radios_nav.setChecked(True)
        elif index == 2:
            self.settings_nav.setChecked(True)

    def _build_content(self) -> None:
        right = QVBoxLayout()
        right.setSpacing(14)

        hero = QFrame()
        hero.setObjectName("heroCard")
        hero_layout = QVBoxLayout(hero)
        hero_layout.setContentsMargins(20, 18, 20, 18)
        self.hero_title = QLabel(self.t("app_title"))
        self.hero_title.setProperty("hero", True)
        self.hero_subtitle = QLabel(self.t("app_subtitle"))
        self.hero_subtitle.setProperty("muted", True)
        self.hero_subtitle.setWordWrap(True)
        hero_layout.addWidget(self.hero_title)
        hero_layout.addWidget(self.hero_subtitle)
        right.addWidget(hero)

        self.pages = QStackedWidget()
        self.pages.addWidget(self._build_runtime_page())
        self.pages.addWidget(self._build_radios_page())
        self.pages.addWidget(self._build_settings_page())
        self.pages.currentChanged.connect(self.sync_nav_state)
        right.addWidget(self.pages, 1)

        container = QWidget()
        container.setLayout(right)
        self.root_layout.addWidget(container, 1)

    def _wrap_page(self, widget: QWidget) -> QScrollArea:
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(widget)
        return scroll

    def _build_runtime_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(14)

        top = QHBoxLayout()
        top.setSpacing(14)

        env_card = QFrame()
        env_card.setObjectName("pageCard")
        env_layout = QVBoxLayout(env_card)
        env_layout.setContentsMargins(18, 18, 18, 18)

        env_header = QHBoxLayout()
        self.env_title = QLabel(self.t("config_title"))
        self.env_title.setProperty("cardTitle", True)
        env_header.addWidget(self.env_title)
        env_header.addStretch(1)
        env_info = QPushButton(self.t("config_info_button"))
        env_info.setFixedWidth(34)
        env_info.clicked.connect(self.show_environment_info)
        env_header.addWidget(env_info, alignment=Qt.AlignmentFlag.AlignTop)
        env_layout.addLayout(env_header)

        env_body = QLabel(self.t("config_body"))
        env_body.setProperty("muted", True)
        env_body.setWordWrap(True)
        env_layout.addWidget(env_body)

        form = QFormLayout()
        self.ets2_input = QLineEdit(self.settings.ets2_dir)
        self.ffmpeg_input = QLineEdit(self.settings.ffmpeg_path)
        form.addRow(self.t("ets2_dir"), self.ets2_input)
        form.addRow(self.t("ffmpeg_path"), self.ffmpeg_input)
        env_layout.addLayout(form)
        top.addWidget(env_card, 2)

        actions_card = QFrame()
        actions_card.setObjectName("pageCard")
        actions_layout = QVBoxLayout(actions_card)
        actions_layout.setContentsMargins(18, 18, 18, 18)
        title = QLabel(self.t("runtime_title"))
        title.setProperty("cardTitle", True)
        actions_layout.addWidget(title)
        body = QLabel(self.t("runtime_body"))
        body.setProperty("muted", True)
        body.setWordWrap(True)
        actions_layout.addWidget(body)

        self.sync_button = QPushButton(self.t("sync_button"))
        self.sync_button.setProperty("accent", True)
        self.sync_button.clicked.connect(self.sync_ets2)
        actions_layout.addWidget(self.sync_button)

        self.start_button = QPushButton(self.t("start_button"))
        self.start_button.setProperty("accent", True)
        self.start_button.clicked.connect(self.start_relays)
        actions_layout.addWidget(self.start_button)

        self.stop_button = QPushButton(self.t("stop_button"))
        self.stop_button.clicked.connect(self.stop_relays)
        actions_layout.addWidget(self.stop_button)
        actions_layout.addStretch(1)
        top.addWidget(actions_card, 1)

        layout.addLayout(top)

        summary_card = QFrame()
        summary_card.setObjectName("summaryCard")
        summary_layout = QVBoxLayout(summary_card)
        summary_layout.setContentsMargins(18, 18, 18, 18)
        summary_title = QLabel(self.t("summary_title"))
        summary_title.setProperty("cardTitle", True)
        summary_layout.addWidget(summary_title)

        metrics = QGridLayout()
        self.metric_total = self._metric_box(self.t("metric_total"))
        self.metric_running = self._metric_box(self.t("metric_running"))
        self.metric_next_port = self._metric_box(self.t("metric_next_port"))
        metrics.addWidget(self.metric_total, 0, 0)
        metrics.addWidget(self.metric_running, 0, 1)
        metrics.addWidget(self.metric_next_port, 0, 2)
        summary_layout.addLayout(metrics)

        self.runtime_status = QLabel("")
        self.runtime_status.setProperty("muted", True)
        self.runtime_status.setWordWrap(True)
        summary_layout.addWidget(self.runtime_status)
        layout.addWidget(summary_card)

        return self._wrap_page(page)

    def _metric_box(self, title: str) -> QFrame:
        card = QFrame()
        card.setObjectName("toolbarCard")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(16, 16, 16, 16)
        label = QLabel(title)
        label.setProperty("muted", True)
        value = QLabel("0")
        value.setProperty("value", True)
        layout.addWidget(label)
        layout.addWidget(value)
        card.value_label = value  # type: ignore[attr-defined]
        return card

    def _build_radios_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(14)

        toolbar_card = QFrame()
        toolbar_card.setObjectName("toolbarCard")
        toolbar_layout = QHBoxLayout(toolbar_card)
        toolbar_layout.setContentsMargins(16, 14, 16, 14)

        radios_title = QLabel(self.t("radios_title"))
        radios_title.setProperty("cardTitle", True)
        toolbar_layout.addWidget(radios_title)
        toolbar_layout.addStretch(1)

        self.new_button = QPushButton(self.t("add_button"))
        self.new_button.setProperty("accent", True)
        self.new_button.clicked.connect(self.add_station)
        toolbar_layout.addWidget(self.new_button)

        self.edit_button = QPushButton(self.t("load_form"))
        self.edit_button.clicked.connect(self.edit_selected_station)
        toolbar_layout.addWidget(self.edit_button)

        self.import_button = QPushButton(self.t("import_from_ets2"))
        self.import_button.clicked.connect(self.import_from_ets2)
        toolbar_layout.addWidget(self.import_button)

        self.save_button = QPushButton(self.t("save_button"))
        self.save_button.clicked.connect(self.save_stations)
        toolbar_layout.addWidget(self.save_button)

        self.delete_button = QPushButton(self.t("remove_selected"))
        self.delete_button.clicked.connect(self.delete_checked_stations)
        toolbar_layout.addWidget(self.delete_button)

        layout.addWidget(toolbar_card)

        table_card = QFrame()
        table_card.setObjectName("pageCard")
        table_layout = QVBoxLayout(table_card)
        table_layout.setContentsMargins(16, 16, 16, 16)

        self.table = QTableWidget(0, 7)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.setAlternatingRowColors(True)
        self.table.setHorizontalHeaderLabels(
            [
                self.t("col_checked"),
                self.t("col_name"),
                self.t("col_genre"),
                self.t("field_language"),
                self.t("field_bitrate"),
                self.t("col_port"),
                self.t("col_status"),
            ]
        )
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.verticalHeader().setVisible(False)
        self.table.itemChanged.connect(self.handle_item_changed)
        table_layout.addWidget(self.table)

        self.radios_helper = QLabel("")
        self.radios_helper.setProperty("muted", True)
        self.radios_helper.setWordWrap(True)
        table_layout.addWidget(self.radios_helper)
        layout.addWidget(table_card, 1)

        return self._wrap_page(page)

    def _build_settings_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(14)

        card = QFrame()
        card.setObjectName("pageCard")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(18, 18, 18, 18)

        title = QLabel(self.t("settings_title"))
        title.setProperty("cardTitle", True)
        card_layout.addWidget(title)

        body = QLabel(self.t("settings_body"))
        body.setProperty("muted", True)
        body.setWordWrap(True)
        card_layout.addWidget(body)

        language_form = QFormLayout()
        self.language_combo = QComboBox()
        for code, label in SUPPORTED_LANGUAGES.items():
            self.language_combo.addItem(label, userData=code)
        current_index = max(0, self.language_combo.findData(self.tr.language))
        self.language_combo.setCurrentIndex(current_index)
        language_form.addRow(self.t("change_language"), self.language_combo)
        card_layout.addLayout(language_form)

        self.apply_language_button = QPushButton(self.t("apply_language"))
        self.apply_language_button.setProperty("accent", True)
        self.apply_language_button.clicked.connect(self.apply_language_change)
        card_layout.addWidget(self.apply_language_button, alignment=Qt.AlignmentFlag.AlignLeft)

        help_card = QFrame()
        help_card.setObjectName("accordionCard")
        help_layout = QVBoxLayout(help_card)
        help_layout.setContentsMargins(16, 16, 16, 16)
        self.help_toggle = QPushButton(f"{self.t('how_to_use_button')} ▸")
        self.help_toggle.clicked.connect(self.toggle_help)
        help_layout.addWidget(self.help_toggle, alignment=Qt.AlignmentFlag.AlignLeft)
        self.help_body = QLabel(self._build_help_text())
        self.help_body.setProperty("muted", True)
        self.help_body.setWordWrap(True)
        self.help_body.hide()
        help_layout.addWidget(self.help_body)
        card_layout.addWidget(help_card)

        layout.addWidget(card)
        layout.addStretch(1)
        return self._wrap_page(page)

    def _build_help_text(self) -> str:
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

    def toggle_help(self) -> None:
        is_visible = self.help_body.isVisible()
        self.help_body.setVisible(not is_visible)
        arrow = "▸" if is_visible else "▾"
        self.help_toggle.setText(f"{self.t('how_to_use_button')} {arrow}")

    def refresh_all(self) -> None:
        self.settings.ets2_dir = self.ets2_input.text() if hasattr(self, "ets2_input") else self.settings.ets2_dir
        self.settings.ffmpeg_path = self.ffmpeg_input.text() if hasattr(self, "ffmpeg_input") else self.settings.ffmpeg_path
        self.refresh_table()
        self.metric_total.value_label.setText(str(len(self.stations)))  # type: ignore[attr-defined]
        self.metric_running.value_label.setText(str(self.relay_manager.active_count()))  # type: ignore[attr-defined]
        self.metric_next_port.value_label.setText(str(self.station_service.suggest_next_port(self.stations)))  # type: ignore[attr-defined]
        running = self.relay_manager.active_count()
        self.runtime_status.setText(self.t("status_running_summary", running=running, total=len(self.stations)))
        self.radios_helper.setText(self.t("helper_ready"))

    def refresh_table(self) -> None:
        self.table.blockSignals(True)
        self.table.setRowCount(len(self.stations))
        statuses = dict(self.relay_manager.get_status_summary([station.to_dict() for station in self.stations], self.t))
        for row, station in enumerate(self.stations):
            checked_item = QTableWidgetItem()
            checked_item.setFlags(Qt.ItemFlag.ItemIsEnabled | Qt.ItemFlag.ItemIsUserCheckable | Qt.ItemFlag.ItemIsSelectable)
            checked_item.setCheckState(Qt.CheckState.Checked if station.name in self.checked_names else Qt.CheckState.Unchecked)
            self.table.setItem(row, 0, checked_item)
            self.table.setItem(row, 1, QTableWidgetItem(station.name))
            self.table.setItem(row, 2, QTableWidgetItem(station.genre))
            self.table.setItem(row, 3, QTableWidgetItem(station.language))
            self.table.setItem(row, 4, QTableWidgetItem(str(station.bitrate)))
            self.table.setItem(row, 5, QTableWidgetItem(str(station.port)))
            self.table.setItem(row, 6, QTableWidgetItem(statuses.get(station.name, self.t("status_stopped"))))
        self.table.resizeColumnsToContents()
        self.table.blockSignals(False)

    def handle_item_changed(self, item: QTableWidgetItem) -> None:
        if item.column() != 0:
            return
        row = item.row()
        if row >= len(self.stations):
            return
        name = self.stations[row].name
        if item.checkState() == Qt.CheckState.Checked:
            self.checked_names.add(name)
        else:
            self.checked_names.discard(name)
        self.radios_helper.setText(self.t("helper_checked_count", count=len(self.checked_names)))

    def add_station(self) -> None:
        dialog = StationDialog(self.t, suggested_port=self.station_service.suggest_next_port(self.stations))
        if dialog.exec():
            station = dialog.get_station()
            try:
                self.station_service.validate(station, self.stations)
            except StationValidationError as error:
                self.show_warning(error.title_key, error.body_key, **error.kwargs)
                return
            self.stations.append(station)
            self.refresh_all()
            self.radios_helper.setText(self.t("helper_added", name=station.name))

    def _selected_row(self) -> int | None:
        indexes = self.table.selectionModel().selectedRows()
        if not indexes:
            return None
        return indexes[0].row()

    def edit_selected_station(self) -> None:
        row = self._selected_row()
        if row is None:
            self.show_warning("warn_nothing_selected_title", "warn_nothing_selected_body")
            return
        original = self.stations[row]
        dialog = StationDialog(self.t, station=original, suggested_port=original.port)
        if dialog.exec():
            updated = dialog.get_station()
            try:
                self.station_service.validate(updated, self.stations, original_name=original.name)
            except StationValidationError as error:
                self.show_warning(error.title_key, error.body_key, **error.kwargs)
                return
            self.stations[row] = updated
            if original.name in self.checked_names:
                self.checked_names.discard(original.name)
                self.checked_names.add(updated.name)
            self.refresh_all()
            self.radios_helper.setText(self.t("helper_updated", name=updated.name))

    def delete_checked_stations(self) -> None:
        if not self.checked_names:
            self.show_warning("warn_nothing_checked_title", "warn_nothing_checked_body")
            return
        confirm = QMessageBox.question(
            self,
            self.t("confirm_delete_title"),
            self.t("confirm_delete_body", count=len(self.checked_names)),
        )
        if confirm != QMessageBox.StandardButton.Yes:
            return
        self.stations = [station for station in self.stations if station.name not in self.checked_names]
        deleted_count = len(self.checked_names)
        self.checked_names.clear()
        self.station_service.save(self.stations)
        self.refresh_all()
        self.radios_helper.setText(self.t("helper_deleted_count", count=deleted_count, name="stations.json"))

    def save_stations(self) -> None:
        confirm = QMessageBox.question(self, self.t("confirm_save_title"), self.t("confirm_save_body"))
        if confirm != QMessageBox.StandardButton.Yes:
            self.radios_helper.setText(self.t("helper_save_cancelled"))
            return
        self.station_service.save(self.stations)
        self.radios_helper.setText(self.t("helper_saved", name="stations.json"))
        apply_now = QMessageBox.question(self, self.t("saved_title"), self.t("saved_prompt"))
        if apply_now == QMessageBox.StandardButton.Yes:
            self.sync_ets2()

    def import_from_ets2(self) -> None:
        ets2_dir = Path(self.ets2_input.text().strip())
        confirm = QMessageBox.question(
            self,
            self.t("import_confirm_title"),
            self.t("import_confirm_body", path=str(ets2_dir / "live_streams.sii")),
        )
        if confirm != QMessageBox.StandardButton.Yes:
            return
        try:
            imported = import_radios_from_ets2(ets2_dir, self.stations)
        except FileNotFoundError:
            self.show_warning("import_error_title", "import_error_missing_body", path=str(ets2_dir / "live_streams.sii"))
            return
        if not imported:
            self.show_warning("import_error_title", "import_error_empty_body")
            return
        self.stations = imported
        self.checked_names.clear()
        self.station_service.save(self.stations)
        self.refresh_all()
        QMessageBox.information(self, self.t("import_ok_title"), self.t("import_ok_body", count=len(imported), path="stations.json"))

    def start_relays(self) -> None:
        ffmpeg_path = self.ffmpeg_input.text().strip()
        if not Path(ffmpeg_path).exists():
            self.show_warning("error_ffmpeg_title", "error_ffmpeg_body", path=ffmpeg_path)
            return
        self.settings.ffmpeg_path = ffmpeg_path
        self.settings.ets2_dir = self.ets2_input.text().strip()
        self.settings_service.save(self.settings)
        self.relay_manager.ffmpeg_path = ffmpeg_path
        self.relay_manager.start_relays([station.to_dict() for station in self.stations])
        self.refresh_all()
        QMessageBox.information(self, self.t("started_title"), self.t("started_body"))

    def stop_relays(self) -> None:
        self.relay_manager.stop_relays()
        self.refresh_all()
        QMessageBox.information(self, self.t("stopped_title"), self.t("stopped_body"))

    def sync_ets2(self) -> None:
        ets2_dir = Path(self.ets2_input.text().strip())
        self.settings.ets2_dir = str(ets2_dir)
        self.settings.ffmpeg_path = self.ffmpeg_input.text().strip()
        self.settings_service.save(self.settings)
        try:
            path = sync_live_streams(ets2_dir, self.stations)
        except FileNotFoundError:
            self.show_warning("sync_error_title", "import_error_missing_body", path=str(ets2_dir / "live_streams.sii"))
            return
        QMessageBox.information(self, self.t("sync_ok_title"), self.t("sync_ok_body", path=str(path)))

    def show_environment_info(self) -> None:
        QMessageBox.information(self, self.t("config_info_title"), self.t("config_info_body"))

    def apply_language_change(self) -> None:
        language = str(self.language_combo.currentData())
        self.tr.set_language(language)
        self.settings.language = language
        self.settings_service.save(self.settings)
        replacement = MainWindow(self.tr, self.settings, self.settings_service, self.station_service, self.relay_manager)
        replacement.stations = list(self.stations)
        replacement.checked_names = set(self.checked_names)
        replacement.refresh_all()
        replacement.pages.setCurrentIndex(self.pages.currentIndex())
        replacement.show()
        self._replacement_window = replacement
        self._skip_close_guard = True
        self.close()

    def show_warning(self, title_key: str, body_key: str, **kwargs) -> None:
        QMessageBox.warning(self, self.t(title_key, **kwargs), self.t(body_key, **kwargs))

    def closeEvent(self, event) -> None:  # type: ignore[override]
        if self._skip_close_guard:
            event.accept()
            return
        if self.relay_manager.is_running():
            confirm = QMessageBox.question(self, self.t("close_title"), self.t("close_body"))
            if confirm != QMessageBox.StandardButton.Yes:
                event.ignore()
                return
            self.relay_manager.stop_relays()
        event.accept()
