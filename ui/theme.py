APP_STYLESHEET = """
QWidget {
    background-color: #06101c;
    color: #e6eef8;
    font-family: 'Segoe UI';
    font-size: 12px;
}
QMainWindow, QDialog {
    background-color: #06101c;
}
QFrame#sidebar {
    background-color: #081522;
    border-right: 1px solid #14314b;
}
QFrame#pageCard, QFrame#heroCard, QFrame#summaryCard, QFrame#accordionCard {
    background-color: #0d1b2d;
    border: 1px solid #17314c;
    border-radius: 18px;
}
QFrame#toolbarCard {
    background-color: #0a1625;
    border: 1px solid #15304b;
    border-radius: 16px;
}
QPushButton {
    background-color: #12304a;
    border: 1px solid #1c4465;
    border-radius: 12px;
    padding: 10px 14px;
    color: #e6eef8;
}
QPushButton:hover {
    background-color: #18405f;
}
QPushButton:pressed {
    background-color: #102c42;
}
QPushButton[accent="true"] {
    background-color: #16b6aa;
    color: #06101c;
    border: 1px solid #19d0c2;
    font-weight: 700;
}
QPushButton[nav="true"] {
    text-align: left;
    padding: 12px 14px;
    border-radius: 14px;
    background-color: transparent;
    border: 1px solid transparent;
}
QPushButton[nav="true"][active="true"] {
    background-color: #10263a;
    border: 1px solid #1a415f;
}
QLineEdit, QComboBox, QSpinBox {
    background-color: #081522;
    border: 1px solid #204360;
    border-radius: 12px;
    padding: 8px 10px;
    min-height: 18px;
}
QTableWidget {
    background-color: #081522;
    alternate-background-color: #0d1b2d;
    gridline-color: #14314b;
    border: 1px solid #17314c;
    border-radius: 16px;
    selection-background-color: #133958;
    selection-color: #ffffff;
}
QHeaderView::section {
    background-color: #0f2740;
    color: #d9e7f5;
    padding: 10px;
    border: none;
    border-bottom: 1px solid #1b4364;
    font-weight: 700;
}
QScrollArea {
    border: none;
}
QScrollBar:vertical {
    background: #081522;
    width: 12px;
    margin: 8px 0 8px 0;
}
QScrollBar::handle:vertical {
    background: #1f4d6f;
    border-radius: 6px;
    min-height: 28px;
}
QLabel[muted="true"] {
    color: #9fb0c8;
}
QLabel[cardTitle="true"] {
    font-size: 14px;
    font-weight: 700;
}
QLabel[hero="true"] {
    font-size: 28px;
    font-weight: 800;
}
QLabel[value="true"] {
    font-size: 22px;
    font-weight: 800;
}
QLabel[smallTitle="true"] {
    font-size: 13px;
    font-weight: 700;
}
"""

