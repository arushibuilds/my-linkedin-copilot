import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// One SQLite file holds the whole workspace. JSON-ish fields are stored as TEXT.
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "copilot.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  posted_on TEXT,
  topic TEXT,
  reactions INTEGER,
  comments INTEGER,
  reposts INTEGER,
  feedback TEXT,            -- 'exact' | 'like' | 'not' | NULL
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  notes TEXT,
  hook TEXT,
  links TEXT,               -- JSON string[]
  tags TEXT,                -- JSON string[]
  priority TEXT NOT NULL DEFAULT 'medium',
  scheduled_for TEXT,
  ai TEXT,                  -- JSON IdeaExpansion
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  ai_body TEXT,             -- what the AI originally produced, used to learn from edits
  idea_id TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'drafting',
  scheduled_for TEXT,
  posted_at TEXT,
  sources TEXT,             -- JSON SourceRef[]
  review TEXT,              -- JSON PostReview
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __copilotDb: DatabaseSync | undefined;
}

export function db(): DatabaseSync {
  if (!global.__copilotDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const conn = new DatabaseSync(DB_PATH);
    conn.exec("PRAGMA journal_mode = WAL;");
    conn.exec(SCHEMA);
    global.__copilotDb = conn;
  }
  return global.__copilotDb;
}

export const newId = () => randomUUID();
export const now = () => new Date().toISOString();

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getKv<T>(key: string, fallback: T): T {
  const row = db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? parseJson(row.value, fallback) : fallback;
}

export function setKv(key: string, value: unknown) {
  db()
    .prepare(
      "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .run(key, JSON.stringify(value), now());
}
