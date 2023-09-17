"use client";

import * as React from "react";

import type { Navigation } from "./framework.client.ts";
import type { ClientRouting, Location, RSCPayload } from "./router.ts";
import { OutletContext } from "./router.context.ts";

export function Outlet({ id }: { id: string }) {
	const { outlets } = React.useContext(OutletContext) || {};
	return outlets?.[id];
}

let lastTransition:
	| {
			args?: unknown[];
			from: Location;
			url?: URL;
			response: React.Usable<RSCPayload>;
	  }
	| undefined = undefined;
export function ClientRouter({
	rscPayload: initialRSCPayload,
}: { rscPayload: RSCPayload }) {
	const [rscPayload, setRSCPayload] =
		React.useState<RSCPayload>(initialRSCPayload);
	const [transitioning, startTransition] = React.useTransition();

	const transition = React.useSyncExternalStore(
		React.useCallback((callback) => {
			const listener = (
				event: CustomEvent<{
					args?: unknown[];
					from: Location;
					url?: URL;
					response: React.Usable<RSCPayload>;
				}>,
			) => {
				lastTransition = event.detail;
				callback();
			};
			window.addEventListener("rsctransition", listener);
			return () => {
				window.removeEventListener("rsctransition", listener);
			};
		}, []),
		React.useCallback(() => lastTransition, []),
		React.useCallback(() => undefined, []),
	);

	const newRSCPayload = transition?.response
		? React.use(transition.response)
		: rscPayload;
	React.useEffect(() => {
		if (newRSCPayload !== rscPayload) {
			startTransition(() => {
				setRSCPayload(newRSCPayload);
			});
		}
	}, [newRSCPayload, rscPayload]);

	const navigation = React.useMemo<Navigation>(() => {
		let navigation: Navigation = { state: "idle" };
		if (transitioning && transition) {
			navigation = {
				state: "transitioning",
				location: transition.from,
				args: transition.args,
			};
		}
		return navigation;
	}, [transitioning, transition]);

	const rendered = React.useMemo(() => {
		return React.createElement(
			OutletContext.Provider,
			{
				value: {
					location: rscPayload.location,
					navigation,
					outlets: rscPayload.routes,
				},
			},
			createRoutingElement(
				rscPayload.routes,
				rscPayload.match,
				rscPayload.found,
				{
					key: 0,
				},
			),
		);
	}, [rscPayload, navigation]);

	return rendered;
}

function createRoutingElement(
	routes: Record<string, React.ReactNode>,
	routing: ClientRouting,
	matched: boolean,
	info: { handledNotFound?: boolean; key: number },
): React.ReactNode {
	let element: React.ReactNode | null = null;
	if (routing.children) {
		element = routing.children.map((child) =>
			createRoutingElement(routes, child, matched, info),
		);
	}

	const routeKey = !element && routing.page;
	const routeModule = routeKey ? routes[routeKey] : undefined;
	if (routeKey) {
		element = routeModule;
	}

	const loadingKey = routing.loading;
	const loadingModule = loadingKey ? routes[loadingKey] : undefined;
	if (loadingKey) {
		element = loadingModule;
	}

	const notFoundKey = !info.handledNotFound && routing.notFound;
	const notFoundModule =
		notFoundKey && !matched ? routes[notFoundKey] : undefined;
	if (notFoundKey) {
		info.handledNotFound = true;
		element = notFoundModule;
	}

	const layoutKey = routing.layout;
	const layoutModule = layoutKey ? routes[layoutKey] : undefined;
	if (layoutKey) {
		element = layoutModule;
	}

	return element;
}
