const fs = require("fs").promises;
const path = require("path");
const BaseStorage = require("./BaseStorage");
const logger = require("../utils/logger");

/**
 * SQLite-based storage implementation.
 * Uses better-sqlite3 for synchronous, fast database operations.
 * This is an optional storage backend - requires better-sqlite3 to be installed.
 */
class SQLiteStorage extends BaseStorage {
  constructor(filePath = "./data/channels.db") {
    super();
    this.filePath = path.resolve(filePath);
    this.db = null;
    this.stmtGet = null;
    this.stmtSet = null;
    this.stmtDelete = null;
    this.stmtList = null;
  }

  async initialize() {
    // Dynamic import for optional dependency
    let Database;
    try {
      Database = require("better-sqlite3");
    } catch (err) {
      throw new Error(
        'SQLite storage requires "better-sqlite3" package. Install it with: npm install better-sqlite3'
      );
    }

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    this.db = new Database(this.filePath);

    // Create table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS channel_configs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Prepare statements for better performance
    this.stmtGet = this.db.prepare(
      "SELECT value FROM channel_configs WHERE key = ?"
    );
    this.stmtSet = this.db.prepare(`
      INSERT INTO channel_configs (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    this.stmtDelete = this.db.prepare(
      "DELETE FROM channel_configs WHERE key = ?"
    );
    this.stmtList = this.db.prepare(
      "SELECT key, value FROM channel_configs WHERE key LIKE ?"
    );

    const count = this.db
      .prepare("SELECT COUNT(*) as count FROM channel_configs")
      .get();
    logger.info("SQLiteStorage initialized", {
      filePath: this.filePath,
      entries: count.count,
    });
  }

  async get(key) {
    const row = this.stmtGet.get(key);
    return row ? JSON.parse(row.value) : null;
  }

  async set(key, value) {
    this.stmtSet.run(key, JSON.stringify(value));
  }

  async delete(key) {
    const result = this.stmtDelete.run(key);
    return result.changes > 0;
  }

  async list(prefix = "") {
    const rows = this.stmtList.all(`${prefix}%`);
    return rows.map((row) => ({
      key: row.key,
      value: JSON.parse(row.value),
    }));
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.debug("SQLiteStorage closed");
    }
  }
}

module.exports = SQLiteStorage;
