from PySide6.QtWidgets import QComboBox, QDialog, QFormLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton, QSpinBox, QVBoxLayout

from core.models import Station


class StationDialog(QDialog):
    def __init__(self, translate, station: Station | None = None, suggested_port: int = 18100) -> None:
        super().__init__()
        self.t = translate
        self.station = station
        self.setModal(True)
        self.setWindowTitle(self.t("editor_title"))
        self.setMinimumWidth(520)

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 24, 24, 24)
        root.setSpacing(14)

        title = QLabel(self.t("editor_title"))
        title.setProperty("cardTitle", True)
        root.addWidget(title)

        subtitle = QLabel(self.t("editor_body"))
        subtitle.setProperty("muted", True)
        subtitle.setWordWrap(True)
        root.addWidget(subtitle)

        form = QFormLayout()
        form.setSpacing(12)
        form.setLabelAlignment(0)

        self.name_input = QLineEdit(station.name if station else "")
        self.source_input = QLineEdit(station.source if station else "")
        self.genre_input = QLineEdit(station.genre if station else "Pop")
        self.language_input = QLineEdit(station.language if station else "PTB")
        self.bitrate_input = QSpinBox()
        self.bitrate_input.setRange(1, 1000)
        self.bitrate_input.setValue(station.bitrate if station else 128)
        self.port_input = QSpinBox()
        self.port_input.setRange(1024, 65535)
        self.port_input.setValue(station.port if station else suggested_port)

        form.addRow(self.t("field_name"), self.name_input)
        form.addRow(self.t("field_source"), self.source_input)
        form.addRow(self.t("field_genre"), self.genre_input)
        form.addRow(self.t("field_language"), self.language_input)
        form.addRow(self.t("field_bitrate"), self.bitrate_input)
        form.addRow(self.t("field_port"), self.port_input)
        root.addLayout(form)

        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #f59e0b;")
        self.error_label.setWordWrap(True)
        root.addWidget(self.error_label)

        actions = QHBoxLayout()
        cancel_button = QPushButton(self.t("cancel_button"))
        cancel_button.clicked.connect(self.reject)
        save_button = QPushButton(self.t("update_selected") if station else self.t("add_button"))
        save_button.setProperty("accent", True)
        save_button.clicked.connect(self.accept)
        actions.addStretch(1)
        actions.addWidget(cancel_button)
        actions.addWidget(save_button)
        root.addLayout(actions)

    def get_station(self) -> Station:
        return Station(
            name=self.name_input.text().strip(),
            genre=self.genre_input.text().strip(),
            language=self.language_input.text().strip(),
            bitrate=int(self.bitrate_input.value()),
            port=int(self.port_input.value()),
            source=self.source_input.text().strip(),
        )
