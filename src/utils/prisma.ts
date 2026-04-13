// Prisma 7 generates client.ts with @ts-nocheck. Import the runtime value directly.
const { PrismaClient } = require("../generated/prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export default prisma;
