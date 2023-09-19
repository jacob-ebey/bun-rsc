"use client";

import { ProblemProps } from "framework/client";

export default function Problem({ error, resetErrorBoundary }: ProblemProps) {
	let displayMessage: string | undefined;
	let displayStack: string | undefined;
	if (error && error instanceof Error) {
		displayMessage = error.message;
		displayStack = error.stack;
	} else if (typeof error === "object") {
		displayStack = JSON.stringify(error, null, 2);
	} else {
		displayStack = String(error);
	}

	return (
		<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg w-full max-w-md my-4">
			<strong className="font-semibold">Unknown Error:</strong>
			{displayMessage && <p className="text-sm mt-1">{displayMessage}</p>}
			{displayStack && (
				<pre className="text-xs bg-gray-200 p-2 rounded mt-2 overflow-x-scroll">
					{displayStack}
				</pre>
			)}
		</div>
	);
}
