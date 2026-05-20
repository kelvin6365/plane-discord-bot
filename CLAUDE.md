# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run the bot (`node src/index.js`)
- `npm run dev` — run with nodemon hot-reload
- `npm run deploy` — register/refresh Discord slash commands via `src/deploy-commands.js`. Must be re-run whenever a command's `data` (name, options, description) changes.

No test or lint scripts are configured.

## Architecture

This is a Discord.js v14 bot that bridges Discord slash commands to the [Plane](https://plane.so) project management API. Single Node process, no web server.

### Request flow

1. `src/index.js` boots: initializes storage, loads all files in `src/commands/` into `client.commands`, logs into Discord.
2. On `InteractionCreate`, the handler resolves the channel's Plane binding via `ChannelConfigManager.getConfig(guildId, channelId)`.
3. It then asks `PlaneServiceManager.getService(workspaceSlug, projectId)` for a (cached) `PlaneService` API client.
4. The command's `execute(interaction, { planeService, channelConfig })` is invoked. Commands that find `planeService === null` must render the "Channel Not Configured" embed (see `createIssue.js` for the canonical pattern).
5. Admin/setup commands listed in `ADMIN_COMMANDS` in `src/index.js` are exempted from the config lookup — they manage config themselves. **When adding a new admin command, you must add its name to that array** or it will be rejected in unconfigured channels.

### Multi-tenancy model

The bot supports many (workspace, project) pairs at once. A Discord channel is the unit of binding — each channel can be wired to one Plane project. All projects share the same `PLANE_API_KEY` env var; per-channel state is just `{workspaceSlug, projectId}`.

- `services/ChannelConfigManager.js` — guild+channel → config lookup, backed by storage.
- `services/PlaneServiceManager.js` — caches `PlaneService` instances keyed by `workspaceSlug:projectId`. Call `clearService(...)` after a config mutation so the next request rebuilds the client.
- `services/planeApi.js` — the actual axios-based Plane REST client.

### Storage abstraction

`src/storage/` defines a `BaseStorage` interface with two implementations: `JSONStorage` (default, file in `./data/channels.json`) and `SQLiteStorage` (opt-in via `STORAGE_TYPE=sqlite`, requires the optional `better-sqlite3` dep). Selection happens once at startup in `storage/index.js`. Anything persisted between restarts goes through this layer — the `./data` directory is the only stateful path and must be a mounted volume in Docker/Coolify.

### Commands directory convention

Each file in `src/commands/` exports `{ data: SlashCommandBuilder, execute(interaction, context) }`. `data.name` is the discord command name; it must match what gets registered via `npm run deploy`. The dispatcher injects `{ planeService, channelConfig }` as the second arg — there is no other DI mechanism.

## Environment

Required: `DISCORD_TOKEN`, `CLIENT_ID`, `PLANE_API_KEY`. Optional: `STORAGE_TYPE` (`json`|`sqlite`), `STORAGE_PATH`, `LOG_LEVEL`, `ENABLE_FILE_LOGS`. Loaded via `dotenv` from `.env` at process start; centralized in `src/config/config.js`.
