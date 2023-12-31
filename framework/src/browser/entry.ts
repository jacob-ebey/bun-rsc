/// <reference lib="dom" />

import * as React from "react";
import * as ReactDOM from "react-dom/client";
// @ts-expect-error
import * as ReactServerDOM from "react-server-dom-webpack/client.browser";

import { installEventListeners } from "./event-listeners.ts";
import type { Location, RSCPayload, ServerCallType } from "../router.ts";

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

	interface RSCTransitionEventArgs {
		identity: unknown;
		args?: unknown[];
		from: Location;
		url?: URL;
		response?: React.Usable<RSCPayload>;
	}
	interface Window {
		addEventListener(
			type: "rsctransition",
			listener: (event: CustomEvent<RSCTransitionEventArgs>) => void,
		): void;
		removeEventListener(
			type: "rsctransition",
			listener: (
				event: CustomEvent<RSCTransitionEventArgs>,
			) => void,
		): void;
		addEventListener(
			on: "rsctransitionend",
			callback: (event: CustomEvent<RSCPayload>) => void,
		): void;
		removeEventListener(
			on: "rsctransitionend",
			callback: (event: CustomEvent<RSCPayload>) => void,
		): void;
	}
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
	return fetch(request);
	// const cache = await responseCache;
	// let cacheKey: Request | undefined;
	// if (request.method === "GET") {
	// 	const cached = await cache.match(request.clone());
	// 	if (cached) return cached;
	// 	cacheKey = request.clone();
	// }

	// if (invalidate) {
	// 	await invalidateCache(invalidate);
	// }
	// const response = await fetch(request);

	// if (cacheKey) {
	// 	const cloned = response.clone();
	// 	const toCache = new Response(cloned.body, {
	// 		headers: cloned.headers,
	// 		status: cloned.status,
	// 		statusText: cloned.statusText,
	// 	});
	// 	toCache.headers.set("Cache-Control", "public, max-age=31536000");
	// 	cache.put(cacheKey, toCache).catch(console.error);
	// }

	// return response;
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
const pendingNavigations = new Set<{
	controller?: AbortController;
	rscPayload?: RSCPayload;
}>();

function clearPendingNavigationsFor(rscPayload: RSCPayload) {
	const pendingNavigationsArray = Array.from(pendingNavigations);
	const index = pendingNavigationsArray.findIndex(
		(pending) => pending.rscPayload === rscPayload,
	);

	if (index !== -1) {
		return;
	}

	for (let i = 0; i < index; i++) {
		const pending = pendingNavigationsArray[i];
		pending.controller?.abort();
		pendingNavigations.delete(pending);
	}
}

window.addEventListener("rsctransitionend", (event) => {
	const pendingNavigationsArray = Array.from(pendingNavigations);
	const index = pendingNavigationsArray.findIndex(
		(pending) => pending.rscPayload === event.detail,
	);

	if (index === -1) {
		return;
	}

	for (let i = 0; i < index; i++) {
		const pending = pendingNavigationsArray[i];
		pending.controller?.abort();
		pendingNavigations.delete(pending);
	}
	pendingNavigations.delete(pendingNavigationsArray[index]);
});

window.callServer = async function callServerImp(
	id: string,
	args: unknown[],
	serverCallType?: ServerCallType,
) {
	if (!root) {
		throw new Error("Can't invoke server actions before hydrating");
	}

	let callType: ServerCallType | undefined;
	switch (serverCallType) {
		case "action":
		case "navigation":
			callType = serverCallType;
			break;
	}

	switch (callType) {
		case "action": {
			const body = await ReactServerDOM.encodeReply(args);

			if (!body) {
				throw new Error("Failed to encode request body");
			}

			const headers: Record<string, string> = {
				Accept: "text/x-component",
				"RSC-Action": id,
			};

			if (typeof body === "string") {
				headers["Content-Type"] = "application/json";
			}

			const url = new URL(window.location.href);
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
					callServer: ((...args) =>
						window.callServer(...args)) satisfies typeof callServer,
				},
			);

			return response;
		}
		case "navigation": {
			const url = new URL(id, location.origin);
			const [fromURL, pushState] = args as [
				string | undefined,
				boolean | undefined,
			];
			if (typeof fromURL !== "string") {
				throw new Error("Expected fromURL to be a string");
			}

			const controller = new AbortController();
			const responsePromise = cacheOrFetch(
				new Request(url.pathname + url.search, {
					method: "GET",
					headers: {
						Accept: "text/x-component",
						"RSC-Navigation": fromURL || "1",
					},
					mode: "same-origin",
					signal: controller.signal,
				}),
			);
			const response = ReactServerDOM.createFromFetch(responsePromise, {
				callServer: ((...args) =>
					window.callServer(...args)) satisfies typeof callServer,
			});

			const pending: {
				controller: AbortController;
				rscPayload?: RSCPayload;
			} = { controller };
			pendingNavigations.add(pending);

			const from: Location = {
				pathname: window.location.pathname,
				search: window.location.search,
			};

			const identity = {};
			const event = new CustomEvent("rsctransition", {
				detail: { identity, from, url },
			});
			window.dispatchEvent(event);
			if (pushState) {
				history.pushState(null, "", url.pathname + url.search);
			}

			Promise.resolve(response)
				.then(() => {
					pending.rscPayload = response;
					const event = new CustomEvent("rsctransition", {
						detail: { identity, from, url, response },
					});
					window.dispatchEvent(event);
					return response;
				})
				.then((rscResponse: RSCPayload) => {
					clearPendingNavigationsFor(rscResponse);
				});

			responsePromise.then((response) => {
				if (controller.signal.aborted) return;
				if (response.url !== url.href) {
					if (pushState) {
						history.replaceState(null, "", response.url);
					} else {
						history.pushState(null, "", response.url);
					}
				}
			});

			return response;
		}
		default: {
			const body = await ReactServerDOM.encodeReply(args);

			if (!body) {
				throw new Error("Failed to encode request body");
			}

			const headers: Record<string, string> = {
				Accept: "text/x-component",
				"RSC-Form": id,
			};

			if (typeof body === "string") {
				headers["Content-Type"] = "application/json";
			}

			const url = new URL(window.location.href);
			const controller = new AbortController();
			const responsePromise = cacheOrFetch(
				new Request(url.pathname + url.search, {
					body,
					method: "POST",
					headers,
					mode: "same-origin",
					signal: controller.signal,
				}),
			);

			const response = ReactServerDOM.createFromFetch(
				responsePromise,

				{
					callServer: ((...args) =>
						window.callServer(...args)) satisfies typeof callServer,
				},
			);
			const pending: {
				rscPayload?: RSCPayload;
			} = {};
			pendingNavigations.add(pending);

			const from: Location = {
				pathname: window.location.pathname,
				search: window.location.search,
			};
			const identity = {};
			const event = new CustomEvent("rsctransition", {
				detail: { identity, args, from, url },
			});
			window.dispatchEvent(event);
			if (response.url !== url.href) {
				// TODO: only replace if the response has or is going to surface
				history.pushState(null, "", response.url);
			}

			Promise.resolve(response)
				.then(() => {
					pending.rscPayload = response;
					const event = new CustomEvent("rsctransition", {
						detail: { identity, args, from, url, response },
					});
					window.dispatchEvent(event);
					return response;
				})
				.then((rscResponse: RSCPayload) => {
					clearPendingNavigationsFor(rscResponse);
				});

			return response;
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
