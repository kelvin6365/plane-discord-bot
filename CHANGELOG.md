# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
