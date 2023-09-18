"use server";

import CryptoJS from "crypto-js";
import { serialize } from "cookie";

import { type ThisAction, crypto, throwRedirect } from "framework";

import { cookiePath, loginPathname, loginSuccessRedirect } from "./config.ts";
import { type User, getUser } from "./request.ts";
import { getSecret } from "./utils.ts";

interface UserData {
	id: number;
	username: string;
	token: string;
}

interface APIError {
	message: string;
}

export function logout(this: ThisAction) {
	const cookie = serialize("user", "", {
		httpOnly: true,
		path: cookiePath,
		sameSite: "lax",
		secure: this.url.protocol === "https:",
		expires: new Date(0),
		maxAge: 0,
	});

	throwRedirect(this.url.href, {
		headers: {
			"Set-Cookie": cookie,
		},
	});
}

export async function login(this: ThisAction, formData: FormData) {
	const username = formData.get("username");
	const password = formData.get("password");
	// TODO: remove development secret
	const sessionSecret = getSecret("SESSION_SECRET", "session_secret");

	const userData = await fetch("https://dummyjson.com/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username,
			password,
		}),
	}).then((response): Promise<APIError | UserData> => response.json());

	if ("message" in userData) {
		return <p style={{ color: "red" }}>{userData.message}</p>;
	}

	const user: User = {
		id: userData.id,
		username: userData.username,
		token: CryptoJS.AES.encrypt(userData.token, sessionSecret).toString(),
	};

	const userJSON = JSON.stringify(user);
	const signedUser = await crypto.sign(userJSON, sessionSecret);

	const cookie = serialize("user", signedUser, {
		httpOnly: true,
		path: cookiePath,
		sameSite: "lax",
		secure: this.url.protocol === "https:",
	});

	throwRedirect(loginSuccessRedirect, {
		headers: {
			"Set-Cookie": cookie,
		},
	});
}

export async function updateTodo(this: ThisAction, formData: FormData) {
	const user = await getUser(this.headers);
	const userToken = user?.token;
	if (!userToken) {
		return throwRedirect(loginPathname);
	}

	const data = {
		id: Number.parseInt(String(formData.get("id"))),
		todo: String(formData.get("todo")),
		completed: Boolean(formData.get("completed")),
	};

	if (!Number.isSafeInteger(data.id)) {
		return <p style={{ color: "red" }}>Invalid ID</p>;
	}

	const response = await fetch("https://dummyjson.com/todos/1", {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${userToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	}).then((response) => response.json());

	if ("message" in response) {
		return <p style={{ color: "red" }}>{response.message}</p>;
	}
}
