import { type ReactNode } from "react";

import { getURL } from "framework";

import { DebugInfo } from "./debug-info.tsx";
import { ClientCounter } from "../components/counter.tsx";

export default function Document({ children }: { children: ReactNode }) {
	const url = getURL();

	return (
		<html lang="en">
			<head>
				<title>Bun RSC</title>
				<link rel="stylesheet" href="/static/styles/global.css" />
			</head>
			<body>
				<header>
					<nav>
						<h1>Framework</h1>
						<a href="/">Home</a> / <a href="/about">About</a> /{" "}
						<a href="/todo">TODO</a>
					</nav>
				</header>
				{process.env.DEBUG ? <DebugInfo url={url.href} /> : null}
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
