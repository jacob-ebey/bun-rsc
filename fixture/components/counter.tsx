/// <reference lib="dom" />

"use client";

import * as React from "react";

import { PendingLabel } from "./form.tsx";

export function Counter({
	count,
	incrementOrDecrement,
}: {
	count: number;
	incrementOrDecrement: (formData: FormData) => Promise<void>;
}) {
	const [optimisticCount, updateOptimisticCount] =
		React.experimental_useOptimistic<
			number,
			"decrement" | "increment" | string | null | undefined
		>(count, (previousCount, action) => {
			switch (action) {
				case "decrement":
					return previousCount - 1;
				case "increment":
					return previousCount + 1;
				default:
					return previousCount;
			}
		});

	return (
		<form
			action={async (formData) => {
				const intent = formData.has("decrement") ? "decrement" : "increment";
				updateOptimisticCount(intent);
				await incrementOrDecrement(formData);
			}}
		>
			<p>
				Count: {optimisticCount}{" "}
				<button type="submit" name="decrement">
					-
				</button>
				<button type="submit" name="increment">
					+
				</button>
			</p>

			<p>
				<PendingLabel pending="Syncing with server...">Idle</PendingLabel>
			</p>
		</form>
	);
}
