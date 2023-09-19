import * as React from "react";
import { parse } from "cookie";

import { crypto, getHeaders } from "framework";

export interface User {
	id: number;
	username: string;
}

const warnings = new Set();
function warnOnce(warning: string) {
	if (!warnings.has(warning)) {
		warnings.add(warning);
		console.warn(warning);
	}
}
export function getSecret(secret: string, developmentSecret?: string): string {
	const result = process.env[secret];
	if (!result && developmentSecret) {
		warnOnce(`Using development secret: ${secret}`);
		return developmentSecret;
	}
	if (!result) {
		throw new Error(`Missing secret: ${secret}`);
	}
	return result;
}

export const getUser = React.cache(
	async (inputHeaders?: Headers): Promise<User | null> => {
		// TODO: remove development secret
		const sessionSecret = getSecret("SESSION_SECRET", "session_secret");
		const headers = inputHeaders ? inputHeaders : getHeaders();
		const cookie = headers.get("Cookie");
		const cookies = cookie ? parse(cookie) : null;
		if (!cookies?.user) return null;

		const unsigned = await crypto.unsign(cookies.user, sessionSecret);
		if (!unsigned) return null;

		const user = JSON.parse(unsigned) as User;
		if (typeof user.id !== "number" || typeof user.username !== "string")
			return null;

		return {
			id: user.id,
			username: user.username,
		};
	},
);
