import { Database } from "bun:sqlite";

const db = new Database("sqlite.db", { create: true });
db.exec("PRAGMA foreign_keys = ON;");

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("[db.ts] Schema initialized.");
}

// Garantizar la columna password — ALTER TABLE funciona en Bun SQLite y es idempotente.
try {
  const tableInfo = db.query("PRAGMA table_info('users')").all() as Array<{name: string}>;
  if (!tableInfo.some((c) => c.name === "password")) {
    db.exec("ALTER TABLE users ADD COLUMN password TEXT DEFAULT NULL");
    console.log("[db.ts] Columna `password` agregada a la tabla users.");
  } else {
    console.log("[db.ts] Ya existe la columna password.");
  }
} catch (e) {
  console.warn("[db.ts] No se pudo verificar/addir columna password:", e instanceof Error ? e.message : e);
}

export default db;
