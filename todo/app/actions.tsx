"use server";

import { serialize } from "cookie";
import * as v from "valibot";

import { type ThisAction, crypto, throwRedirect } from "framework";

import * as models from "../models/mod.ts";
import { FormErrors } from "./components.tsx";
import { cookiePath, loginSuccessRedirect } from "./config.ts";
import { type User, getSecret } from "./utils.ts";

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

// const loginSchema = zfd.formData({
// 	username: zfd.text(z.string()),
// 	password: zfd.text(z.string()),
// });
const loginSchema = v.object({
	username: v.string([v.minLength(1)]),
	password: v.string([v.minLength(8)]),
});

export async function login(this: ThisAction, formData: FormData) {
	// TODO: remove development secret
	const sessionSecret = getSecret("SESSION_SECRET", "session_secret");

	const parsed = v.safeParse(
		loginSchema,
		Object.fromEntries(formData.entries()),
	);

	if (!parsed.success) {
		console.log(parsed.issues);
		return <p className="mb-4 text-red-500">Invalid request</p>;
	}

	const { username, password } = parsed.output;

	const userData = await models.user.login(username, password);
	if (!userData) {
		// TODO: Set status code
		return <FormErrors errors={["Invalid username or password"]} />;
	}

	const user: User = {
		id: userData.id,
		username: userData.username,
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

const signupSchema = v.object(
	{
		username: v.string([v.minLength(1)]),
		password: v.string([v.minLength(8)]),
		verifyPassword: v.string([v.minLength(8)]),
	},
	[
		v.custom(
			(data) => data.password === data.verifyPassword,
			"Passwords do not match",
		),
	],
);

export async function signup(this: ThisAction, formData: FormData) {
	// TODO: remove development secret
	const sessionSecret = getSecret("SESSION_SECRET", "session_secret");

	const parsed = v.safeParse(
		signupSchema,
		Object.fromEntries(formData.entries()),
	);

	if (!parsed.success) {
		// TODO: Set status code
		return v.flatten(parsed.issues);
	}

	const { username, password } = parsed.output;
	const userData = await models.user.register(username, password);

	const user: User = {
		id: userData.id,
		username: userData.username,
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
