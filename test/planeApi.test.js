const { test } = require("node:test");
const assert = require("node:assert/strict");

// Stub env before requiring the module (it reads PLANE_API_KEY at load time).
process.env.PLANE_API_KEY = process.env.PLANE_API_KEY || "test-key";
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || "test";
process.env.CLIENT_ID = process.env.CLIENT_ID || "test";

const PlaneService = require("../src/services/planeApi");
const { MAX_FILE_SIZE } = require("../src/services/planeApi");

test("MAX_FILE_SIZE is exported as 10MB", () => {
  assert.equal(MAX_FILE_SIZE, 10 * 1024 * 1024);
});

test("constructor requires workspaceSlug and projectId", () => {
  assert.throws(() => new PlaneService(), /required/);
  assert.throws(() => new PlaneService("w"), /required/);
  assert.throws(() => new PlaneService(null, "p"), /required/);
});

test("constructor sets workspaceSlug and projectId directly (no .config shim)", () => {
  const svc = new PlaneService("acme", "proj_123");
  assert.equal(svc.workspaceSlug, "acme");
  assert.equal(svc.projectId, "proj_123");
  assert.equal(svc.config, undefined);
});

test("_cacheValid is falsy for null", () => {
  const svc = new PlaneService("w", "p");
  assert.ok(!svc._cacheValid(null));
});

test("_cacheValid is truthy when not expired", () => {
  const svc = new PlaneService("w", "p");
  assert.ok(
    svc._cacheValid({ value: {}, expiresAt: Date.now() + 60_000 })
  );
});

test("_cacheValid is falsy when expired", () => {
  const svc = new PlaneService("w", "p");
  assert.ok(!svc._cacheValid({ value: {}, expiresAt: Date.now() - 1 }));
});

test("getFileIcon returns extension-specific icon", () => {
  const svc = new PlaneService("w", "p");
  assert.equal(svc.getFileIcon("foo.pdf"), "📄");
  assert.equal(svc.getFileIcon("foo.png"), "🖼️");
});

test("getFileIcon falls back to generic icon for unknown extension", () => {
  const svc = new PlaneService("w", "p");
  assert.equal(svc.getFileIcon("foo.xyz"), "📎");
});

test("getContentType returns mime type or octet-stream fallback", () => {
  const svc = new PlaneService("w", "p");
  assert.equal(svc.getContentType("foo.json"), "application/json");
  assert.equal(svc.getContentType("foo.xyz"), "application/octet-stream");
});

test("validateFileSize throws when over MAX_FILE_SIZE", () => {
  const svc = new PlaneService("w", "p");
  assert.throws(() => svc.validateFileSize(MAX_FILE_SIZE + 1), /exceeds/);
  assert.equal(svc.validateFileSize(MAX_FILE_SIZE), true);
  assert.equal(svc.validateFileSize(0), true);
});

test("formatFileSize formats bytes correctly", () => {
  const svc = new PlaneService("w", "p");
  assert.equal(svc.formatFileSize(0), "0.0 B");
  assert.equal(svc.formatFileSize(1024), "1.0 KB");
  assert.equal(svc.formatFileSize(1024 * 1024), "1.0 MB");
  assert.equal(svc.formatFileSize(1.5 * 1024 * 1024), "1.5 MB");
});
