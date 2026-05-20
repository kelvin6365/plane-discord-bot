const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const JSONStorage = require("../src/storage/JSONStorage");

async function tmpStorage() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "plane-bot-test-"));
  const storage = new JSONStorage(path.join(dir, "channels.json"));
  await storage.initialize();
  return { storage, dir };
}

test("set/get roundtrip", async () => {
  const { storage } = await tmpStorage();
  await storage.set("g:c", { workspaceSlug: "w", projectId: "p" });
  assert.deepEqual(await storage.get("g:c"), {
    workspaceSlug: "w",
    projectId: "p",
  });
});

test("get returns null for missing key", async () => {
  const { storage } = await tmpStorage();
  assert.equal(await storage.get("missing"), null);
});

test("delete returns true if key existed, false otherwise", async () => {
  const { storage } = await tmpStorage();
  await storage.set("k", { a: 1 });
  assert.equal(await storage.delete("k"), true);
  assert.equal(await storage.delete("k"), false);
});

test("list filters by prefix", async () => {
  const { storage } = await tmpStorage();
  await storage.set("g1:c1", { v: 1 });
  await storage.set("g1:c2", { v: 2 });
  await storage.set("g2:c1", { v: 3 });
  const result = await storage.list("g1:");
  assert.equal(result.length, 2);
  assert(result.every((e) => e.key.startsWith("g1:")));
});

test("write queue survives a failing write", async () => {
  const { storage, dir } = await tmpStorage();

  // First successful write
  await storage.set("a", { v: 1 });

  // Force the next write to fail by chmod'ing the file read-only
  await fs.chmod(storage.filePath, 0o444);

  // This write should reject, but must not poison the queue
  await assert.rejects(storage.set("b", { v: 2 }));

  // Restore write permission
  await fs.chmod(storage.filePath, 0o644);

  // Subsequent writes should succeed despite the prior failure
  await storage.set("c", { v: 3 });
  assert.deepEqual(await storage.get("c"), { v: 3 });

  // Cleanup
  await fs.rm(dir, { recursive: true, force: true });
});

test("data persists across instances", async () => {
  const { storage, dir } = await tmpStorage();
  await storage.set("persist", { hello: "world" });

  const reopened = new JSONStorage(storage.filePath);
  await reopened.initialize();
  assert.deepEqual(await reopened.get("persist"), { hello: "world" });

  await fs.rm(dir, { recursive: true, force: true });
});
