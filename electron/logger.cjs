const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function serializeMeta(meta) {
  if (!meta) return "";

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [unserializable-meta]";
  }
}

function createLogger(filePath, scope) {
  ensureDir(path.dirname(filePath));

  function write(level, message, meta) {
    const line = `${new Date().toISOString()} [${scope}] [${level}] ${message}${serializeMeta(meta)}\n`;
    fs.appendFileSync(filePath, line, "utf8");
  }

  return {
    info(message, meta) {
      write("INFO", message, meta);
    },
    warn(message, meta) {
      write("WARN", message, meta);
    },
    error(message, meta) {
      write("ERROR", message, meta);
    },
    filePath,
  };
}

module.exports = {
  createLogger,
};
