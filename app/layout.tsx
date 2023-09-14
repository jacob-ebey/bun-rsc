import { type ReactNode } from "react";

export default function Document({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<title>Bun RSC</title>
			</head>
			<body>
				<ul>
					<li>
						<a href="/">Home</a>
					</li>
					<li>
						<a href="/rofl">ROFL</a>
					</li>
				</ul>
				{children}
			</body>
		</html>
	);
}
