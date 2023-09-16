import { type ReactNode } from "react";

import { incrementOrDecrement } from "../actions/counter.ts";
import { Counter } from "../components/counter.tsx";
import { counter } from "../models/counter.ts";

export default async function Document({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<title>Bun RSC</title>
				<link rel="stylesheet" href="/static/styles/global.css" />
			</head>
			<body>
				<ul>
					<li>
						<a href="/">Home</a>
					</li>
					<li>
						<a href="/about">About</a>
					</li>
				</ul>
				<Counter
					count={(await counter()).count}
					incrementOrDecrement={incrementOrDecrement}
				/>
				{children}
				{Array(100)
					.fill("")
					.map((_, i) => (
						<p key={i}>{"rofl".repeat(i)}</p>
					))}
			</body>
		</html>
	);
}
