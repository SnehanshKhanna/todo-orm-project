import { createClient } from "@snehanshkhanna/lite-orm";
import { Todo } from "./models";
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(__dirname, "../../../../.env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
    });
  }
} catch (e) {}

export const db = createClient({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres",
  models: { todo: Todo },
});
