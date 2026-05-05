import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    id: root
    width: 1560
    height: 940
    visible: true
    color: "#06101c"
    title: root.tr("app_title")

    property int currentPage: 0
    property int editingIndex: -1
    property bool welcomeVisible: true
    property string confirmAction: ""
    property string bannerKind: "info"

    function tr(key) {
        backend.currentLanguage
        return backend.trKey(key)
    }

    function showBanner(title, message, kind) {
        bannerKind = kind || "info"
        bannerTitle.text = title
        bannerMessage.text = message
        bannerPopup.open()
    }

    function handleResult(result) {
        if (!result)
            return
        if (result.ok)
            showBanner(result.title, result.message, "success")
        else
            showBanner(result.title, result.message, "warning")
    }

    function stationPayload() {
        return {
            "name": nameField.text,
            "genre": genreField.text,
            "language": languageField.text,
            "bitrate": Number(bitrateField.value),
            "port": Number(portField.value),
            "source": sourceField.text
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#06101c"

        RowLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 18

            Rectangle {
                Layout.preferredWidth: 270
                Layout.fillHeight: true
                color: "#081522"
                radius: 24
                border.color: "#14314b"

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 20
                    spacing: 12

                    Label {
                        text: root.tr("app_title")
                        color: "#eef6ff"
                        font.pixelSize: 24
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: root.tr("app_subtitle")
                        color: "#9fb0c8"
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    Item { Layout.preferredHeight: 8 }

                    Repeater {
                        model: [
                            { label: root.tr("tab_runtime"), index: 0 },
                            { label: root.tr("tab_radios"), index: 1 },
                            { label: root.tr("tab_settings"), index: 2 }
                        ]

                        delegate: Button {
                            required property var modelData
                            text: modelData.label
                            Layout.fillWidth: true
                            checkable: true
                            checked: root.currentPage === modelData.index
                            onClicked: root.currentPage = modelData.index

                            background: Rectangle {
                                radius: 16
                                color: parent.checked ? "#10263a" : "transparent"
                                border.color: parent.checked ? "#1a415f" : "transparent"
                            }

                            contentItem: Text {
                                text: parent.text
                                color: "#e6eef8"
                                font.pixelSize: 15
                                font.weight: Font.DemiBold
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }

                    Rectangle {
                        Layout.fillWidth: true
                        radius: 18
                        color: "#0d1b2d"
                        border.color: "#17314c"

                        Label {
                            anchors.fill: parent
                            anchors.margins: 16
                            text: root.tr("footer_warning")
                            color: "#9fb0c8"
                            wrapMode: Text.WordWrap
                        }
                    }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 16

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 132
                    color: "#0d1b2d"
                    radius: 24
                    border.color: "#17314c"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 24
                        spacing: 20

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label {
                                text: root.tr("app_title")
                                color: "#eef6ff"
                                font.pixelSize: 34
                                font.weight: Font.ExtraBold
                            }

                            Label {
                                text: root.tr("app_subtitle")
                                color: "#9fb0c8"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }

                        Rectangle {
                            Layout.preferredWidth: 210
                            Layout.preferredHeight: 84
                            radius: 20
                            color: "#081522"
                            border.color: "#17314c"

                            Column {
                                anchors.centerIn: parent
                                spacing: 6
                                Label {
                                    text: root.tr("metric_running")
                                    color: "#9fb0c8"
                                }
                                Label {
                                    text: backend.runningRelays
                                    color: "#2dd4bf"
                                    font.pixelSize: 28
                                    font.weight: Font.ExtraBold
                                }
                            }
                        }
                    }
                }

                StackLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    currentIndex: root.currentPage

                    Item {
                        ScrollView {
                            anchors.fill: parent
                            clip: true

                            ColumnLayout {
                                width: parent.width
                                spacing: 16

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 16

                                    Rectangle {
                                        Layout.fillWidth: true
                                        Layout.preferredHeight: 260
                                        color: "#0d1b2d"
                                        radius: 22
                                        border.color: "#17314c"

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 20
                                            spacing: 12

                                            RowLayout {
                                                Layout.fillWidth: true

                                                Label {
                                                    text: root.tr("config_title")
                                                    color: "#eef6ff"
                                                    font.pixelSize: 18
                                                    font.weight: Font.DemiBold
                                                }

                                                Item { Layout.fillWidth: true }

                                                Button {
                                                    text: root.tr("config_info_button")
                                                    onClicked: {
                                                        const result = backend.environmentInfo("")
                                                        showBanner(result.title, result.message, "info")
                                                    }
                                                }
                                            }

                                            Label {
                                                text: root.tr("config_body")
                                                color: "#9fb0c8"
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }

                                            Label { text: root.tr("ets2_dir"); color: "#9fb0c8" }
                                            TextField {
                                                text: backend.ets2Dir
                                                Layout.fillWidth: true
                                                onEditingFinished: backend.setEts2Dir(text)
                                            }

                                            Label { text: root.tr("ffmpeg_path"); color: "#9fb0c8" }
                                            TextField {
                                                text: backend.ffmpegPath
                                                Layout.fillWidth: true
                                                onEditingFinished: backend.setFfmpegPath(text)
                                            }
                                        }
                                    }

                                    Rectangle {
                                        Layout.preferredWidth: 360
                                        Layout.preferredHeight: 260
                                        color: "#0d1b2d"
                                        radius: 22
                                        border.color: "#17314c"

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 20
                                            spacing: 12

                                            Label {
                                                text: root.tr("runtime_title")
                                                color: "#eef6ff"
                                                font.pixelSize: 18
                                                font.weight: Font.DemiBold
                                            }

                                            Label {
                                                text: root.tr("runtime_body")
                                                color: "#9fb0c8"
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }

                                            Button {
                                                text: root.tr("sync_button")
                                                Layout.fillWidth: true
                                                onClicked: handleResult(backend.syncETS2())
                                            }

                                            Button {
                                                text: root.tr("start_button")
                                                Layout.fillWidth: true
                                                onClicked: handleResult(backend.startRelays())
                                            }

                                            Button {
                                                text: root.tr("stop_button")
                                                Layout.fillWidth: true
                                                onClicked: handleResult(backend.stopRelays())
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    Layout.fillWidth: true
                                    color: "#0d1b2d"
                                    radius: 22
                                    border.color: "#17314c"
                                    implicitHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 20
                                        spacing: 16

                                        Label {
                                            text: root.tr("summary_title")
                                            color: "#eef6ff"
                                            font.pixelSize: 18
                                            font.weight: Font.DemiBold
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 14

                                            Repeater {
                                                model: [
                                                    { label: root.tr("metric_total"), value: backend.totalStations, accent: "#2dd4bf" },
                                                    { label: root.tr("metric_running"), value: backend.runningRelays, accent: "#7dd3fc" },
                                                    { label: root.tr("metric_next_port"), value: backend.nextPort, accent: "#f59e0b" }
                                                ]

                                                delegate: Rectangle {
                                                    required property var modelData
                                                    Layout.fillWidth: true
                                                    Layout.preferredHeight: 110
                                                    radius: 18
                                                    color: "#081522"
                                                    border.color: "#17314c"

                                                    Column {
                                                        anchors.fill: parent
                                                        anchors.margins: 16
                                                        spacing: 8

                                                        Label {
                                                            text: modelData.label
                                                            color: "#9fb0c8"
                                                        }

                                                        Label {
                                                            text: modelData.value
                                                            color: modelData.accent
                                                            font.pixelSize: 28
                                                            font.weight: Font.ExtraBold
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        Label {
                                            text: backend.runtimeSummary
                                            color: "#9fb0c8"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Item {
                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 16

                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 84
                                color: "#0a1625"
                                radius: 20
                                border.color: "#15304b"

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 16
                                    spacing: 10

                                    Label {
                                        text: root.tr("radios_title")
                                        color: "#eef6ff"
                                        font.pixelSize: 18
                                        font.weight: Font.DemiBold
                                    }

                                    Item { Layout.fillWidth: true }

                                    Button {
                                        text: root.tr("add_button")
                                        onClicked: {
                                            editingIndex = -1
                                            nameField.text = ""
                                            sourceField.text = ""
                                            genreField.text = "Pop"
                                            languageField.text = "PTB"
                                            bitrateField.value = 128
                                            portField.value = backend.nextPort
                                            stationDialog.open()
                                        }
                                    }

                                    Button {
                                        text: root.tr("load_form")
                                        onClicked: {
                                            if (stationList.currentIndex < 0) {
                                                showBanner(root.tr("warn_nothing_selected_title"), root.tr("warn_nothing_selected_body"), "warning")
                                                return
                                            }
                                            const payload = backend.stationForEdit(stationList.currentIndex)
                                            editingIndex = stationList.currentIndex
                                            nameField.text = payload.name
                                            sourceField.text = payload.source
                                            genreField.text = payload.genre
                                            languageField.text = payload.language
                                            bitrateField.value = payload.bitrate
                                            portField.value = payload.port
                                            stationDialog.open()
                                        }
                                    }

                                    Button {
                                        text: root.tr("import_from_ets2")
                                        onClicked: {
                                            confirmAction = "import"
                                            confirmDialog.title = root.tr("import_confirm_title")
                                            confirmText.text = root.tr("import_confirm_body").replace("{path}", backend.ets2Dir + "/live_streams.sii")
                                            confirmDialog.open()
                                        }
                                    }

                                    Button {
                                        text: root.tr("save_button")
                                        onClicked: {
                                            const result = backend.saveStations()
                                            if (result.ok) {
                                                confirmAction = "save-apply"
                                                confirmDialog.title = root.tr("saved_title")
                                                confirmText.text = root.tr("saved_prompt")
                                                confirmDialog.open()
                                            } else {
                                                handleResult(result)
                                            }
                                        }
                                    }

                                    Button {
                                        text: root.tr("remove_selected")
                                        onClicked: {
                                            confirmAction = "delete"
                                            confirmDialog.title = root.tr("confirm_delete_title")
                                            confirmText.text = root.tr("confirm_delete_body").replace("{count}", String(backend.checkedCount))
                                            confirmDialog.open()
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                color: "#0d1b2d"
                                radius: 22
                                border.color: "#17314c"

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 16
                                    spacing: 12

                                    Label {
                                        text: backend.helperText
                                        color: "#9fb0c8"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    ListView {
                                        id: stationList
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        clip: true
                                        spacing: 10
                                        model: backend.stationModel

                                        delegate: Rectangle {
                                            required property int index
                                            required property string name
                                            required property string genre
                                            required property string language
                                            required property int bitrate
                                            required property int port
                                            required property string source
                                            required property string status
                                            required property bool checked

                                            width: stationList.width - 10
                                            height: 108
                                            radius: 18
                                            color: stationList.currentIndex === index ? "#12314c" : "#081522"
                                            border.color: stationList.currentIndex === index ? "#2dd4bf" : "#17314c"

                                            MouseArea {
                                                anchors.fill: parent
                                                onClicked: stationList.currentIndex = index
                                            }

                                            RowLayout {
                                                anchors.fill: parent
                                                anchors.margins: 16
                                                spacing: 14

                                                CheckBox {
                                                    checked: parent.parent.checked
                                                    onClicked: backend.toggleChecked(index)
                                                }

                                                ColumnLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 6

                                                    Label {
                                                        text: name
                                                        color: "#eef6ff"
                                                        font.pixelSize: 16
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: genre + " • " + language + " • " + bitrate + " kbps"
                                                        color: "#9fb0c8"
                                                    }

                                                    Label {
                                                        text: source
                                                        color: "#7dd3fc"
                                                        elide: Text.ElideRight
                                                        Layout.fillWidth: true
                                                    }
                                                }

                                                ColumnLayout {
                                                    Layout.preferredWidth: 180
                                                    spacing: 8

                                                    Rectangle {
                                                        radius: 14
                                                        color: "#0d1f33"
                                                        border.color: "#17314c"
                                                        implicitHeight: 34
                                                        Layout.fillWidth: true

                                                        Label {
                                                            anchors.centerIn: parent
                                                            text: status
                                                            color: "#e6eef8"
                                                        }
                                                    }

                                                    Label {
                                                        text: root.tr("col_port") + ": " + port
                                                        color: "#9fb0c8"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Item {
                        ScrollView {
                            anchors.fill: parent

                            ColumnLayout {
                                width: parent.width
                                spacing: 16

                                Rectangle {
                                    Layout.fillWidth: true
                                    color: "#0d1b2d"
                                    radius: 22
                                    border.color: "#17314c"

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 20
                                        spacing: 14

                                        Label {
                                            text: root.tr("settings_title")
                                            color: "#eef6ff"
                                            font.pixelSize: 18
                                            font.weight: Font.DemiBold
                                        }

                                        Label {
                                            text: root.tr("settings_body")
                                            color: "#9fb0c8"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label { text: root.tr("change_language"); color: "#9fb0c8" }
                                        ComboBox {
                                            id: languageCombo
                                            Layout.preferredWidth: 300
                                            model: backend.languageOptions
                                            textRole: "label"
                                            valueRole: "code"
                                            Component.onCompleted: {
                                                for (let i = 0; i < model.length; i++) {
                                                    if (model[i].code === backend.currentLanguage) {
                                                        currentIndex = i
                                                        break
                                                    }
                                                }
                                            }
                                        }

                                        Button {
                                            text: root.tr("apply_language")
                                            onClicked: {
                                                const result = backend.applyLanguage(languageCombo.currentValue)
                                                handleResult(result)
                                            }
                                        }

                                        Rectangle {
                                            Layout.fillWidth: true
                                            radius: 18
                                            color: "#081522"
                                            border.color: "#17314c"

                                            ColumnLayout {
                                                anchors.fill: parent
                                                anchors.margins: 16
                                                spacing: 10

                                                Button {
                                                    id: helpToggle
                                                    text: helpTextBlock.visible ? root.tr("how_to_use_button") + " ▾" : root.tr("how_to_use_button") + " ▸"
                                                    onClicked: helpTextBlock.visible = !helpTextBlock.visible
                                                }

                                                Label {
                                                    id: helpTextBlock
                                                    visible: false
                                                    text: backend.helpText()
                                                    color: "#9fb0c8"
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#06101c"
        visible: welcomeVisible
        z: 30

        Rectangle {
            width: 560
            radius: 28
            color: "#0d1b2d"
            border.color: "#17314c"
            anchors.centerIn: parent

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                Label {
                    text: root.tr("welcome_heading")
                    color: "#eef6ff"
                    font.pixelSize: 28
                    font.weight: Font.ExtraBold
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: root.tr("welcome_body")
                    color: "#9fb0c8"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: root.tr("language_label")
                    color: "#9fb0c8"
                }

                ComboBox {
                    id: welcomeLanguageCombo
                    Layout.fillWidth: true
                    model: backend.languageOptions
                    textRole: "label"
                    valueRole: "code"
                    Component.onCompleted: {
                        for (let i = 0; i < model.length; i++) {
                            if (model[i].code === backend.currentLanguage) {
                                currentIndex = i
                                break
                            }
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    Item { Layout.fillWidth: true }

                    Button {
                        text: root.tr("continue_button")
                        onClicked: {
                            handleResult(backend.applyLanguage(welcomeLanguageCombo.currentValue))
                            welcomeVisible = false
                        }
                    }
                }
            }
        }
    }

    Popup {
        id: bannerPopup
        x: root.width - width - 32
        y: 24
        width: 420
        height: implicitHeight
        modal: false
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            radius: 18
            color: bannerKind === "warning" ? "#3b1f17" : "#0d1b2d"
            border.color: bannerKind === "warning" ? "#f59e0b" : "#2dd4bf"
        }

        contentItem: ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 8

            Label {
                id: bannerTitle
                color: "#eef6ff"
                font.pixelSize: 16
                font.weight: Font.DemiBold
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }

            Label {
                id: bannerMessage
                color: "#cfe0f2"
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }

            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: "OK"
                    onClicked: bannerPopup.close()
                }
            }
        }
    }

    Dialog {
        id: stationDialog
        modal: true
        anchors.centerIn: parent
        width: 560
        standardButtons: Dialog.NoButton

        background: Rectangle {
            radius: 24
            color: "#0d1b2d"
            border.color: "#17314c"
        }

        contentItem: ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 12

            Label {
                text: root.tr("editor_title")
                color: "#eef6ff"
                font.pixelSize: 20
                font.weight: Font.DemiBold
            }

            Label {
                text: root.tr("editor_body")
                color: "#9fb0c8"
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            Label { text: root.tr("field_name"); color: "#9fb0c8" }
            TextField { id: nameField; Layout.fillWidth: true }
            Label { text: root.tr("field_source"); color: "#9fb0c8" }
            TextField { id: sourceField; Layout.fillWidth: true }
            Label { text: root.tr("field_genre"); color: "#9fb0c8" }
            TextField { id: genreField; Layout.fillWidth: true }
            Label { text: root.tr("field_language"); color: "#9fb0c8" }
            TextField { id: languageField; Layout.fillWidth: true }
            Label { text: root.tr("field_bitrate"); color: "#9fb0c8" }
            SpinBox { id: bitrateField; from: 1; to: 1000; value: 128; Layout.fillWidth: true }
            Label { text: root.tr("field_port"); color: "#9fb0c8" }
            SpinBox { id: portField; from: 1024; to: 65535; value: backend.nextPort; Layout.fillWidth: true }

            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: root.tr("cancel_button")
                    onClicked: stationDialog.close()
                }
                Button {
                    text: editingIndex >= 0 ? root.tr("update_selected") : root.tr("add_button")
                    onClicked: {
                        const payload = stationPayload()
                        const result = editingIndex >= 0
                            ? backend.updateStation(editingIndex, payload)
                            : backend.addStation(payload)
                        handleResult(result)
                        if (result.ok) {
                            stationDialog.close()
                        }
                    }
                }
            }
        }
    }

    Dialog {
        id: confirmDialog
        modal: true
        anchors.centerIn: parent
        width: 520
        standardButtons: Dialog.NoButton

        background: Rectangle {
            radius: 24
            color: "#0d1b2d"
            border.color: "#17314c"
        }

        contentItem: ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 14

            Label {
                text: confirmDialog.title
                color: "#eef6ff"
                font.pixelSize: 20
                font.weight: Font.DemiBold
            }

            Label {
                id: confirmText
                color: "#9fb0c8"
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: root.tr("cancel_button")
                    onClicked: confirmDialog.close()
                }
                Button {
                    text: "OK"
                    onClicked: {
                        if (confirmAction === "delete") {
                            handleResult(backend.deleteCheckedStations())
                        } else if (confirmAction === "import") {
                            handleResult(backend.importFromETS2())
                        } else if (confirmAction === "save-apply") {
                            handleResult(backend.syncETS2())
                        }
                        confirmDialog.close()
                    }
                }
            }
        }
    }
}
