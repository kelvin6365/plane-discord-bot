# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-05-20

### Fixed

- `/plane-list` crashed with `Cannot read properties of null (reading 'id')` when `interaction.guild` was not yet hydrated in the client cache. Now reads `interaction.guildId` (always present on guild interactions) and guards the channel-name lookup against a missing guild object.

### Changed

- Replaced deprecated `{ ephemeral: true }` reply option with `{ flags: MessageFlags.Ephemeral }` across all commands and the global error handler, silencing the discord.js v14.16+ deprecation warning and forward-compatibility with the next major.

## [2.1.0] - 2026-05-20

### Security

- **HTML injection fix**: Issue descriptions are now HTML-escaped before being sent to Plane's `description_html` field, preventing markup-breaking or script-injection payloads from being persisted

### Added

- Required env vars (`DISCORD_TOKEN`, `CLIENT_ID`, `PLANE_API_KEY`) are now validated at startup; the bot exits with a clear error listing what's missing instead of failing cryptically later
- Graceful shutdown on `SIGTERM`/`SIGINT`: flushes storage, destroys the Discord client, exits cleanly
- Discord client `error`/`shardError`/`warn` listeners and `unhandledRejection` trap (no more silent process crashes)
- Heartbeat-file based Docker healthcheck (`/usr/src/app/data/.heartbeat`, refreshed every 30s) replaces the no-op `console.log` check
- Test suite using Node's built-in `node:test` runner (27 tests, zero new deps) — run with `npm test`
- `CLAUDE.md` repository guide for AI coding assistants

### Changed

- All Plane API calls now have a 30s timeout (60s for uploads); stalled requests no longer hang Discord interactions indefinitely
- `getAllIssues` returns a consistent `{ results, count, total_count }` shape on both success and error paths
- States, labels, and project details caches now expire after 5 minutes so renames in Plane propagate without a bot restart
- `JSONStorage` write queue survives failed writes (e.g. read-only filesystem) without poisoning subsequent writes
- `/upload-file` rejects oversized attachments before downloading them from Discord
- Removed the legacy `PlaneService.config` shim and unused `WORKSPACE_SLUG`/`PROJECT_ID` env keys; callers now use `planeService.workspaceSlug`/`projectId` directly

### Deployment notes

- The Docker healthcheck requires `/usr/src/app/data` to be writable (already required for channel storage)
- Deployments with previously-undetected missing env vars will now fail at startup rather than at first API call — verify your env before upgrading

## [2.0.0] - 2025-02-05

### Added

- **Multi-Channel Support**: Configure different Discord channels to connect to different Plane workspaces and projects
- **Admin Commands**:
  - `/plane-setup` - Configure a channel with a specific workspace and project (Admin only)
  - `/plane-config` - View the current channel's Plane configuration
  - `/plane-remove` - Remove Plane configuration from a channel (Admin only)
  - `/plane-list` - List all configured channels in the server (Admin only)
- **Flexible Storage Backend**:
  - JSON file storage (default) - no additional dependencies
  - SQLite storage (optional) - for larger deployments
  - Configurable via `STORAGE_TYPE` environment variable
- **PlaneServiceManager**: Caches PlaneService instances by workspace/project for better performance
- **ChannelConfigManager**: Manages channel-to-workspace/project mappings with persistent storage

### Changed

- **PlaneService Refactored**: Now accepts `workspaceSlug` and `projectId` as constructor parameters instead of reading from global config
- **Command Execution**: All issue commands now receive context with `planeService` and `channelConfig`
- **Environment Variables**:
  - `WORKSPACE_SLUG` and `PROJECT_ID` are now optional (channels configured via `/plane-setup`)
  - Added `STORAGE_TYPE` and `STORAGE_PATH` for storage configuration
- **Updated README**: Comprehensive documentation for multi-channel setup

### Technical Details

#### New Files

- `src/storage/BaseStorage.js` - Abstract storage interface
- `src/storage/JSONStorage.js` - JSON file-based storage implementation
- `src/storage/SQLiteStorage.js` - SQLite database storage implementation
- `src/storage/index.js` - Storage factory
- `src/services/PlaneServiceManager.js` - Manages multiple PlaneService instances
- `src/services/ChannelConfigManager.js` - Manages channel configurations
- `src/commands/planeSetup.js` - Setup command
- `src/commands/planeConfig.js` - Config view command
- `src/commands/planeRemove.js` - Remove config command
- `src/commands/planeList.js` - List configs command

#### Modified Files

- `src/services/planeApi.js` - Exports class instead of singleton instance
- `src/index.js` - Storage initialization and context injection
- `src/commands/createIssue.js` - New signature with context
- `src/commands/getIssues.js` - New signature with context
- `src/commands/viewIssue.js` - New signature with context
- `src/commands/uploadFile.js` - New signature with context
- `src/config/config.js` - Added storage configuration
- `.env.example` - Updated with new variables
- `package.json` - Added optional `better-sqlite3` dependency

### Migration Guide

If upgrading from v1.x:

1. Update your code: `npm install`
2. Deploy new commands: `npm run deploy`
3. Start the bot: `npm start`
4. Configure channels: Run `/plane-setup` in each channel where you want to use the bot

Note: The bot will show "Channel Not Configured" for unconfigured channels. This is expected - use `/plane-setup` to configure each channel.

---

## [1.0.0] - Previous Release

### Features

- Create issues with `/create-issue`
- View issues with `/view-issue`
- List issues with `/get-issues`
- Upload files with `/upload-file`
- Priority-based color coding
- Rich Discord embeds
- Winston logging
- Docker support
