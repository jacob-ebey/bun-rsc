import * as React from "react";

import { getFormAction, throwRedirect } from "framework";

import { login, logout } from "./actions.tsx";
import { getUser } from "./request.ts";

async function AvailableUsers() {
	const { users } = await fetch("https://dummyjson.com/users").then(
		(
			response,
		): Promise<{
			users: { id: number; username: string; password: string }[];
		}> => response.json(),
	);

	return (
		<ul>
			{users.map((user) => (
				<li key={user.id}>
					{user.username} - {user.password}
				</li>
			))}
		</ul>
	);
}

export default async function TODO() {
	// await new Promise((resolve) => setTimeout(resolve, 500));
	const [user, loginAction] = await Promise.all([
		getUser(),
		getFormAction(login),
	]);

	return (
		<main>
			<h1>Login</h1>
			{user ? (
				<>
					<p>Logged in as {user.username}</p>
					<form action={logout}>
						<button type="submit">Logout</button>
					</form>
				</>
			) : (
				<form action={login}>
					<label htmlFor="username">
						Username
						<br />
						<input type="text" name="username" id="username" />
					</label>

					<br />

					<label htmlFor="password">
						Password
						<br />
						<input type="password" name="password" id="password" />
					</label>

					<br />
					<button type="submit">Login</button>
					{loginAction.result}

					<hr />
					<p>Available Accounts</p>
					<React.Suspense fallback={<p>Loading accounts...</p>}>
						<AvailableUsers />
					</React.Suspense>
				</form>
			)}
		</main>
	);
}
