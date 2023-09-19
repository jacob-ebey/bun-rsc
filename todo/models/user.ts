import bcrypt from "bcryptjs";

import { type DBUser, getDb } from "./db.ts";
import type { User } from "./types.ts";

export const login = async (
	username: string,
	password: string,
): Promise<User | null> => {
	const db = getDb();

	const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
	const user = stmt.get(username) as DBUser | undefined;

	if (!user) {
		return null;
	}

	if (!(await bcrypt.compare(password, user.password))) {
		return null;
	}

	return {
		id: user.id,
		username: user.username,
	};
};

export const register = async (
	username: string,
	password: string,
): Promise<User> => {
	const db = getDb();

	const hashedPassword = await bcrypt.hash(password, 10);

	const stmt = db.prepare(
		"INSERT INTO users (username, password) VALUES (?, ?)",
	);
	const info = stmt.run(username, hashedPassword);
	const newUserId = info.lastInsertRowid;
	if (typeof newUserId !== "number") {
		throw new Error("User failed to insert into database.");
	}

	return {
		id: newUserId,
		username,
	};
};
