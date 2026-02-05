const PlaneService = require("./planeApi");
const logger = require("../utils/logger");

/**
 * Manages PlaneService instances, caching them by workspace/project combination.
 * Since all instances share the same API key, we cache by workspace:project key.
 */
class PlaneServiceManager {
  constructor() {
    this.services = new Map();
  }

  /**
   * Get or create a PlaneService instance for the given workspace/project.
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} projectId - The project ID
   * @returns {PlaneService}
   */
  getService(workspaceSlug, projectId) {
    const key = `${workspaceSlug}:${projectId}`;

    if (!this.services.has(key)) {
      logger.debug("Creating new PlaneService instance", {
        workspaceSlug,
        projectId,
      });
      const service = new PlaneService(workspaceSlug, projectId);
      this.services.set(key, service);
    }

    return this.services.get(key);
  }

  /**
   * Clear a cached service instance (useful if config changes).
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} projectId - The project ID
   */
  clearService(workspaceSlug, projectId) {
    const key = `${workspaceSlug}:${projectId}`;
    if (this.services.delete(key)) {
      logger.debug("Cleared PlaneService instance", { workspaceSlug, projectId });
    }
  }

  /**
   * Clear all cached services.
   */
  clearAll() {
    const count = this.services.size;
    this.services.clear();
    logger.info("Cleared all PlaneService instances", { count });
  }

  /**
   * Get count of active services.
   * @returns {number}
   */
  get size() {
    return this.services.size;
  }
}

// Export singleton manager instance
module.exports = new PlaneServiceManager();
