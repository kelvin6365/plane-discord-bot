const { test } = require("node:test");
const assert = require("node:assert/strict");

const { escapeHtml } = require("../src/utils/utils");

test("escapeHtml escapes script tags", () => {
  assert.equal(
    escapeHtml("</p><script>alert(1)</script>"),
    "&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;"
  );
});

test("escapeHtml escapes ampersands first to avoid double-encoding", () => {
  assert.equal(escapeHtml("a & b < c"), "a &amp; b &lt; c");
});

test("escapeHtml escapes quotes", () => {
  assert.equal(escapeHtml(`he said "hi" 'there'`), "he said &quot;hi&quot; &#39;there&#39;");
});

test("escapeHtml returns empty string for null/undefined", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("escapeHtml coerces non-strings", () => {
  assert.equal(escapeHtml(42), "42");
  assert.equal(escapeHtml(true), "true");
});

test("escapeHtml leaves plain text alone", () => {
  assert.equal(escapeHtml("hello world"), "hello world");
});
