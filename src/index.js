require("dotenv").config();
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const config = require("./config/config");
const logger = require("./utils/logger");
const { createStorage, closeStorage } = require("./storage");
const channelConfigManager = require("./services/ChannelConfigManager");
const planeServiceManager = require("./services/PlaneServiceManager");

// Commands that don't require channel configuration (admin/setup commands)
const ADMIN_COMMANDS = [
  "plane-setup",
  "plane-config",
  "plane-remove",
  "plane-list",
];

const HEARTBEAT_PATH =
  process.env.HEARTBEAT_PATH || "/usr/src/app/data/.heartbeat";
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

// Fail fast if required env is missing.
try {
  config.validateConfig();
} catch (err) {
  logger.error("Configuration error", err);
  process.exit(1);
}

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

let heartbeatTimer = null;

function writeHeartbeat() {
  try {
    fs.mkdirSync(path.dirname(HEARTBEAT_PATH), { recursive: true });
    fs.writeFileSync(HEARTBEAT_PATH, String(Date.now()));
  } catch (err) {
    logger.warn("Failed to write heartbeat", { error: err.message });
  }
}

client.once(Events.ClientReady, () => {
  logger.info("Discord bot is ready!", {
    username: client.user.tag,
    guilds: client.guilds.cache.size,
  });
  writeHeartbeat();
  heartbeatTimer = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL_MS);
});

client.on(Events.Error, (err) => logger.error("Discord client error", err));
client.on(Events.ShardError, (err) =>
  logger.error("Discord shard error", err)
);
client.on(Events.Warn, (msg) =>
  logger.warn("Discord client warning", { message: msg })
);

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
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: "There was an error executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error in interaction handler", error);
  }
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down", { signal });
  try {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await client.destroy();
    await closeStorage();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason instanceof Error ? reason : new Error(String(reason)));
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
