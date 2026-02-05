const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const channelConfigManager = require("../services/ChannelConfigManager");
const logger = require("../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plane-config")
    .setDescription("View the current Plane configuration for this channel")
    .setDMPermission(false),

  // Admin command - does not need planeService context
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const channelId = interaction.channelId;

      logger.debug("Plane config command initiated", {
        user: interaction.user.tag,
        guild: interaction.guildId,
        channel: interaction.channelId,
      });

      const config = await channelConfigManager.getConfig(guildId, channelId);

      if (!config) {
        const notConfiguredEmbed = new EmbedBuilder()
          .setTitle("Channel Not Configured")
          .setDescription(
            "This channel is not configured for Plane.\n" +
              "An administrator can use `/plane-setup` to configure it."
          )
          .setColor(0x6b7280)
          .setTimestamp();

        await interaction.editReply({ embeds: [notConfiguredEmbed] });
        return;
      }

      const configEmbed = new EmbedBuilder()
        .setTitle("Channel Configuration")
        .setColor(0x3b82f6)
        .addFields(
          { name: "Workspace", value: config.workspaceSlug, inline: true },
          { name: "Project ID", value: config.projectId, inline: true },
          {
            name: "Configured By",
            value: config.configuredByTag,
            inline: false,
          },
          {
            name: "Configured At",
            value: new Date(config.configuredAt).toLocaleString(),
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [configEmbed] });
    } catch (error) {
      logger.error("Error in plane-config command", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(error.message || "An unexpected error occurred.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
