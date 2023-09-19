import * as React from "react";

import type { ThisAction } from "../framework.ts";
// @ts-ignore
import { ClientRouter } from "framework/client";
// @ts-ignore
import * as ReactDOMServer from "#react-server-dom-server-implementation";

import { type Routing, createRSCPayload, match } from "../router.ts";
import type { FormAction } from "../framework-internal.ts";

const globalObj = typeof window !== "undefined" ? window : global;

function notFound() {
	return new Response("Not found", {
		status: 404,
		headers: {
			Vary: "RSC-Action",
		},
	});
}

function getApiRoute(routing: Routing) {
	if (routing.children?.[0]) {
		return getApiRoute(routing.children[0]);
	}
	return routing.route;
}

export async function fetch(
	request: Request,
	{
		clientManifest,
		routing,
	}: {
		clientManifest: Record<
			string,
			{
				id: string;
				name: string;
				chunks: string[];
			}
		>;
		routing: Routing;
	},
): Promise<Response> {
	const url = new URL(request.url);
	const matchedRouting = match(routing, url.pathname);
	if (!matchedRouting) {
		return notFound();
	}

	const apiRoute = matchedRouting[1] && getApiRoute(matchedRouting[0]);
	const apiRouteHandler =
		apiRoute &&
		(
			(await apiRoute()) as {
				handler?: (request: Request) => Response;
			}
		)?.handler;

	if (apiRouteHandler) {
		return apiRouteHandler(request);
	}

	let action: FormAction | undefined;

	// Manual Action calls
	if (request.method === "POST" && request.headers.has("RSC-Action")) {
		const actionId = request.headers.get("RSC-Action");

		const manifestEntry = actionId && clientManifest[actionId];
		if (!manifestEntry) {
			return notFound();
		}

		await Promise.all(
			manifestEntry.chunks.map(globalObj.__webpack_chunk_load__),
		);

		const actionModule = globalObj.__webpack_require__(manifestEntry.id);
		const actionFunction = (actionModule as Record<string, Function>)?.[
			manifestEntry.name
		];

		if (!actionFunction || typeof actionFunction !== "function") {
			return notFound();
		}

		const decoded = request.headers
			.get("Content-Type")
			?.match(/application\/json/)
			? await request.json()
			: await ReactDOMServer.decodeReply(await request.formData());

		if (!Array.isArray(decoded)) {
			throw new Error("Failed to decode request body");
		}

		const thisAction: ThisAction = {
			headers: new Headers(request.headers),
			url: new URL(request.url),
		};

		const actionResult = await actionFunction.call(thisAction, ...decoded);
		const rscStream = ReactDOMServer.renderToReadableStream(
			actionResult,
			clientManifest,
			{
				onError: console.error,
				signal: request.signal,
			},
		);

		return new Response(rscStream, {
			headers: {
				"Content-Type": "text/x-component",
				"Transfer-Encoding": "chunked",
				RSC: "1",
			},
		});
	}
	// Form Action calls
	else if (request.method === "POST" && request.headers.has("RSC-Form")) {
		const actionId = request.headers.get("RSC-Form");

		const manifestEntry = actionId && clientManifest[actionId];
		if (!manifestEntry) {
			return notFound();
		}

		await Promise.all(
			manifestEntry.chunks.map(globalObj.__webpack_chunk_load__),
		);

		const actionModule = globalObj.__webpack_require__(manifestEntry.id);
		const actionFunction = (actionModule as Record<string, Function>)?.[
			manifestEntry.name
		];

		if (!actionFunction || typeof actionFunction !== "function") {
			return notFound();
		}

		const decoded = await ReactDOMServer.decodeReply(await request.formData());

		if (
			!Array.isArray(decoded) ||
			decoded.length !== 1 ||
			!decoded[0] ||
			!(decoded[0] instanceof FormData)
		) {
			throw new Error("Failed to decode request body");
		}

		const formData = decoded[0];

		const actionFormData = new FormData();
		for (const [key, value] of formData) {
			const actionMatch = key.match(/^(\d+\_)?\$ACTION_ID_/);
			if (!actionMatch) {
				actionFormData.append(key, value);
			}
		}

		const thisAction: ThisAction = {
			headers: new Headers(request.headers),
			url: new URL(request.url),
		};

		try {
			action = {
				id: actionId,
				formData: actionFormData,
				result: await actionFunction.call(thisAction, actionFormData),
			};
		} catch (error) {
			if (error && error instanceof Response) {
				action = {
					id: actionId,
					formData: actionFormData,
					result: error,
				};
			} else {
				action = {
					id: actionId,
					formData: actionFormData,
					error: error,
				};
			}
		}
	}
	// NO-JS forms
	else if (
		request.method === "POST" &&
		(request.headers.get("Content-Type")?.match(/multipart\/form-data/) ||
			request.headers
				.get("Content-Type")
				?.match(/application\/x-www-form-urlencoded/))
	) {
		// TODO: Figure out how to use React methods for this
		const formData = await request.formData();
		let actionId = "";
		const actionFormData = new FormData();
		let prefix = "";
		for (const [key, value] of formData) {
			const actionMatch = key.match(/^(\d+\_)?\$ACTION_ID_/);
			if (actionMatch) {
				actionId = key.slice(actionMatch[0].length);
				prefix = actionMatch[1] || "";
			} else if (actionId && key.startsWith(prefix)) {
				actionFormData.append(key.slice(prefix.length), value);
			}
		}

		const manifestEntry = actionId && clientManifest[actionId];
		if (!manifestEntry) {
			return notFound();
		}

		await Promise.all(
			manifestEntry.chunks.map(globalObj.__webpack_chunk_load__),
		);

		const actionModule = globalObj.__webpack_require__(manifestEntry.id);
		const actionFunction = (actionModule as Record<string, Function>)?.[
			manifestEntry.name
		];

		if (!actionFunction || typeof actionFunction !== "function") {
			return notFound();
		}

		const thisAction: ThisAction = {
			headers: new Headers(request.headers),
			url: new URL(request.url),
		};

		try {
			action = {
				id: actionId,
				formData: actionFormData,
				result: await actionFunction.call(thisAction, actionFormData),
			};
		} catch (error) {
			if (error && error instanceof Response) {
				action = {
					id: actionId,
					formData: actionFormData,
					result: error,
				};
			} else {
				action = {
					id: actionId,
					formData: actionFormData,
					error: error,
				};
			}
		}
	}

	if (
		action &&
		"result" in action &&
		action.result &&
		action.result instanceof Response
	) {
		if (action.result.status < 300 || action.result.status >= 400) {
			throw new Error(
				"Only redirect responses are supported from server actions",
			);
		}
		if (!action.result.headers.get("Location")) {
			throw new Error("Redirect response is missing Location header");
		}
		return action.result;
	}

	const [routingMatch, found] = matchedRouting;

	const responses: Response[] = [];

	const rscPayload = await createRSCPayload(
		routingMatch,
		found,
		request.headers,
		url,
		action,
		(response) => {
			responses.push(response);
		},
	);

	const rscStream: ReadableStream<Uint8Array> =
		request.headers.has("RSC-Form") || request.headers.has("RSC-Navigation")
			? ReactDOMServer.renderToReadableStream(rscPayload, clientManifest, {
					onError: console.error,
					signal: request.signal,
			  })
			: ReactDOMServer.renderToReadableStream(
					React.createElement(
						React.StrictMode,
						{},
						React.createElement(ClientRouter, {
							rscPayload,
						}),
					),
					clientManifest,
					{
						onError: console.error,
						signal: request.signal,
					},
			  );

	const headers = new Headers();
	headers.append("Content-Type", "text/x-component");
	headers.append("Transfer-Encoding", "chunked");
	headers.append("Vary", "RSC-Action");
	headers.append("Vary", "RSC-Form");
	headers.append("Vary", "RSC-Navigation");

	const [responseStream, bufferStream] = rscStream.tee();

	const response = new Response(responseStream, { headers });

	const reader = bufferStream.getReader();
	await reader.read();
	reader.cancel();

	if (responses.length) {
		if (responses.length > 1) {
			throw new Error("Multiple responses were generated in the render cycle");
		}
		response.body?.cancel();
		return responses[0];
	}

	return response;
}
