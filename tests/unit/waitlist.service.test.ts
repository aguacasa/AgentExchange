import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));
vi.mock("../../src/providers/waitlist-notifier", () => ({
  notifyWaitlistSignup: vi.fn().mockResolvedValue(undefined),
}));

import { WaitlistService } from "../../src/services/waitlist.service";
import { notifyWaitlistSignup } from "../../src/providers/waitlist-notifier";

describe("WaitlistService", () => {
  let service: WaitlistService;

  const validInput = {
    email: "dev@example.com",
    name: "Jane Dev",
    company: "Acme",
    role: "BUYER" as const,
    useCase: "Matching code-review agents for CI pipelines",
  };

  const fakeSignup = {
    id: "w-1",
    email: "dev@example.com",
    name: "Jane Dev",
    company: "Acme",
    role: "BUYER" as const,
    useCase: validInput.useCase,
    notifiedAt: null,
    createdAt: new Date("2026-04-16T12:00:00Z"),
  };

  beforeEach(() => {
    service = new WaitlistService();
    prismaMock.waitlistSignup.findUnique.mockResolvedValue(null);
    prismaMock.waitlistSignup.create.mockResolvedValue(fakeSignup);
    prismaMock.waitlistSignup.update.mockResolvedValue({ ...fakeSignup, notifiedAt: new Date() });
    vi.mocked(notifyWaitlistSignup).mockClear();
  });

  describe("create", () => {
    it("persists a signup with normalized email", async () => {
      const result = await service.create({ ...validInput, email: "  Dev@Example.com  " });
      expect(result.id).toBe("w-1");
      expect(prismaMock.waitlistSignup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: "dev@example.com" }),
      });
    });

    it("rejects signups with invalid email", async () => {
      await expect(service.create({ ...validInput, email: "not-an-email" })).rejects.toThrow(
        "valid email"
      );
    });

    it("rejects missing name", async () => {
      await expect(service.create({ ...validInput, name: "" })).rejects.toThrow("Name is required");
    });

    it("rejects missing use case", async () => {
      await expect(service.create({ ...validInput, useCase: "   " })).rejects.toThrow(
        "Use case is required"
      );
    });

    it("rejects an invalid role", async () => {
      await expect(
        service.create({ ...validInput, role: "HACKER" as unknown as "BUYER" })
      ).rejects.toThrow("Role must be");
    });

    it("rejects duplicate email", async () => {
      prismaMock.waitlistSignup.findUnique.mockResolvedValueOnce(fakeSignup);
      await expect(service.create(validInput)).rejects.toThrow("already on the waitlist");
      expect(prismaMock.waitlistSignup.create).not.toHaveBeenCalled();
    });

    it("fires a notification after persisting", async () => {
      await service.create(validInput);
      // Notification is fire-and-forget — flush microtasks.
      await new Promise((r) => setImmediate(r));
      expect(notifyWaitlistSignup).toHaveBeenCalledWith(fakeSignup);
    });

    it("does not fail the request if notification rejects", async () => {
      vi.mocked(notifyWaitlistSignup).mockRejectedValueOnce(new Error("resend down"));
      const result = await service.create(validInput);
      expect(result.id).toBe("w-1");
    });
  });
});
