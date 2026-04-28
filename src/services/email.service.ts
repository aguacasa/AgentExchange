/**
 * Email sender stub. In dev/test we log to stdout — operators copy the link
 * out of the backend log to complete the flow without a real mail provider.
 * Production wiring (Resend / SES) is a follow-up to VIS-79.
 */

export interface MagicLinkEmail {
  to: string;
  callbackUrl: string;
  expiresAt: Date;
}

export async function sendMagicLinkEmail(payload: MagicLinkEmail): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.EMAIL_PROVIDER) {
    // Surface loudly rather than silently dropping the link in prod.
    console.error(
      "[email] EMAIL_PROVIDER is not configured — magic link cannot be delivered to",
      payload.to
    );
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    console.log("─".repeat(60));
    console.log("📨  Magic-link email (dev stub — no real email sent)");
    console.log(`    to:           ${payload.to}`);
    console.log(`    callback_url: ${payload.callbackUrl}`);
    console.log(`    expires_at:   ${payload.expiresAt.toISOString()}`);
    console.log("─".repeat(60));
  }
}
