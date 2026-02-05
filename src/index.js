require("dotenv").config();
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const config = require("./config/config");
const logger = require("./utils/logger");
const { createStorage } = require("./storage");
const channelConfigManager = require("./services/ChannelConfigManager");
const planeServiceManager = require("./services/PlaneServiceManager");

// Commands that don't require channel configuration (admin/setup commands)
const ADMIN_COMMANDS = [
  "plane-setup",
  "plane-config",
  "plane-remove",
  "plane-list",
];

// Log startup information
logger.info("Starting Discord bot...", {
  node_version: process.version,
  platform: process.platform,
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    logger.debug(`Loaded command: ${command.data.name}`);
  }
}

client.once(Events.ClientReady, () => {
  logger.info("Discord bot is ready!", {
    username: client.user.tag,
    guilds: client.guilds.cache.size,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        logger.debug(`Executing command: ${interaction.commandName}`, {
          user: interaction.user.tag,
          guildId,
          channelId,
        });

        // Build execution context
        let context = {
          planeService: null,
          channelConfig: null,
        };

        // Skip config lookup for admin commands (they manage config themselves)
        if (!ADMIN_COMMANDS.includes(interaction.commandName)) {
          // Get channel configuration
          const channelConfig = await channelConfigManager.getConfig(
            guildId,
            channelId
          );

          if (channelConfig) {
            // Get PlaneService for this workspace/project
            const planeService = planeServiceManager.getService(
              channelConfig.workspaceSlug,
              channelConfig.projectId
            );
            context = { planeService, channelConfig };
          }
          // If no config found, context remains with null values
          // Commands will handle this and show "channel not configured" message
        }

        // Execute command with context
        await command.execute(interaction, context);
      } catch (error) {
        logger.error(
          `Error executing command: ${interaction.commandName}`,
          error
        );
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error executing this command!",
            ephemeral: true,
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error in interaction handler", error);
  }
});

// Initialize storage and start the bot
async function start() {
  try {
    // Initialize storage first
    await createStorage();
    logger.info("Storage initialized successfully");

    // Login to Discord
    await client.login(config.DISCORD_TOKEN);
  } catch (error) {
    logger.error("Failed to start bot", error);
    process.exit(1);
  }
}

start();
