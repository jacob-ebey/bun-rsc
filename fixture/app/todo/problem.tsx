"use client";

import { type ProblemProps } from "framework/client";

export default function TODOProblem({
	error,
	resetErrorBoundary,
}: ProblemProps) {
	console.error(error);
	return (
		<main>
			<h1>Oops</h1>
			<button type="button" onClick={resetErrorBoundary}>
				Reset
			</button>
		</main>
	);
}
