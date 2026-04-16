// Prisma 7 with client engine requires a driver adapter.
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const { PrismaClient } = require("../generated/prisma/client");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export default prisma;
