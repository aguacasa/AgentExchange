import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

import { expressAuthentication } from "../../src/middleware/tsoa-auth";

function mockRequest(headers: Record<string, string> = {}) {
  return {
    header: (name: string) => headers[name],
  } as any;
}

describe("expressAuthentication", () => {
  const validApiKey = {
    id: "key-1",
    ownerId: "owner-1",
    agentId: "agent-1",
    scopes: ["read", "write"],
    keyHash: "abc123",
    revoked: false,
    expiresAt: null,
  };

  beforeEach(() => {
    prismaMock.apiKey.findUnique.mockReset();
  });

  it("returns apiKey data for a valid key", async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(validApiKey);

    const req = mockRequest({ "X-API-Key": "cb_test_key" });
    const result = await expressAuthentication(req, "api_key");

    expect(result).toEqual(validApiKey);
    expect((req as any).apiKey).toEqual({
      id: "key-1",
      ownerId: "owner-1",
      agentId: "agent-1",
      scopes: ["read", "write"],
    });
  });

  it("throws when X-API-Key header is missing", async () => {
    const req = mockRequest({});
    await expect(expressAuthentication(req, "api_key")).rejects.toThrow("Missing X-API-Key header");
  });

  it("throws when key not found in database", async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(null);

    const req = mockRequest({ "X-API-Key": "cb_invalid" });
    await expect(expressAuthentication(req, "api_key")).rejects.toThrow("Invalid or revoked API key");
  });

  it("throws when API key is revoked", async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({ ...validApiKey, revoked: true });

    const req = mockRequest({ "X-API-Key": "cb_revoked" });
    await expect(expressAuthentication(req, "api_key")).rejects.toThrow("Invalid or revoked API key");
  });

  it("throws when API key is expired", async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({
      ...validApiKey,
      expiresAt: new Date("2020-01-01"),
    });

    const req = mockRequest({ "X-API-Key": "cb_expired" });
    await expect(expressAuthentication(req, "api_key")).rejects.toThrow("Expired API key");
  });

  it("throws for unsupported security scheme", async () => {
    const req = mockRequest({});
    await expect(expressAuthentication(req, "oauth2")).rejects.toThrow("Unsupported security");
  });
});
