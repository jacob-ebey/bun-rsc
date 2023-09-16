import * as React from "react";

import type { Location } from "./router.ts";
import type { Navigation } from "./framework.client.ts";

export const OutletContext = React.createContext<
	| {
			location: Location;
			outlets: Record<string, React.ReactNode>;
			navigation: Navigation;
	  }
	| undefined
>(undefined);
