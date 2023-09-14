/// <reference lib="dom" />

import * as React from "react";
import * as ReactDOM from "react-dom/client";
// @ts-expect-error
import * as ReactServerDOM from "react-server-dom-webpack/client.browser";

import { type ServerCallType } from "../router.ts";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var __RSC_STREAM__: ReadableStream<Uint8Array>;
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_chunk_load__: (chunkId: string) => Promise<unknown>;
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_require__: (chunkId: string) => unknown;
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_cache__: Record<string, unknown>;
	// biome-ignore lint/style/noVar: <explanation>
	var callServer: (id: string, args: unknown[]) => Promise<void>;
}

window.__webpack_chunk_load__ = async (chunkId) => {
	const toLoad = import(`/dist/browser${chunkId}`);
	window.__webpack_cache__ = window.__webpack_cache__ || {};
	window.__webpack_cache__[chunkId] = toLoad;

	const res = await toLoad;
	window.__webpack_cache__[chunkId] = res;
	return res;
};
window.__webpack_require__ = (chunkId) => {
	return window.__webpack_cache__[chunkId];
};

let root: ReactDOM.Root;
window.callServer = async function callServer(
	id: string,
	args: unknown[],
	serverCallType: ServerCallType = "document",
) {
	if (!root) {
		throw new Error("Can't invoke server actions before hydrating");
	}
	const body = await ReactServerDOM.encodeReply(args);
	let callType: ServerCallType = "document";
	switch (serverCallType) {
		case "action":
			callType = serverCallType;
			break;
	}

	const headers: Record<string, string> = {
		Accept: "text/x-component",
	};

	switch (callType) {
		case "action":
			headers["RSC-Action"] = id;
			break;
		default:
			headers.RSC = "1";
			break;
	}

	if (!body || !(body instanceof FormData)) {
		headers["Content-Type"] = "application/json";
	}

	const url = new URL(window.location.pathname, window.location.origin);
	console.log({
		url: url.href,
		body,
		method: "POST",
		headers,
		mode: "same-origin",
	});
	return ReactServerDOM.createFromFetch(
		fetch(url.pathname + url.search, {
			body,
			method: "POST",
			headers,
			mode: "same-origin",
		}),
		{
			callServer,
		},
	);

	// const response = await fetch(url.pathname + url.search, {
	// 	body,
	// 	method: "POST",
	// 	headers,
	// 	mode: "same-origin",
	// });
	// if (!response.body) throw new Error("No response body");

	// const [bodyA, bodyB] = response.body.tee();
	// const rscResponse = ReactServerDOM.createFromReadableStream(bodyA, {
	// 	callServer: window.callServer,
	// });

	// const reader = bodyB.getReader();
	// while (true) {
	// 	const { done } = await reader.read();
	// 	if (done) break;
	// }

	// return rscResponse;
	// React.startTransition(() => {
	// 	root.render(rscResponse);
	// });
};

const element = ReactServerDOM.createFromReadableStream(__RSC_STREAM__, {
	callServer: window.callServer,
});

React.startTransition(() => {
	root = ReactDOM.hydrateRoot(document, element);
});
