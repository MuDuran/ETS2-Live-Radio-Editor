from PySide6.QtCore import Qt
from PySide6.QtWidgets import QComboBox, QDialog, QHBoxLayout, QLabel, QPushButton, QVBoxLayout

from localization import SUPPORTED_LANGUAGES, Translator


class WelcomeDialog(QDialog):
    def __init__(self, translator: Translator) -> None:
        super().__init__()
        self.translator = translator
        self.selected_language = translator.language
        self.setWindowTitle(self.t("welcome_title"))
        self.setModal(True)
        self.setMinimumWidth(460)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        heading = QLabel(self.t("welcome_heading"))
        heading.setProperty("hero", True)
        heading.setWordWrap(True)
        layout.addWidget(heading)

        body = QLabel(self.t("welcome_body"))
        body.setProperty("muted", True)
        body.setWordWrap(True)
        body.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop)
        layout.addWidget(body)

        label = QLabel(self.t("language_label"))
        label.setProperty("smallTitle", True)
        layout.addWidget(label)

        self.language_combo = QComboBox()
        for code, name in SUPPORTED_LANGUAGES.items():
            self.language_combo.addItem(name, userData=code)
        current_index = max(0, self.language_combo.findData(translator.language))
        self.language_combo.setCurrentIndex(current_index)
        layout.addWidget(self.language_combo)

        actions = QHBoxLayout()
        actions.addStretch(1)
        continue_button = QPushButton(self.t("continue_button"))
        continue_button.setProperty("accent", True)
        continue_button.clicked.connect(self.accept_selection)
        actions.addWidget(continue_button)
        layout.addLayout(actions)

    def t(self, key: str, **kwargs) -> str:
        return self.translator.t(key, **kwargs)

    def accept_selection(self) -> None:
        self.selected_language = str(self.language_combo.currentData())
        self.accept()

