import * as React from "react";

import { type Location } from "./router.ts";
import { OutletContext } from "./router.context.ts";

export { ClientRouter } from "./router.client.ts";

export function useLocation(): Location {
	const c = React.useContext(OutletContext);
	if (!c) {
		throw new Error("Missing context");
	}

	return c.location;
}

export function useInvalidate() {
	const location = useLocation();
	const [invalidationPromise, setInvalidationPromise] = React.useState<
		Promise<void> | undefined
	>();

	if (invalidationPromise) {
		React.use(invalidationPromise);
	}

	return async (invalidate: string) => {
		const promise = new Promise<void>((resolve, reject) =>
			Promise.resolve(invalidateCache(invalidate)).then(() =>
				window.callServer(
					location.pathname + location.search,
					[location.pathname, false],
					"navigation",
				),
			),
		);
		React.startTransition(() => {
			setInvalidationPromise(promise);
		});
		return promise;
	};
}

export type Navigation =
	| {
			state: "idle";
	  }
	| {
			state: "transitioning";
			location: Location;
			args?: unknown[];
			url?: URL;
	  };

export function useNavigation(): Navigation {
	const c = React.useContext(OutletContext);
	if (!c) {
		throw new Error("Missing context");
	}

	return c.navigation;
}

export type Asyncify<T> = T extends (...args: infer A) => infer R
	? (...args: A) => Promise<R>
	: never;

export type Parameters<T> = T extends (...args: infer A) => unknown ? A : never;

