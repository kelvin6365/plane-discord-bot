/**
 * Abstract base class for storage implementations.
 * All methods are async for consistency across implementations.
 */
class BaseStorage {
  /**
   * Initialize the storage (create files/tables if needed)
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error("Method not implemented");
  }

  /**
   * Get a value by key
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    throw new Error("Method not implemented");
  }

  /**
   * Set a value by key
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete a value by key
   * @param {string} key
   * @returns {Promise<boolean>} - true if key existed and was deleted
   */
  async delete(key) {
    throw new Error("Method not implemented");
  }

  /**
   * List all entries matching a prefix
   * @param {string} prefix
   * @returns {Promise<Array<{key: string, value: any}>>}
   */
  async list(prefix) {
    throw new Error("Method not implemented");
  }

  /**
   * Optional cleanup (close connections, etc.)
   * @returns {Promise<void>}
   */
  async close() {
    // Default: no-op
  }
}

module.exports = BaseStorage;
