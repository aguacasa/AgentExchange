import crypto from "crypto";

const SALT = process.env.API_KEY_SALT;
if (!SALT) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: API_KEY_SALT environment variable must be set in production");
  }
  console.warn("[SECURITY] API_KEY_SALT not set — using insecure default for development only");
}
const EFFECTIVE_SALT = SALT || "callboard-dev-salt";

export function hashApiKey(key: string): string {
  return crypto.createHmac("sha256", EFFECTIVE_SALT).update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `cb_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 11); // "cb_" + first 8 hex chars
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}
