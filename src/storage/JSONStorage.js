const fs = require("fs").promises;
const path = require("path");
const BaseStorage = require("./BaseStorage");
const logger = require("../utils/logger");

/**
 * JSON file-based storage implementation.
 * Stores data in a JSON file with write queue to prevent race conditions.
 */
class JSONStorage extends BaseStorage {
  constructor(filePath = "./data/channels.json") {
    super();
    this.filePath = path.resolve(filePath);
    this.data = {};
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Load existing data or create empty file
      try {
        const content = await fs.readFile(this.filePath, "utf8");
        this.data = JSON.parse(content);
        logger.info("JSONStorage initialized", {
          filePath: this.filePath,
          entries: Object.keys(this.data).length,
        });
      } catch (err) {
        if (err.code === "ENOENT") {
          this.data = {};
          await this._persist();
          logger.info("JSONStorage created new file", {
            filePath: this.filePath,
          });
        } else {
          throw err;
        }
      }
    } catch (error) {
      logger.error("Failed to initialize JSONStorage", error);
      throw error;
    }
  }

  /**
   * Persist data to file with write queue to prevent race conditions
   * @private
   */
  async _persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
    });
    return this.writeQueue;
  }

  async get(key) {
    return this.data[key] || null;
  }

  async set(key, value) {
    this.data[key] = value;
    await this._persist();
  }

  async delete(key) {
    const existed = key in this.data;
    delete this.data[key];
    if (existed) {
      await this._persist();
    }
    return existed;
  }

  async list(prefix = "") {
    return Object.entries(this.data)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, value }));
  }
}

module.exports = JSONStorage;
