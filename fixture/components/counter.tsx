"use client";

import * as React from "react";

import { log } from "../actions/log.tsx";
import { sayHello } from "../actions/say-hello.tsx";
import { PendingLabel } from "./form.tsx";

export function Counter() {
	const abortControllerRef = React.useRef<AbortController>();
	const [logged, setLogged] = React.useState<Element>(false);
	const [count, setCount] = React.useState(0);
	const [pendingCount, setPendingCount] = React.experimental_useOptimistic<
		number,
		number
	>(count, (_, newCount) => newCount);

	return (
		<form
			action={async () => {
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}
				const abortController = new AbortController();
				abortControllerRef.current = abortController;
				const signal = abortController.signal;

				const pending = pendingCount + 1;
				setLogged(false);
				setPendingCount(pending);
				setCount((current) => {
					const newCount = current + 1;
					return newCount;
				});
				const formData = new FormData();
				formData.set("name", `manual server action ${String(pending)}`);
				const logged = await sayHello(formData);
				if (!signal.aborted) {
					setLogged(logged);
				}
			}}
		>
			<p>Count: {pendingCount}</p>
			<button type="submit">Increment</button>

			<p>
				<PendingLabel pending="Syncing with server...">Idle</PendingLabel>
			</p>
			{logged ? logged : <p>Not logged</p>}
		</form>
	);
}
