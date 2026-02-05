const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const {
  getPriorityEmoji,
  formatState,
  formatDate,
  getIssueUrl,
} = require("../utils/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("get-issues")
    .setDescription("Get a list of issues")
    .addStringOption((option) =>
      option
        .setName("state")
        .setDescription("Filter by state")
        .setRequired(false)
        .addChoices(
          { name: "Backlog", value: "backlog" },
          { name: "Unstarted", value: "unstarted" },
          { name: "Started", value: "started" },
          { name: "Completed", value: "completed" },
          { name: "Cancelled", value: "cancelled" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("Filter by priority")
        .setRequired(false)
        .addChoices(
          { name: "Urgent", value: "urgent" },
          { name: "High", value: "high" },
          { name: "Medium", value: "medium" },
          { name: "Low", value: "low" }
        )
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
      const state = interaction.options.getString("state");
      const priority = interaction.options.getString("priority");

      logger.info("Getting issues command initiated", {
        user: interaction.user.tag,
        guild: interaction.guild?.name,
        workspace: channelConfig.workspaceSlug,
        project: channelConfig.projectId,
        filters: { state, priority },
      });

      // Show progress
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Fetching Issues...")
            .setDescription("Please wait while the issues are being fetched.")
            .setColor(0xfbbf24)
            .setTimestamp(),
        ],
      });

      const response = await planeService.getAllIssues({
        state,
        priority,
      });

      if (!response.results || response.results.length === 0) {
        logger.info("No issues found", { filters: { state, priority } });
        const noIssuesEmbed = new EmbedBuilder()
          .setTitle("📋 No Issues Found")
          .setDescription(
            "No issues match your criteria. Try different filters or create a new issue."
          )
          .setColor(0x6b7280)
          .setTimestamp();

        await interaction.editReply({ embeds: [noIssuesEmbed] });
        return;
      }

      logger.info("Issues fetched successfully", {
        count: response.results.length,
        totalCount: response.count,
      });

      // Create the main embed
      const issuesEmbed = new EmbedBuilder()
        .setTitle("📋 Issues List")
        .setColor(0x3b82f6)
        .setTimestamp();

      // Add summary field
      issuesEmbed.addFields({
        name: "Summary",
        value: `Showing ${response.results.length} of ${response.count} issues`,
        inline: false,
      });

      // Add each issue as a field
      response.results.forEach((issue) => {
        const issueUrl = getIssueUrl(
          planeService.config.WORKSPACE_SLUG,
          planeService.config.PROJECT_ID,
          issue.id
        );
        const priorityEmoji = getPriorityEmoji(issue.priority);
        const stateText = formatState(
          issue.state_detail?.name,
          issue.state_detail?.group
        );

        issuesEmbed.addFields({
          name: `${issue.formatted_id} ${issue.name}`,
          value: [
            `**Priority:** ${priorityEmoji} ${
              issue.priority?.toUpperCase() || "None"
            }`,
            `**State:** ${stateText}`,
            `**Created:** ${formatDate(issue.created_at)}`,
            `[View in Plane](${issueUrl})`,
          ].join("\n"),
          inline: false,
        });
      });

      await interaction.editReply({ embeds: [issuesEmbed] });
    } catch (error) {
      logger.error("Error fetching issues", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Failed to Fetch Issues")
        .setDescription(
          error.message || "An unexpected error occurred while fetching issues."
        )
        .setColor(0xdc2626)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
