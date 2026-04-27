import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    adapter: async () => {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const pg = await import("pg");
      const pool = new pg.default.Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPg(pool);
    },
  },
});
