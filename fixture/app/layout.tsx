import { type ReactNode } from "react";

export default function Document({ children }: { children: ReactNode }) {
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
