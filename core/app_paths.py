from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
STATIONS_PATH = BASE_DIR / "stations.json"
SETTINGS_PATH = BASE_DIR / "settings.json"
DEFAULT_ETS2_DIR = Path.home() / "Documents" / "Euro Truck Simulator 2"
DEFAULT_FFMPEG = Path("C:/FFMpeg/bin/ffmpeg.exe")

