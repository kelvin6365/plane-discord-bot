const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const { getIssueUrl } = require("../utils/utils");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("upload-file")
    .setDescription("Upload a file to an issue")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The sequence ID of the issue (e.g., PROJ-123)")
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("The file to upload (max 10MB)")
        .setRequired(true)
    ),

  async execute(interaction, { planeService, channelConfig }) {
    // Check if channel is configured
    if (!planeService || !channelConfig) {
      const notConfiguredEmbed = new EmbedBuilder()
        .setTitle("⚠️ Channel Not Configured")
        .setDescription(
          "This channel is not configured for Plane.\n" +
            "An administrator must use `/plane-setup` to configure this channel first."
        )
        .setColor(0xfbbf24)
        .setTimestamp();

      await interaction.reply({ embeds: [notConfiguredEmbed], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const sequenceId = interaction.options.getString("id").toUpperCase();
      const attachment = interaction.options.getAttachment("file");

      logger.info("File upload command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild?.name,
        workspace: channelConfig.workspaceSlug,
        project: channelConfig.projectId,
        issueId: sequenceId,
        file: {
          name: attachment.name,
          size: attachment.size,
          type: attachment.contentType,
        },
      });

      // Get issue first to validate it exists
      logger.debug("Validating issue existence", { sequenceId });
      const issue = await planeService.getIssueBySequenceId(sequenceId);

      // Show download progress
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Uploading File...")
            .setDescription("Downloading file from Discord...")
            .setColor(0xfbbf24)
            .setTimestamp(),
        ],
      });

      // Download the file from Discord
      logger.debug("Downloading file from Discord", {
        url: attachment.url,
        size: attachment.size,
      });
      const response = await axios.get(attachment.url, {
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(response.data);
      logger.debug("File downloaded successfully", {
        size: buffer.length,
      });

      // Update progress
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Uploading File...")
            .setDescription("Uploading to Plane...")
            .setColor(0xfbbf24)
            .setTimestamp(),
        ],
      });

      // Upload to Plane
      await planeService.uploadFileToIssue(
        issue.id,
        buffer,
        attachment.name,
        planeService.getContentType(attachment.name)
      );

      const issueUrl = getIssueUrl(
        planeService.config.WORKSPACE_SLUG,
        planeService.config.PROJECT_ID,
        issue.id
      );

      logger.info("File upload completed", {
        issueId: issue.id,
        fileName: attachment.name,
        fileSize: attachment.size,
      });

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ File Uploaded Successfully")
        .setColor(0x16a34a)
        .setURL(issueUrl)
        .addFields(
          {
            name: "Issue",
            value: `${issue.formatted_id} ${issue.name || "Untitled Issue"}`,
            inline: false,
          },
          {
            name: "File Details",
            value: [
              `${planeService.getFileIcon(attachment.name)} **Name:** ${
                attachment.name
              }`,
              `📏 **Size:** ${planeService.formatFileSize(attachment.size)}`,
              `🏷️ **Type:** ${planeService.getContentType(attachment.name)}`,
            ].join("\n"),
            inline: false,
          }
        )
        .setFooter({ text: `📅 Uploaded: ${new Date().toISOString()}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error uploading file", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Upload Failed")
        .setDescription(
          error.message ||
            "An unexpected error occurred while uploading the file."
        )
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
