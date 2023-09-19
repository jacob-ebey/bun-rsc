import * as fs from "node:fs";

import Database, { Database as DB } from "better-sqlite3";

let globalDB: DB | undefined = undefined;
export function getDb() {
	if (globalDB) {
		return globalDB;
	}

	fs.mkdirSync(".data", { recursive: true });

	const t = global.__webpack_require__;
	// @ts-ignore TODO: Only install this once in the SSR
	// entry after first request comes through
	global.__webpack_require__ = undefined;
	const db = new Database(".data/todos.db");
	global.__webpack_require__ = t;
	globalDB = db;

	// Create tables if they don't exist
	db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      password TEXT
    );
  `);

	db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      task TEXT,
      completed INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

	return db;
}

// Interfaces
export interface DBUser {
	id: number;
	username: string;
	password: string;
}

export interface DBTodo {
	id: number;
	userId: number;
	task: string;
	completed: boolean;
}
