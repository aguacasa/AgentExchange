// Abstract notification sink for waitlist signups.
//
// The service calls notifyWaitlistSignup() after persisting a signup. The
// default ConsoleNotifier logs to stdout — enough for local dev. Once you
// have a provider key, set WAITLIST_PROVIDER=resend and RESEND_API_KEY in the
// environment, and signups will be emailed via Resend to WAITLIST_NOTIFY_TO.
//
// To add a new provider, implement WaitlistNotifier and branch in
// resolveNotifier() below.

export interface WaitlistSignupPayload {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: "BUYER" | "SELLER" | "BOTH";
  useCase: string;
  createdAt: Date;
}

export interface WaitlistNotifier {
  name: string;
  notify(signup: WaitlistSignupPayload): Promise<void>;
}

// ─── Console (default / dev) ─────────────────────────────────────────────────

export class ConsoleNotifier implements WaitlistNotifier {
  name = "console";

  async notify(signup: WaitlistSignupPayload): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    // eslint-disable-next-line no-console
    console.log("[waitlist] new signup", {
      email: signup.email,
      name: signup.name,
      company: signup.company,
      role: signup.role,
      useCase: signup.useCase.slice(0, 200),
    });
  }
}

// ─── Resend (production) ─────────────────────────────────────────────────────

export class ResendNotifier implements WaitlistNotifier {
  name = "resend";
  constructor(
    private apiKey: string,
    private to: string,
    private from: string
  ) {}

  async notify(signup: WaitlistSignupPayload): Promise<void> {
    const subject = `Callboard waitlist: ${signup.name}${signup.company ? ` (${signup.company})` : ""}`;
    const text = [
      `Name: ${signup.name}`,
      `Email: ${signup.email}`,
      signup.company ? `Company: ${signup.company}` : null,
      `Role: ${signup.role}`,
      "",
      "Use case:",
      signup.useCase,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [this.to],
        subject,
        text,
        reply_to: signup.email,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend returned ${res.status}: ${await res.text()}`);
    }
  }
}

// ─── Resolver ────────────────────────────────────────────────────────────────

function resolveNotifier(): WaitlistNotifier {
  const provider = process.env.WAITLIST_PROVIDER?.toLowerCase();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.WAITLIST_NOTIFY_TO;
    const from = process.env.WAITLIST_NOTIFY_FROM;
    if (!apiKey || !to || !from) {
      // eslint-disable-next-line no-console
      console.warn(
        "[waitlist] WAITLIST_PROVIDER=resend but RESEND_API_KEY / WAITLIST_NOTIFY_TO / WAITLIST_NOTIFY_FROM is missing — falling back to console notifier"
      );
      return new ConsoleNotifier();
    }
    return new ResendNotifier(apiKey, to, from);
  }

  return new ConsoleNotifier();
}

let cached: WaitlistNotifier | null = null;

export function getWaitlistNotifier(): WaitlistNotifier {
  if (!cached) cached = resolveNotifier();
  return cached;
}

// Test hook to reset the cached notifier if env changes.
export function __resetNotifierForTests(): void {
  cached = null;
}

export async function notifyWaitlistSignup(signup: WaitlistSignupPayload): Promise<void> {
  return getWaitlistNotifier().notify(signup);
}
