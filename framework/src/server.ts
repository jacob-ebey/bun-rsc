import * as path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Routing } from "framework/router";
import type * as ServerEntry from "./server/entry.ts";
import type * as SSREntry from "./ssr/entry.ts";

// @ts-ignore
import * as dynamicImport from "#dynamic-import-implementation";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_chunk_load__: (chunkId: string) => Promise<unknown>;
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_require__: (chunkId: string) => unknown;
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_cache__: Record<string, unknown>;
}

export type BundleInfo = {
	clientDependencies: Record<string, [string, string][]>;
	serverDependencies: Record<string, [string, string][]>;
	outputBrowserEntry: string;
	outputSsrEntry: string;
	outputServerEntry: string;
	routes: Record<string, string>;
};

export function createHandler(importURL: string, bundleInfo: BundleInfo) {
	const globalObj = typeof window !== "undefined" ? window : global;
	globalObj.__webpack_chunk_load__ = async (chunkId) => {
		const toLoad = dynamicImport
			.dynamicImport(
				pathToFileURL(
					path.resolve(
						fileURLToPath(path.dirname(importURL)),
						`dist/ssr${chunkId}`,
					),
				).href,
			)
			.catch(() =>
				dynamicImport.dynamicImport(
					pathToFileURL(
						path.resolve(
							fileURLToPath(path.dirname(importURL)),
							`dist/server${chunkId}`,
						),
					).href,
				),
			);
		globalObj.__webpack_cache__ = globalObj.__webpack_cache__ || {};
		globalObj.__webpack_cache__[chunkId] = toLoad;

		const res = await toLoad;
		globalObj.__webpack_cache__[chunkId] = res;
		return res;
	};
	globalObj.__webpack_require__ = (chunkId) => {
		return globalObj.__webpack_cache__[chunkId];
	};

	const baseURL = path.dirname(fileURLToPath(importURL));
	function getImportURL(filepath: string) {
		return pathToFileURL(path.resolve(baseURL, filepath)).href;
	}
	const serverEntryURL = getImportURL(bundleInfo.outputServerEntry);
	const ssrEntryURL = getImportURL(bundleInfo.outputSsrEntry);

	const routing = createRouting(getImportURL, bundleInfo);
	const clientManifest = createClientManifest();

	return async (request: Request): Promise<Response> => {
		const serverEntry = (await dynamicImport.dynamicImport(
			serverEntryURL,
		)) as typeof ServerEntry;
		const rscResponse = await serverEntry.fetch(request, {
			clientManifest,
			routing,
		});

		let response: Response;

		if (!rscResponse.headers.get("Content-Type")?.match(/text\/x-component/)) {
			response = rscResponse;
		} else if (request.headers.has("RSC-Action")) {
			response = rscResponse;
		} else if (request.headers.has("RSC-Form")) {
			response = rscResponse;
		} else if (request.headers.has("RSC-Navigation")) {
			response = rscResponse;
		} else {
			const ssrEntry = (await dynamicImport.dynamicImport(
				ssrEntryURL,
			)) as typeof SSREntry;
			response = await ssrEntry.fetch(request, {
				browserEntry: `/${bundleInfo.outputBrowserEntry}`,
				rscResponse,
			});
		}

		response.headers.append("Vary", "Accept");
		response.headers.append("Vary", "RSC-Action");
		response.headers.append("Vary", "RSC-Form");
		response.headers.append("Vary", "RSC-Navigation");
		return response;
	};
}

function createClientManifest() {
	const manifest = {};
	const proxy = new Proxy(manifest, {
		get(target, prop) {
			const [mod, exp] = (prop as string).split("#");
			const modWithoutExt = mod.slice(0, -path.extname(mod).length);
			const chunk = `/${modWithoutExt}.js`;

			// TODO: validate in manifest
			return {
				id: chunk,
				name: exp,
				chunks: [chunk],
			};
		},
	});

	return proxy;
}

function createRouting(
	getImportURL: (filepath: string) => string,
	bundleInfo: BundleInfo,
) {
	const sortedRouteIDs = Object.keys(bundleInfo.routes).sort(
		(a, b) => b.length - a.length,
	);

	const routeDefinition: Routing = {};

	for (let i = 0; i < sortedRouteIDs.length; i++) {
		const routeID = sortedRouteIDs[i];

		const parts = routeID.replace(/^app\//, "").split("/");

		let current = routeDefinition;
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			const existingChild = current.children?.find(
				(child) => child.path === part,
			);

			if (existingChild) {
				current = existingChild;
			} else {
				const newChild: Routing = {
					path: part,
				};
				current.children = current.children || [];
				current.children.push(newChild);
				current = newChild;
			}
		}

		const moduleURL = getImportURL(bundleInfo.routes[routeID]);
		const importRoute = () => dynamicImport.dynamicImport(moduleURL);
		const withoutExt = routeID.split("/").slice(-1)[0];
		if (withoutExt === "layout") {
			current.layout = importRoute;
		} else if (withoutExt === "loading") {
			current.loading = importRoute;
		} else if (withoutExt === "not-found") {
			current.notFound = importRoute;
		} else if (withoutExt === "page") {
			current.page = importRoute;
		} else if (withoutExt === "problem") {
			current.problem = importRoute;
		} else if (withoutExt === "route") {
			current.route = importRoute;
		} else {
			throw new Error(`Unknown route type: ${withoutExt}`);
		}
	}

	return routeDefinition;
}

export function createDevMiddleware(pathname: string) {
	return {
		hmr(request: Request) {
			// event-stream
			return new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(
							`event: message\ndata: ${JSON.stringify({
								type: "connected",
							})}\n\n`,
						);
						request.signal.addEventListener("abort", () => {
							setTimeout(() => {
								controller.close();
							}, 0);
						});
					},
				}),
				{
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"Content-Encoding": "chunked",
					},
				},
			);
		},
		html(response: Response) {
			if (!response.body) {
				return response;
			}

			const encoder = new TextEncoder();
			const transformStream = new TransformStream({
				flush(controller) {
					controller.enqueue(
						encoder.encode(
							// biome-ignore lint/style/useTemplate: <explanation>
							'<script type="module">' +
								"let shouldReload = false;" +
								`const pathname = ${JSON.stringify(pathname)};` +
								"function tryReload() {" +
								'if (typeof window.callServer === "function")' +
								'window.callServer(location.pathname + location.search, [location.pathname, false], "navigation");' +
								"else " +
								"location.reload();" +
								"}" +
								"function connect() {" +
								"const eventSource = new EventSource(pathname);" +
								'eventSource.addEventListener("open", () => {' +
								"if (shouldReload) {" +
								"tryReload();" +
								"}" +
								"shouldReload = true;" +
								"});" +
								'eventSource.addEventListener("error", () => {' +
								"eventSource.close();" +
								"setTimeout(connect, 200);" +
								"});" +
								"}" +
								"connect();" +
								"</script>",
						),
					);
				},
			});

			response.body.pipeTo(transformStream.writable);

			return new Response(transformStream.readable, {
				headers: response.headers,
				status: response.status,
				statusText: response.statusText,
				// @ts-expect-error
				duplex: "half",
			});
		},
	};
}
