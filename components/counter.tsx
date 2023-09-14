"use client";

import { useState } from "react";

import { log } from "../actions/log.tsx";

export function Counter() {
	const [count, setCount] = useState(0);
	return (
		<div>
			<p>Count: {count}</p>
			<button
				type="button"
				onClick={() => {
					setCount(count + 1);
					log("client incremented count").then(console.log);
				}}
			>
				Increment
			</button>
		</div>
	);
}
