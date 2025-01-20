const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const planeService = require("../services/planeApi");
const logger = require("../utils/logger");
const {
  getPriorityEmoji,
  getIssueUrl,
  getPriorityColor,
  formatDate
} = require("../utils/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-issue")
    .setDescription("Create a new issue")
    .addStringOption((option) =>
      option.setName("title").setDescription("Issue title").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Issue description")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("Issue priority")
        .setRequired(false)
        .addChoices(
          { name: "Urgent", value: "urgent" },
          { name: "High", value: "high" },
          { name: "Medium", value: "medium" },
          { name: "Low", value: "low" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      logger.info("Creating new issue command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild?.name
      });

      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description") || "";
      const priority = interaction.options.getString("priority") || "none";

      logger.debug("Issue creation parameters", {
        title,
        description: description ? "Provided" : "Not provided",
        priority
      });

      // Show progress
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Creating Issue...")
            .setDescription("Please wait while the issue is being created.")
            .setColor(0xfbbf24)
            .setTimestamp()
        ]
      });

      const issue = await planeService.createIssue(title, description, priority);

      logger.info("Issue created successfully", {
        issueId: issue.id,
        sequenceId: issue.sequence_id
      });

      const issueUrl = getIssueUrl(
        planeService.config.WORKSPACE_SLUG,
        planeService.config.PROJECT_ID,
        issue.id
      );

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Issue Created Successfully")
        .setColor(getPriorityColor(priority))
        .setDescription(`>>> ${title}`)
        .addFields(
          {
            name: "Issue Details",
            value: [
              `**ID:** ${issue.sequence_id}`,
              `**Priority:** ${getPriorityEmoji(
                priority
              )} ${priority.toUpperCase()}`,
              `**Description:** ${description.length > 100
                ? description.substring(0, 97) + "..."
                : description
              }`,
            ].join("\n"),
            inline: false,
          },
          {
            name: "🔗 Quick Actions",
            value: `[View in Plane](${issueUrl})`,
            inline: false,
          }
        )
        .setFooter({ text: `📅 Created: ${formatDate(issue.created_at)}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error("Error creating issue", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Failed to Create Issue")
        .setDescription(error.message || "An unexpected error occurred while creating the issue.")
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
