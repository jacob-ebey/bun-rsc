import * as React from "react";

import { type Location } from "./router.ts";
import { OutletContext } from "./router.context.ts";

export { ClientRouter } from "./router.client.ts";

export function useInvalidate() {
	return async (invalidate: string) => {
		invalidateCache(invalidate);
		await callServer(location.href, [location.pathname, false], "navigation");
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

export function useLocation(): Location {
	const c = React.useContext(OutletContext);
	if (!c) {
		throw new Error("Missing context");
	}

	return c.location;
}
