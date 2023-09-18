import * as React from "react";
import CryptoJS from "crypto-js";
import { parse } from "cookie";

import { crypto, getHeaders } from "framework";

import { getSecret } from "./utils.ts";

export interface User {
	id: number;
	username: string;
	token: string;
}

export const getUser = React.cache(
	async (inputHeaders?: Headers): Promise<User | null> => {
		// TODO: remove development secret
		const sessionSecret = getSecret("SESSION_SECRET", "session_secret");
		const headers = inputHeaders || getHeaders();
		const cookie = headers.get("Cookie");
		const cookies = cookie ? parse(cookie) : null;
		if (!cookies?.user) return null;

		const unsigned = await crypto.unsign(cookies.user, sessionSecret);
		if (!unsigned) return null;

		const user = JSON.parse(unsigned) as User;
		if (
			typeof user.id !== "number" ||
			typeof user.username !== "string" ||
			typeof user?.token !== "string"
		)
			return null;

		const decryptedToken = CryptoJS.AES.decrypt(
			user.token,
			sessionSecret,
		).toString(CryptoJS.enc.Utf8);

		return {
			id: user.id,
			username: user.username,
			token: decryptedToken,
		};
	},
);
