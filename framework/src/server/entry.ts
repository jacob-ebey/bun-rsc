import * as React from "react";

// @ts-ignore
import * as ReactDOMServer from "#react-server-dom-server-implementation";

import { type Routing, createRSCPayload, match } from "../router.ts";
import { ClientRouter } from "../router.client.ts";

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
		const actionFunction = (actionModule as any)?.[manifestEntry.name];

		if (!actionFunction || typeof actionFunction !== "function") {
			return notFound();
		}

		const decoded = request.headers
			.get("Content-Type")
			?.match(/application\/json/)
			? await request.json()
			: await ReactDOMServer.decodeReply(await request.formData());

		if (!Array.isArray(decoded)) {
			console.log({ decoded });
			throw new Error("Failed to decode request body");
		}

		const actionResult = await actionFunction(...decoded);
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
	} else if (
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
		const actionFunction = (actionModule as any)?.[manifestEntry.name];

		if (!actionFunction || typeof actionFunction !== "function") {
			return notFound();
		}

		await actionFunction(actionFormData);
	}

	const [routingMatch, found] = matchedRouting;

	const rscPayload = await createRSCPayload(routingMatch, found);

	const rscStream = ReactDOMServer.renderToReadableStream(
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

	return new Response(rscStream, {
		headers: {
			"Content-Type": "text/x-component",
			"Transfer-Encoding": "chunked",
			RSC: "1",
		},
	});
}
