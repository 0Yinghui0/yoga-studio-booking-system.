// models/_db.js
import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolve relative to this file so seeding and server hit the SAME files
const dbDir = path.join(__dirname, "../db");

export const usersDb = Datastore.create({
  filename: path.join(dbDir, "users.db"),
  autoload: true,
});
export const coursesDb = Datastore.create({
  filename: path.join(dbDir, "courses.db"),
  autoload: true,
});
export const sessionsDb = Datastore.create({
  filename: path.join(dbDir, "sessions.db"),
  autoload: true,
});
export const bookingsDb = Datastore.create({
  filename: path.join(dbDir, "bookings.db"),
  autoload: true,
});

// Initialise the database directory and indexes
export async function initDb() {
  await fs.mkdir(dbDir, { recursive: true });
  // Create indexes used for common lookups and uniqueness checks
  await usersDb.ensureIndex({ fieldName: "email", unique: true });
  await sessionsDb.ensureIndex({ fieldName: "courseId" });
}
