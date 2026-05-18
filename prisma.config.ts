import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use Turso URL if available, fallback to local SQLite
    url: process.env["TURSO_DATABASE_URL"]
      ? `${process.env["TURSO_DATABASE_URL"]}?authToken=${process.env["TURSO_AUTH_TOKEN"]}`
      : process.env["DATABASE_URL"] || "file:./dev.db",
  },
});
