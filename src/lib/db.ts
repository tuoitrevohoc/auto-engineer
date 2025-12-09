import Database from 'better-sqlite3';
import path from 'path';

// Initialize DB
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    data TEXT NOT NULL, -- JSON of nodes, edges
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workingDirectory TEXT NOT NULL,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    workflowId TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON of steps, variables
    startTime INTEGER,
    endTime INTEGER,
    description TEXT,
    FOREIGN KEY(workflowId) REFERENCES workflows(id),
    FOREIGN KEY(workspaceId) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export default db;
