import * as React from "react";

import { getFormAction } from "framework";

import { login, logout } from "./actions.tsx";
import { href } from "./config.ts";
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
	const [user, loginAction] = await Promise.all([
		getUser(),
		getFormAction(login),
	]);

	return (
		<main>
			{user ? (
				<>
					<h1>TODOs</h1>
					<p>Logged in as {user.username}</p>
					<p>
						<a href={href("all")}>Go to TODOs</a>
					</p>
					<form action={logout}>
						<button type="submit">Logout</button>
					</form>
				</>
			) : (
				<>
					<h1>TODOs Login</h1>
					<form action={login}>
						<label>
							Username
							<br />
							<input type="text" name="username" />
						</label>

						<br />

						<label>
							Password
							<br />
							<input type="password" name="password" />
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
				</>
			)}
		</main>
	);
}
