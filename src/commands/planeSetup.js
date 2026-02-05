const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const channelConfigManager = require("../services/ChannelConfigManager");
const planeServiceManager = require("../services/PlaneServiceManager");
const logger = require("../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plane-setup")
    .setDescription(
      "Configure this channel to use a specific Plane workspace and project"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("workspace")
        .setDescription("The Plane workspace slug")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("project")
        .setDescription("The Plane project ID")
        .setRequired(true)
    ),

  // Admin command - does not need planeService context
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const workspaceSlug = interaction.options.getString("workspace");
      const projectId = interaction.options.getString("project");
      const guildId = interaction.guild.id;
      const channelId = interaction.channelId;

      logger.info("Plane setup command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild.name,
        channel: interaction.channel.name,
        workspaceSlug,
        projectId,
      });

      // Validate by attempting to create a service and fetch project details
      let projectDetails;
      try {
        const testService = planeServiceManager.getService(
          workspaceSlug,
          projectId
        );
        projectDetails = await testService.getProjectDetails();
      } catch (validationError) {
        logger.warn("Invalid workspace/project configuration", {
          workspaceSlug,
          projectId,
          error: validationError.message,
        });

        // Clear the failed service from cache
        planeServiceManager.clearService(workspaceSlug, projectId);

        const errorEmbed = new EmbedBuilder()
          .setTitle("Invalid Configuration")
          .setDescription(
            "Could not validate the workspace and project. Please check:\n" +
              "- The workspace slug is correct\n" +
              "- The project ID is correct\n" +
              "- The API key has access to this workspace/project"
          )
          .setColor(0xdc2626)
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      // Save the configuration
      const config = await channelConfigManager.setConfig(
        guildId,
        channelId,
        workspaceSlug,
        projectId,
        { id: interaction.user.id, tag: interaction.user.tag }
      );

      const successEmbed = new EmbedBuilder()
        .setTitle("Channel Configured")
        .setDescription(`This channel is now connected to Plane!`)
        .setColor(0x16a34a)
        .addFields(
          { name: "Workspace", value: workspaceSlug, inline: true },
          {
            name: "Project",
            value: `${projectDetails.name} (${projectDetails.identifier})`,
            inline: true,
          },
          { name: "Configured By", value: interaction.user.tag, inline: false }
        )
        .setFooter({ text: "Use /plane-config to view this configuration" })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error in plane-setup command", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("Setup Failed")
        .setDescription(error.message || "An unexpected error occurred.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
