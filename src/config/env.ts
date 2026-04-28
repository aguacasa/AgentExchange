// Production env-var gate. Called at server + worker startup.
//
// Runs only when NODE_ENV === "production". Local dev and the test suite
// are unaffected — they can keep using the permissive defaults in .env.example.

const DEFAULT_SALT = "change-me-in-production";

export function validateProdEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const errors: string[] = [];

  if (!process.env.API_KEY_SALT || process.env.API_KEY_SALT === DEFAULT_SALT) {
    errors.push(
      "API_KEY_SALT is missing or still the .env.example default. " +
        "Generate one with: openssl rand -hex 32"
    );
  }

  if (!process.env.CORS_ORIGINS) {
    errors.push(
      "CORS_ORIGINS must be set to a comma-separated list of allowed origins " +
        "(e.g. https://getcallboard.com)."
    );
  }

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is missing.");
  }

  if (!process.env.WEB_URL) {
    errors.push(
      "WEB_URL must be set in production (e.g. https://getcallboard.com). " +
        "Used to build magic-link callback URLs."
    );
  }

  if (errors.length > 0) {
    console.error("\n✗ Production environment is misconfigured. Refusing to start:\n");
    for (const e of errors) console.error(`  • ${e}`);
    console.error("");
    process.exit(1);
  }
}
