const { test } = require("node:test");
const assert = require("node:assert/strict");

// Load the module fresh per-test so we can mutate process.env safely.
function loadConfig(env) {
  delete require.cache[require.resolve("../src/config/config")];
  const original = { ...process.env };
  for (const key of ["DISCORD_TOKEN", "CLIENT_ID", "PLANE_API_KEY"]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  try {
    return require("../src/config/config");
  } finally {
    // restore
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
    }
    Object.assign(process.env, original);
  }
}

test("validateConfig passes when all required vars set", () => {
  const config = loadConfig({
    DISCORD_TOKEN: "a",
    CLIENT_ID: "b",
    PLANE_API_KEY: "c",
  });
  assert.doesNotThrow(() => config.validateConfig());
});

test("validateConfig throws when DISCORD_TOKEN missing", () => {
  const config = loadConfig({ CLIENT_ID: "b", PLANE_API_KEY: "c" });
  assert.throws(() => config.validateConfig(), /DISCORD_TOKEN/);
});

test("validateConfig throws when multiple vars missing and lists all of them", () => {
  const config = loadConfig({ DISCORD_TOKEN: "a" });
  assert.throws(
    () => config.validateConfig(),
    (err) => /CLIENT_ID/.test(err.message) && /PLANE_API_KEY/.test(err.message)
  );
});

test("validateConfig treats whitespace-only values as missing", () => {
  const config = loadConfig({
    DISCORD_TOKEN: "   ",
    CLIENT_ID: "b",
    PLANE_API_KEY: "c",
  });
  assert.throws(() => config.validateConfig(), /DISCORD_TOKEN/);
});
