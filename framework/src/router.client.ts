"use client";

import * as React from "react";

import { type RSCPayload, type ClientRouting } from "./router.ts";

const OutletContext = React.createContext<
	Record<string, React.ReactNode> | undefined
>(undefined);

export function Outlet({ id }: { id: string }) {
	const outlets = React.useContext(OutletContext);
	return outlets?.[id];
}

export function ClientRouter({ rscPayload }: { rscPayload: RSCPayload }) {
	const [transitioning, startTransition] = React.useTransition();
	console.log({ transitioning });

	// const element = React.useMemo(
	// 	() =>
	// 		createRoutingElement(
	// 			rscPayload.routes,
	// 			rscPayload.match,
	// 			rscPayload.found,
	// 			{
	// 				key: 0,
	// 			},
	// 		),
	// 	[rscPayload],
	// );

	// return React.createElement(
	// 	OutletContext.Provider,
	// 	{
	// 		value: rscPayload.routes,
	// 	},
	// 	element,
	// );

	const [displayedRSCPayload, setDisplayedRSCPayload] =
		React.useState(rscPayload);

	const [element, usedOld] = React.useMemo(() => {
		let usedOld = false;
		let newRoutes = rscPayload.routes;

		if (!rscPayload.actionId) {
			newRoutes = Object.entries(rscPayload.routes).reduce(
				(acc, [key, newRoute]) => {
					if (
						rscPayload !== displayedRSCPayload &&
						key in displayedRSCPayload.routes
					) {
						usedOld = true;
					}
					return Object.assign(acc, {
						[key]:
							key in displayedRSCPayload.routes
								? displayedRSCPayload.routes[key]
								: newRoute,
					});
				},
				{},
			);
		}

		return [
			createRoutingElement(newRoutes, rscPayload.match, rscPayload.found, {
				key: 0,
			}),
			usedOld,
		];
	}, [rscPayload, displayedRSCPayload]);

	React.useEffect(() => {
		if (usedOld) {
			// Start transition with totally new routes to surface when
			// actually done.
			startTransition(() => {
				setDisplayedRSCPayload(rscPayload);
			});
		}
	}, [usedOld, rscPayload]);

	return React.createElement(
		OutletContext.Provider,
		{
			value: rscPayload.routes,
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
