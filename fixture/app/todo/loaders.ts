import * as React from "react";

import { throwRedirect } from "framework";

import type { User } from "./request.ts";

interface APIError {
	message: string;
}

const getTODOSCached = React.cache(
	async (userId: number, userToken: string) => {
		const response = await fetch(
			`https://dummyjson.com/users/${userId}/todos`,
			{
				headers: {
					Authorization: `Bearer ${userToken}`,
					"Content-Type": "application/json",
				},
			},
		).then(
			(
				res,
			): Promise<
				| APIError
				| {
						todos: {
							id: number;
							todo: string;
							completed: boolean;
						}[];
				  }
			> => res.json(),
		);

		if (response && "message" in response) throw new Error(response.message);

		if (!response?.todos) throw new Error("No todos found.");

		return response.todos;
	},
);

export async function getTODOS(
	userPromise: Promise<User | null>,
	redirect: string,
) {
	const user = await userPromise;
	if (!user?.token) {
		return throwRedirect(redirect);
	}
	return getTODOSCached(user.id, user.token);
}
