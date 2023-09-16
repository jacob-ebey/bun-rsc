"use client";

import * as React from "react";

import type { Navigation } from "./framework.client.ts";
import type { ClientRouting, RSCPayload } from "./router.ts";
import { OutletContext } from "./router.context.ts";

export function Outlet({ id }: { id: string }) {
	const { outlets } = React.useContext(OutletContext) || {};
	return outlets?.[id];
}

export function ClientRouter({ rscPayload }: { rscPayload: RSCPayload }) {
	const [transition, setTransition] = React.useState<
		| {
				args?: unknown[];
				url?: URL;
				response: React.Usable<RSCPayload>;
		  }
		| undefined
	>(undefined);

	const payloadToUse = transition?.response
		? React.use(transition.response)
		: rscPayload;

	const element = React.useMemo(
		() =>
			createRoutingElement(
				payloadToUse.routes,
				payloadToUse.match,
				payloadToUse.found,
				{
					key: 0,
				},
			),
		[payloadToUse],
	);

	React.useEffect(() => {
		const event = new CustomEvent<RSCPayload>("rsctransitionend", {
			detail: payloadToUse,
		});
		window.dispatchEvent(event);
	}, [element]);
	// const [shouldRender, setShouldRender] = React.useState(rendered);
	const [transitioning, startTransition] = React.useTransition();

	React.useEffect(() => {
		const listener = (
			event: CustomEvent<{
				args?: unknown[];
				url?: URL;
				response: React.Usable<RSCPayload>;
			}>,
		) => {
			startTransition(() => {
				setTransition(event.detail);
			});
		};
		window.addEventListener("rsctransition", listener);
		return () => {
			window.removeEventListener("rsctransition", listener);
		};
	}, [setTransition, startTransition]);

	let navigation: Navigation = { state: "idle" };
	if (transitioning) {
		navigation = {
			state: "transitioning",
			location: rscPayload.location,
			args: transition?.args,
			url: transition?.url,
		};
	}

	return React.createElement(
		OutletContext.Provider,
		{
			value: {
				location: payloadToUse.location,
				navigation,
				outlets: payloadToUse.routes,
			},
		},
		element,
	);
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
