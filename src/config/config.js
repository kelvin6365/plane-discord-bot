require("dotenv").config();

module.exports = {
  // Discord
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,

  // Plane API (shared across all workspaces/projects)
  PLANE_API_KEY: process.env.PLANE_API_KEY,

  // Legacy/fallback settings (channels can override via /plane-setup)
  WORKSPACE_SLUG: process.env.WORKSPACE_SLUG,
  PROJECT_ID: process.env.PROJECT_ID,

  // Storage configuration
  STORAGE_TYPE: process.env.STORAGE_TYPE || "json", // "json" or "sqlite"
  STORAGE_PATH: process.env.STORAGE_PATH, // Optional: custom path for storage file

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_FILE_LOGS: process.env.ENABLE_FILE_LOGS || "false",
};
