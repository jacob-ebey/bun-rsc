"use client";

import * as React from "react";
import {
	type ErrorBoundaryPropsWithComponent,
	ErrorBoundary,
} from "react-error-boundary";

import type { Navigation, ProblemProps } from "./framework.client.ts";
import type { ClientRouting, Location, RSCPayload } from "./router.ts";
import { OutletContext } from "./router.context.ts";

export function DangerousScript({ content }: { content: string }) {
	const ref = React.useRef<HTMLScriptElement>();
	const isFirstRender = React.useRef(true);

	React.useEffect(() => {
		if (!ref.current || ref.current._ran) {
			return;
		}
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		ref.current._ran = true;
		const script = document.createElement("script");
		script.appendChild(document.createTextNode(content));
		document.body.appendChild(script);
	}, []);

	return React.createElement("script", {
		ref,
		dangerouslySetInnerHTML: {
			__html: `document.currentScript._ran = true;${content}`,
		},
	});
}

export function Boundary({
	FallbackComponent,
	children,
}: {
	FallbackComponent: React.ComponentType<ProblemProps>;
	children?: React.ReactNode;
}) {
	return React.createElement(
		ErrorBoundary as React.ComponentType<ErrorBoundaryPropsWithComponent>,
		{
			// TODO: this doesn't work as some state is stuck.
			// I think this needs a "key" based on the location.
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			FallbackComponent: FallbackComponent as any,
			onReset() {
				window.location.reload();
			},
		},
		children,
	);
}

export function Outlet({ id }: { id: string }) {
	const { outlets } = React.useContext(OutletContext) || {};
	return outlets?.[id];
}

export function ClientRouter({
	rscPayload: initialRSCPayload,
}: { rscPayload: RSCPayload }) {
	const [rscPayload, setRSCPayload] = React.useState<
		React.Usable<RSCPayload> | undefined
	>();
	const [transitioning, startTransition] = React.useTransition();
	const [transition, setTransition] = React.useState<
		RSCTransitionEventArgs | undefined
	>();
	React.useEffect(() => {
		// TODO: install global event listeners here to avoid missing
		// any navigation events that occur before react can hydrate
		// and run effects.
		const listener = (event: CustomEvent<RSCTransitionEventArgs>) => {
			setTransition({
				...event.detail,
			});
			if (transition && event.detail.identity === transition.identity) {
				React.startTransition(() => {
					setRSCPayload(event.detail.response);
				});
			}
		};
		window.addEventListener("rsctransition", listener);
		return () => {
			window.removeEventListener("rsctransition", listener);
		};
	}, [setTransition, transition]);

	const rscPayloadToUse = rscPayload
		? React.use(rscPayload)
		: initialRSCPayload;
	const [lastPayload, setLastPayload] = React.useState(rscPayloadToUse);
	React.useEffect(() => {
		if (rscPayloadToUse !== lastPayload) {
			startTransition(() => {
				setLastPayload(rscPayloadToUse);
			});
		}
	}, [rscPayloadToUse]);

	React.useEffect(() => {
		if (lastPayload === initialRSCPayload) {
			return;
		}
		const event = new CustomEvent("rsctransitionend", {
			detail: lastPayload,
		});
		window.dispatchEvent(event);
	}, [rscPayloadToUse]);

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

	// TODO: provide navigation through context so rendered
	// here doesn't have to be computed as often.
	const rendered = React.useMemo(() => {
		console.log("new payload");
		return React.createElement(
			OutletContext.Provider,
			{
				value: {
					location: rscPayloadToUse.location,
					navigation,
					outlets: rscPayloadToUse.routes,
				},
			},
			createRoutingElement(
				rscPayloadToUse.routes,
				rscPayloadToUse.match,
				rscPayloadToUse.found,
				{
					key: 0,
				},
			),
		);
	}, [rscPayloadToUse, navigation]);

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

	const problemKey = routing.problem;
	const problemModule = problemKey ? routes[problemKey] : undefined;
	if (problemKey) {
		element = problemModule;
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
