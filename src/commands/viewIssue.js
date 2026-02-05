const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const {
  getPriorityEmoji,
  formatState,
  getIssueColor,
  formatDate,
  formatDescription,
  getIssueUrl,
  formatLabels,
} = require("../utils/utils");

const formatAttachments = (attachments, planeService) => {
  if (!attachments || attachments.length === 0)
    return { text: "No attachments" };

  const otherAttachments = [];

  attachments.forEach((attachment) => {
    const icon = planeService.getFileIcon(attachment.attributes.name);
    const size = planeService.formatFileSize(attachment.attributes.size);
    otherAttachments.push({
      name: attachment.attributes.name,
      url: `https://api.plane.so/api/assets/v2/workspaces/${planeService.config.WORKSPACE_SLUG}/projects/${planeService.config.PROJECT_ID}/issues/${attachment.issue}/attachments/${attachment.id}`,
      size: size,
      icon: icon,
    });
  });

  const parts = [];

  // Format non-image attachments as links with icons
  if (otherAttachments.length > 0) {
    const displayAttachments = otherAttachments.slice(0, 3);
    const remainingCount = otherAttachments.length - 3;

    parts.push(
      displayAttachments
        .map(
          (file) => `${file.icon} [${file.name}](${file.url}) (${file.size})`
        )
        .join("\n")
    );

    if (remainingCount > 0) {
      parts.push(
        `\n📎 +${remainingCount} more attachment${
          remainingCount === 1 ? "" : "s"
        }`
      );
    }
  }

  return {
    text: parts.join("\n") || "No attachments",
  };
};

const formatMetadata = (issue) => {
  const parts = [];
  if (issue.created_at) {
    parts.push(`📅 Created: ${formatDate(issue.created_at)}`);
  }
  if (issue.updated_at && issue.updated_at !== issue.created_at) {
    parts.push(`🔄 Updated: ${formatDate(issue.updated_at)}`);
  }
  return parts.join(" • ");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view-issue")
    .setDescription("View details of a specific issue")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The sequence ID of the issue (e.g., PROJ-123)")
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

      logger.info("View issue command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild?.name,
        workspace: channelConfig.workspaceSlug,
        project: channelConfig.projectId,
        issueId: sequenceId,
      });

      // Show progress
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Fetching Issue...")
            .setDescription(
              "Please wait while the issue details are being fetched."
            )
            .setColor(0xfbbf24)
            .setTimestamp(),
        ],
      });

      const issue = await planeService.getIssueBySequenceId(sequenceId);

      logger.debug("Issue fetched successfully", {
        issueId: issue.id,
        hasAttachments: issue.attachments?.length > 0,
        hasLabels: issue.label_details?.length > 0,
      });

      const issueUrl = getIssueUrl(
        planeService.config.WORKSPACE_SLUG,
        planeService.config.PROJECT_ID,
        issue.id
      );

      // Main embed with issue details
      const mainEmbed = new EmbedBuilder()
        .setTitle(`${issue.formatted_id} ${issue.name || "Untitled Issue"}`)
        .setURL(issueUrl)
        .setColor(getIssueColor(issue))
        .setFooter({ text: formatMetadata(issue) })
        .setTimestamp();

      // Add description if exists
      if (issue.description) {
        mainEmbed.setDescription(formatDescription(issue.description));
      }

      // Status section
      mainEmbed.addFields({
        name: "Status",
        value: [
          `**Priority:** ${getPriorityEmoji(issue.priority)} ${
            issue.priority?.toUpperCase() || "None"
          }`,
          `**State:** ${formatState(
            issue.state_detail?.name,
            issue.state_detail?.group
          )}`,
        ].join("\n"),
        inline: false,
      });

      const embeds = [mainEmbed];

      // Handle attachments
      if (issue.attachments?.length > 0) {
        logger.debug("Processing attachments", {
          count: issue.attachments.length,
        });

        const { text } = formatAttachments(issue.attachments, planeService);
        logger.info("Attachments processed", { text });
        // Add non-image attachments as field
        if (text !== "No attachments") {
          mainEmbed.addFields({
            name: "📁 Attachments",
            value: text,
            inline: false,
          });
        }
      }

      // Quick actions
      mainEmbed.addFields({
        name: "🔗 Quick Actions",
        value: `[View in Plane](${issueUrl})`,
        inline: false,
      });

      // Add label embeds if present
      if (issue.label_details?.length > 0) {
        logger.debug("Processing labels", {
          count: issue.label_details.length,
        });

        const labelFields = formatLabels(issue.label_details);
        // Group labels in a single embed
        const labelsEmbed = new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle("Labels");

        labelFields.forEach((field) => {
          labelsEmbed.addFields({
            name: field.name,
            value: field.value,
            inline: true,
          });
        });

        embeds.push(labelsEmbed);
      }

      logger.info("Issue details displayed successfully", {
        issueId: issue.id,
        embedCount: embeds.length,
      });

      await interaction.editReply({ embeds });
    } catch (error) {
      logger.error("Error viewing issue", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Failed to View Issue")
        .setDescription(
          error.message ||
            "An unexpected error occurred while fetching the issue."
        )
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
