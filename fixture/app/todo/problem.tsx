"use client";

import type { FallbackProps } from "react-error-boundary";

export default function TODOProblem({ error }: FallbackProps) {
	console.log(error);
	return (
		<main>
			<h1>Oops</h1>
		</main>
	);
}
