require("dotenv").config();

const config = {
  // Discord
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,

  // Plane API (shared across all workspaces/projects)
  PLANE_API_KEY: process.env.PLANE_API_KEY,

  // Storage configuration
  STORAGE_TYPE: process.env.STORAGE_TYPE || "json",
  STORAGE_PATH: process.env.STORAGE_PATH,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_FILE_LOGS: process.env.ENABLE_FILE_LOGS || "false",
};

const REQUIRED_KEYS = ["DISCORD_TOKEN", "CLIENT_ID", "PLANE_API_KEY"];

function validateConfig() {
  const missing = REQUIRED_KEYS.filter(
    (key) => !config[key] || String(config[key]).trim() === ""
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set these in your .env file or process environment before starting the bot.`
    );
  }
}

module.exports = config;
module.exports.validateConfig = validateConfig;
