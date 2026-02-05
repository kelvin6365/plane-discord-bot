const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const channelConfigManager = require("../services/ChannelConfigManager");
const logger = require("../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plane-remove")
    .setDescription("Remove the Plane configuration from this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  // Admin command - does not need planeService context
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const channelId = interaction.channelId;

      logger.info("Plane remove command initiated", {
        user: interaction.user.tag,
        guild: interaction.guildId,
        channel: interaction.channelId,
      });

      // Get current config before removing (for display)
      const config = await channelConfigManager.getConfig(guildId, channelId);

      if (!config) {
        const notConfiguredEmbed = new EmbedBuilder()
          .setTitle("Not Configured")
          .setDescription(
            "This channel doesn't have a Plane configuration to remove."
          )
          .setColor(0x6b7280)
          .setTimestamp();

        await interaction.editReply({ embeds: [notConfiguredEmbed] });
        return;
      }

      // Remove the configuration
      await channelConfigManager.removeConfig(guildId, channelId);

      logger.info("Channel config removed", {
        user: interaction.user.tag,
        guild: interaction.guildId,
        channel: interaction.channelId,
        previousWorkspace: config.workspaceSlug,
        previousProject: config.projectId,
      });

      const successEmbed = new EmbedBuilder()
        .setTitle("Configuration Removed")
        .setDescription("This channel is no longer connected to Plane.")
        .setColor(0x16a34a)
        .addFields(
          {
            name: "Previous Workspace",
            value: config.workspaceSlug,
            inline: true,
          },
          { name: "Previous Project", value: config.projectId, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error in plane-remove command", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(error.message || "An unexpected error occurred.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
