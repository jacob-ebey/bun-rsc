/// <reference lib="dom" />

import * as React from "react";
import * as ReactDOM from "react-dom/client";
// @ts-expect-error
import * as ReactServerDOM from "react-server-dom-webpack/client.browser";

import { installEventListeners } from "./event-listeners.ts";
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
	var callServer: (
		id: string,
		args: unknown[],
		serverCallType?: ServerCallType,
	) => Promise<void>;
	// biome-ignore lint/style/noVar: <explanation>
	var invalidateCache: (invalidate: string) => Promise<void>;
}

const responseCache = (async () => {
	const cache = await caches.open("bun-rsc");
	for (const request of await cache.keys()) {
		await cache.delete(request);
	}
	return cache;
})();
window.invalidateCache = async function invalidateCache(invalidate: string) {
	const cache = await responseCache;
	console.log("TODO: invalidate just", invalidate);
	for (const request of await cache.keys()) {
		await cache.delete(request);
	}
};

async function cacheOrFetch(request: Request, invalidate?: string) {
	const cache = await responseCache;
	let cacheKey: Request | undefined;
	if (request.method === "GET") {
		const cached = await cache.match(request.clone());
		if (cached) return cached;
		cacheKey = request.clone();
	}

	if (invalidate) {
		await invalidateCache(invalidate);
	}
	const response = await fetch(request);

	if (cacheKey) {
		const cloned = response.clone();
		const toCache = new Response(cloned.body, {
			headers: cloned.headers,
			status: cloned.status,
			statusText: cloned.statusText,
		});
		toCache.headers.set("Cache-Control", "public, max-age=31536000");
		cache.put(cacheKey, toCache).catch(console.error);
	}

	return response;
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
	serverCallType: ServerCallType = "form",
) {
	if (!root) {
		throw new Error("Can't invoke server actions before hydrating");
	}

	let callType: ServerCallType = "form";
	switch (serverCallType) {
		case "action":
		case "navigation":
			callType = serverCallType;
			break;
	}

	switch (callType) {
		case "action":
		case "form": {
			const body = await ReactServerDOM.encodeReply(args);

			if (!body) {
				throw new Error("Failed to encode request body");
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

			if (!(body instanceof FormData)) {
				headers["Content-Type"] = "application/json";
			}

			const url = new URL(window.location.pathname, window.location.origin);
			const response = ReactServerDOM.createFromFetch(
				cacheOrFetch(
					new Request(url.pathname + url.search, {
						body,
						method: "POST",
						headers,
						mode: "same-origin",
					}),
				),
				{
					callServer,
				},
			);

			if (callType === "action") {
				return await response;
			}

			React.startTransition(() => {
				root.render(response);
			});
			break;
		}
		case "navigation": {
			const url = new URL(id);
			const [fromURL, pushState] = args as [
				string | undefined,
				boolean | undefined,
			];
			if (typeof fromURL !== "string") {
				throw new Error("Expected fromURL to be a string");
			}
			const response = ReactServerDOM.createFromFetch(
				cacheOrFetch(
					new Request(url.pathname + url.search, {
						method: "GET",
						headers: {
							Accept: "text/x-component",
							RSC: fromURL || "1",
						},
						mode: "same-origin",
					}),
				),
				{
					callServer,
				},
			);

			React.startTransition(() => {
				root.render(response);
				if (pushState) {
					history.pushState(null, "", url.pathname + url.search);
				}
			});
			// await response;
			break;
		}
	}
};

const element = ReactServerDOM.createFromReadableStream(__RSC_STREAM__, {
	callServer: window.callServer,
});

React.startTransition(() => {
	root = ReactDOM.hydrateRoot(document, element);
	installEventListeners();
});
