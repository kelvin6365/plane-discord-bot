const { getStorage } = require("../storage");
const logger = require("../utils/logger");

/**
 * @typedef {Object} ChannelConfig
 * @property {string} workspaceSlug - The Plane workspace slug
 * @property {string} projectId - The Plane project ID
 * @property {string} configuredBy - Discord user ID who configured this channel
 * @property {string} configuredByTag - Discord user tag for display
 * @property {string} configuredAt - ISO timestamp when configured
 */

/**
 * Manages channel-to-workspace/project mappings.
 * Uses the storage abstraction to persist configurations.
 */
class ChannelConfigManager {
  /**
   * Build the storage key for a channel.
   * @param {string} guildId - Discord guild/server ID
   * @param {string} channelId - Discord channel ID
   * @returns {string}
   * @private
   */
  _getKey(guildId, channelId) {
    return `${guildId}:${channelId}`;
  }

  /**
   * Get configuration for a specific channel.
   * @param {string} guildId - Discord guild/server ID
   * @param {string} channelId - Discord channel ID
   * @returns {Promise<ChannelConfig|null>}
   */
  async getConfig(guildId, channelId) {
    const storage = getStorage();
    const key = this._getKey(guildId, channelId);
    const config = await storage.get(key);

    logger.debug("Retrieved channel config", {
      guildId,
      channelId,
      found: !!config,
    });

    return config;
  }

  /**
   * Set configuration for a channel.
   * @param {string} guildId - Discord guild/server ID
   * @param {string} channelId - Discord channel ID
   * @param {string} workspaceSlug - The Plane workspace slug
   * @param {string} projectId - The Plane project ID
   * @param {Object} configuredBy - User who configured { id, tag }
   * @returns {Promise<ChannelConfig>}
   */
  async setConfig(guildId, channelId, workspaceSlug, projectId, configuredBy) {
    const storage = getStorage();
    const key = this._getKey(guildId, channelId);

    const config = {
      workspaceSlug,
      projectId,
      configuredBy: configuredBy.id,
      configuredByTag: configuredBy.tag,
      configuredAt: new Date().toISOString(),
    };

    await storage.set(key, config);

    logger.info("Channel config set", {
      guildId,
      channelId,
      workspaceSlug,
      projectId,
      configuredBy: configuredBy.tag,
    });

    return config;
  }

  /**
   * Remove configuration for a channel.
   * @param {string} guildId - Discord guild/server ID
   * @param {string} channelId - Discord channel ID
   * @returns {Promise<boolean>} - true if config existed and was removed
   */
  async removeConfig(guildId, channelId) {
    const storage = getStorage();
    const key = this._getKey(guildId, channelId);
    const removed = await storage.delete(key);

    logger.info("Channel config removed", {
      guildId,
      channelId,
      wasConfigured: removed,
    });

    return removed;
  }

  /**
   * List all configurations for a guild/server.
   * @param {string} guildId - Discord guild/server ID
   * @returns {Promise<Array<{channelId: string, config: ChannelConfig}>>}
   */
  async listGuildConfigs(guildId) {
    const storage = getStorage();
    const prefix = `${guildId}:`;
    const entries = await storage.list(prefix);

    const configs = entries.map((entry) => ({
      channelId: entry.key.split(":")[1],
      config: entry.value,
    }));

    logger.debug("Listed guild configs", {
      guildId,
      count: configs.length,
    });

    return configs;
  }
}

// Export singleton instance
module.exports = new ChannelConfigManager();
