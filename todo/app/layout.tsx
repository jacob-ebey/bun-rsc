import * as React from "react";

import { logout } from "./actions.tsx";
import { getUser } from "./utils.ts";

export default async function Document({
	children,
}: { children: React.ReactNode }) {
	const user = await getUser();

	return (
		<html lang="en" className="bg-blue-500 z-30">
			<head>
				<meta charSet="utf-8" />
				<link rel="stylesheet" href="/dist/browser/tailwind.css" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />

				<title>Bun RSC</title>
			</head>
			<body className="flex flex-col relative bg-gray-100 h-screen w-screen">
				<header className="lg:sticky top-0">
					<nav className="flex bg-blue-500 p-4 text-white gap-4">
						<h1 className="text-2xl font-semibold">TODOs</h1>
						<div className="container mx-auto flex justify-end items-center gap-4">
							<a href="/" className="text-white hover:underline">
								Home
							</a>
							{!!user && (
								<form action={logout}>
									<button type="submit" className="text-white hover:underline">
										Logout
									</button>
								</form>
							)}
						</div>
					</nav>
				</header>
				{children}
			</body>
		</html>
	);
}
