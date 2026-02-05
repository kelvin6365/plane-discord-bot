const JSONStorage = require("./JSONStorage");
const SQLiteStorage = require("./SQLiteStorage");
const logger = require("../utils/logger");

let storageInstance = null;

/**
 * Create and initialize the storage instance based on environment configuration.
 * @returns {Promise<BaseStorage>}
 */
async function createStorage() {
  const storageType = process.env.STORAGE_TYPE || "json";
  const storagePath = process.env.STORAGE_PATH;

  logger.info("Creating storage instance", { type: storageType });

  switch (storageType.toLowerCase()) {
    case "sqlite":
      storageInstance = new SQLiteStorage(
        storagePath || "./data/channels.db"
      );
      break;
    case "json":
    default:
      storageInstance = new JSONStorage(
        storagePath || "./data/channels.json"
      );
      break;
  }

  await storageInstance.initialize();
  return storageInstance;
}

/**
 * Get the initialized storage instance.
 * @returns {BaseStorage}
 * @throws {Error} if storage is not initialized
 */
function getStorage() {
  if (!storageInstance) {
    throw new Error("Storage not initialized. Call createStorage() first.");
  }
  return storageInstance;
}

/**
 * Close the storage connection (useful for graceful shutdown).
 * @returns {Promise<void>}
 */
async function closeStorage() {
  if (storageInstance) {
    await storageInstance.close();
    storageInstance = null;
  }
}

module.exports = {
  createStorage,
  getStorage,
  closeStorage,
};
