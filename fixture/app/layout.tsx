import { type ReactNode } from "react";

import { DebugInfo } from "./debug-info.tsx";

export default async function Document({ children }: { children: ReactNode }) {
	await new Promise((resolve) => setTimeout(resolve, 200));
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
				<DebugInfo />
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
