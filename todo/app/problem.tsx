"use client";

import { ProblemProps } from "framework/client";

export default function NotFound({ error, resetErrorBoundary }: ProblemProps) {
	return (
		<main className="flex flex-col justify-center items-center h-full w-full bg-gray-100">
			<h1 className="text-6xl font-bold text-gray-900 mb-4">Oops</h1>
			<p className="text-xl text-gray-700">Something went wrong 😅</p>
			<p className="mt-4">
				<button
					type="button"
					className="block text-center bg-blue-500 text-white rounded-lg px-4 py-2 w-full"
					onClick={resetErrorBoundary}
				>
					Reload the page
				</button>
			</p>
		</main>
	);
}
