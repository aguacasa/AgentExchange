import prisma from "../utils/prisma";
import { ConflictError, ValidationError } from "../utils/errors";
import { notifyWaitlistSignup } from "../providers/waitlist-notifier";

export type WaitlistRole = "BUYER" | "SELLER" | "BOTH";

export interface CreateWaitlistSignupInput {
  email: string;
  name: string;
  company?: string;
  role: WaitlistRole;
  useCase: string;
}

export interface WaitlistSignup {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: WaitlistRole;
  useCase: string;
  createdAt: Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function validate(input: CreateWaitlistSignupInput): void {
  if (!input.email || !EMAIL_RE.test(input.email)) {
    throw new ValidationError("A valid email is required");
  }
  if (!input.name || input.name.trim().length < 1) {
    throw new ValidationError("Name is required");
  }
  if (input.name.length > 200) {
    throw new ValidationError("Name is too long");
  }
  if (input.company && input.company.length > 200) {
    throw new ValidationError("Company is too long");
  }
  if (!input.useCase || input.useCase.trim().length < 1) {
    throw new ValidationError("Use case is required");
  }
  if (input.useCase.length > 2000) {
    throw new ValidationError("Use case is too long");
  }
  if (!["BUYER", "SELLER", "BOTH"].includes(input.role)) {
    throw new ValidationError("Role must be BUYER, SELLER, or BOTH");
  }
}

export class WaitlistService {
  async create(input: CreateWaitlistSignupInput): Promise<WaitlistSignup> {
    const email = normalizeEmail(input.email ?? "");
    validate({ ...input, email });

    const existing = await prisma.waitlistSignup.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError("This email is already on the waitlist");
    }

    const signup = await prisma.waitlistSignup.create({
      data: {
        email,
        name: input.name.trim(),
        company: input.company?.trim() || null,
        role: input.role,
        useCase: input.useCase.trim(),
      },
    });

    // Fire-and-forget notification. Failures are logged but don't block the signup.
    notifyWaitlistSignup(signup)
      .then(async () => {
        await prisma.waitlistSignup.update({
          where: { id: signup.id },
          data: { notifiedAt: new Date() },
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[waitlist] notify failed", { id: signup.id, err });
      });

    return signup;
  }
}

export const waitlistService = new WaitlistService();
