import * as React from "react";

import { Boundary, Outlet } from "./router.client.ts";
import {
	type FormAction,
	type RequestContext,
	getRequestContext,
} from "./framework-internal.ts";

export interface Routing {
	path?: string;
	layout?: () => Promise<unknown>;
	loading?: () => Promise<unknown>;
	notFound?: () => Promise<unknown>;
	page?: () => Promise<unknown>;
	problem?: () => Promise<unknown>;
	route?: () => Promise<unknown>;
	parallel?: Record<string, Routing>;
	children?: Routing[];
}

export interface ClientRouting {
	path?: string;
	layout?: string;
	loading?: string;
	notFound?: string;
	page?: string;
	problem?: string;
	route?: string;
	parallel?: Record<string, ClientRouting>;
	children?: ClientRouting[];
}

export interface RSCPayload {
	actionId?: string;
	found: boolean;
	match: ClientRouting;
	location: Location;
	routes: Record<string, React.ReactNode>;
}

export interface Location {
	pathname: string;
	search: string;
}

export type ServerCallType = "form" | "action" | "navigation";

function RequestContextProvider({
	children,
	context,
}: {
	children?: React.ReactNode;
	context: RequestContext;
}) {
	const c = getRequestContext() as RequestContext;
	for (const [key, value] of Object.entries(context)) {
		// @ts-ignore
		c[key] = value;
	}

	return children;
}

function provideContext(context: RequestContext, element: React.ReactElement) {
	return React.createElement(RequestContextProvider, { context }, element);
}

export async function createRSCPayload(
	routingMatch: Routing,
	found: boolean,
	headers: Headers,
	url: URL,
	action: FormAction | undefined,
	onResponse: (response: Response) => void,
): Promise<RSCPayload> {
	const routes: Record<string, React.ReactNode> = {};

	const context: RequestContext = {
		type: "initialized",
		action,
		headers,
		url,
		onResponse,
	};

	async function createRSCPayloadRecursive(
		routing: typeof routingMatch,
		info: { key: number; handledNotFound?: boolean },
		clientRouting: ClientRouting,
	): Promise<string> {
		clientRouting.path = routing.path;

		const key = info.key++;
		let lastId = "";
		if (routing.children) {
			lastId = (
				await Promise.all(
					routing.children.map((child) => {
						const newRoute = {};
						clientRouting.children = clientRouting.children || [];
						clientRouting.children.push(newRoute);
						return createRSCPayloadRecursive(child, info, newRoute);
					}),
				)
			)[0];
		}

		const routeModule = !routing.children?.length
			? ((await routing.page?.()) as any)
			: undefined;
		if (routeModule?.default) {
			clientRouting.page = `${key}-page`;
			routes[`${key}-page`] = provideContext(
				context,
				React.createElement(routeModule.default, {}),
			);
			lastId = `${key}-page`;
		}

		const loadingModule = (await routing.loading?.()) as any;
		if (loadingModule?.default) {
			const fallback = provideContext(
				context,
				React.createElement(loadingModule.default),
			);
			clientRouting.loading = `${key}-loading`;
			routes[`${key}-loading`] = provideContext(
				context,
				React.createElement(
					React.Suspense,
					{
						key: lastId,
						fallback,
					},
					React.createElement(Outlet, { id: lastId }),
				),
			);
			lastId = `${key}-loading`;
		}

		const problemModule = (await routing.problem?.()) as any;
		if (problemModule?.default) {
			clientRouting.problem = `${key}-problem`;
			routes[`${key}-problem`] = provideContext(
				context,
				React.createElement(
					Boundary,
					{
						FallbackComponent: problemModule.default,
					},
					React.createElement(Outlet, { id: lastId }),
				),
			);
			lastId = `${key}-problem`;
		}

		const notFoundModule =
			!found && !info.handledNotFound
				? ((await routing.notFound?.()) as any)
				: undefined;
		if (notFoundModule?.default) {
			info.handledNotFound = true;
			clientRouting.notFound = `${key}-not-found`;
			routes[`${key}-not-found`] = provideContext(
				context,
				React.createElement(
					notFoundModule.default,
					{},
					React.createElement(Outlet, { id: lastId }),
				),
			);
			lastId = `${key}-not-found`;
		}

		const layoutModule = (await routing.layout?.()) as any;
		if (layoutModule?.default) {
			clientRouting.layout = `${key}-layout`;
			routes[`${key}-layout`] = provideContext(
				context,
				React.createElement(
					layoutModule.default,
					{},
					React.createElement(Outlet, { id: lastId }),
				),
			);
			lastId = `${key}-layout`;
		}
		return lastId;
	}

	const clientRouting = {} as ClientRouting;
	await createRSCPayloadRecursive(routingMatch, { key: 0 }, clientRouting);

	return {
		found,
		match: clientRouting,
		routes,
		location: {
			pathname: url.pathname,
			search: url.search,
		},
		actionId: action?.id,
	};
}

export function match(
	routing: Routing,
	pathname: string,
): [Routing, boolean] | null {
	const cleanPathname = pathname.replace(/^\/|\/$/g, "");
	const segments = cleanPathname.split("/").filter(Boolean);

	const info = { processed: 0 };
	const match = matchInternal(routing, segments, 0, {}, info);
	return !match
		? (match as null)
		: ([match, info.processed >= segments.length] as [Routing, boolean]);
}

function matchInternal(
	routing: Routing,
	segments: string[],
	index: number,
	current: Routing,
	info: { processed: number },
): Routing | null {
	const segmentMatch = matchSegment(routing.path, segments[index]);
	if (!segmentMatch) {
		return null;
	}

	const nextIndex =
		segmentMatch === "parallel" || segmentMatch === "pathless"
			? index
			: index + 1;

	if (info.processed < nextIndex) {
		info.processed = nextIndex;
	}

	current.layout = routing.layout;
	current.loading = routing.loading;
	current.notFound = routing.notFound;
	current.problem = routing.problem;

	if (nextIndex === segments.length) {
		current.page = routing.page;
		current.route = routing.route;
		return current;
	}

	if (routing.children?.length) {
		for (const child of routing.children) {
			const childMatch = matchInternal(child, segments, nextIndex, {}, info);
			if (childMatch) {
				current.children = current.children || [];
				current.children.push(childMatch);
			}
		}
	}

	return current;
}

function matchSegment(
	pattern: string | undefined,
	segment: string | undefined,
): "parallel" | "pathless" | "match" | "param" | "catchall" | false {
	if (!pattern || (pattern.startsWith("(") && pattern.endsWith(")"))) {
		return "pathless";
	}

	if (pattern.startsWith("@")) {
		return "parallel";
	}

	if (!pattern && !segment) return "pathless";

	if (pattern === segment) {
		return "match";
	}

	if (pattern.startsWith(":")) {
		return "param";
	}

	return false;
}
