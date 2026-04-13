import { describe, it, expect } from "vitest";
import { hashApiKey, generateApiKey } from "../../src/utils/hash";

describe("hashApiKey", () => {
  it("produces consistent hashes for the same input", () => {
    const hash1 = hashApiKey("test-key");
    const hash2 = hashApiKey("test-key");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = hashApiKey("key-a");
    const hash2 = hashApiKey("key-b");
    expect(hash1).not.toBe(hash2);
  });

  it("returns a hex string", () => {
    const hash = hashApiKey("test");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("generateApiKey", () => {
  it("returns a key starting with cb_", () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^cb_/);
  });

  it("returns a prefix of length 11", () => {
    const { prefix } = generateApiKey();
    expect(prefix).toHaveLength(11);
    expect(prefix).toMatch(/^cb_/);
  });

  it("returns a hash that matches hashApiKey(key)", () => {
    const { key, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(key));
  });

  it("produces unique keys across multiple calls", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey().key);
    }
    expect(keys.size).toBe(100);
  });

  it("key is long enough for security (64+ hex chars after prefix)", () => {
    const { key } = generateApiKey();
    // cb_ + 64 hex chars = 67 total
    expect(key.length).toBe(67);
  });
});
