import { type ReactNode } from "react";

import { getURL } from "framework";

import { DebugInfo } from "./debug-info.tsx";
import { ClientCounter } from "../components/counter.tsx";

export default function Document({ children }: { children: ReactNode }) {
	const url = getURL();

	// await new Promise((resolve) => setTimeout(resolve, 200));
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
					<li>
						<a href="/todo">TODO</a>
					</li>
				</ul>
				<DebugInfo url={url.href} />
				<ClientCounter />
				{children}
				<hr style={{ marginTop: "100vh" }} />
				{Array(100)
					.fill("")
					.map((_, i) => {
						const v = "rofl".repeat(i);
						return <p key={String(i) + v}>{v}</p>;
					})}
			</body>
		</html>
	);
}
