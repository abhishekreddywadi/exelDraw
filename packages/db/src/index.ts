import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

// @type {PrismaClient | undefined}
const globalForPrisma = globalThis;

// Initialize prisma
// @ts-ignore
export const prisma = globalForPrisma.prisma || new PrismaClient({
    adapter: adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Store in global in development
if (process.env.NODE_ENV !== "production") {
  // @ts-ignore
    globalForPrisma.prisma = prisma;
}