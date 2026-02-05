const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const channelConfigManager = require("../services/ChannelConfigManager");
const logger = require("../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plane-list")
    .setDescription("List all configured channels in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  // Admin command - does not need planeService context
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guild.id;

      logger.debug("Plane list command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild.name,
      });

      const configs = await channelConfigManager.listGuildConfigs(guildId);

      if (configs.length === 0) {
        const noConfigsEmbed = new EmbedBuilder()
          .setTitle("No Configurations")
          .setDescription(
            "No channels in this server have been configured for Plane.\n" +
              "Use `/plane-setup` in a channel to configure it."
          )
          .setColor(0x6b7280)
          .setTimestamp();

        await interaction.editReply({ embeds: [noConfigsEmbed] });
        return;
      }

      const listEmbed = new EmbedBuilder()
        .setTitle("Configured Channels")
        .setColor(0x3b82f6)
        .setDescription(`Found ${configs.length} configured channel(s)`)
        .setTimestamp();

      // Add each channel as a field (limit to 25 fields max for Discord embed)
      const maxFields = Math.min(configs.length, 25);
      for (let i = 0; i < maxFields; i++) {
        const { channelId, config } = configs[i];
        const channel = interaction.guild.channels.cache.get(channelId);
        const channelName = channel ? `#${channel.name}` : `<#${channelId}>`;

        listEmbed.addFields({
          name: channelName,
          value: [
            `**Workspace:** ${config.workspaceSlug}`,
            `**Project:** ${config.projectId}`,
            `**Configured by:** ${config.configuredByTag}`,
            `**Date:** ${new Date(config.configuredAt).toLocaleDateString()}`,
          ].join("\n"),
          inline: false,
        });
      }

      if (configs.length > 25) {
        listEmbed.setFooter({
          text: `Showing 25 of ${configs.length} configured channels`,
        });
      }

      await interaction.editReply({ embeds: [listEmbed] });
    } catch (error) {
      logger.error("Error in plane-list command", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(error.message || "An unexpected error occurred.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
