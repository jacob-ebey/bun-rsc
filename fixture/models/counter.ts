import { cache } from "react";

export const counterObj = { count: 0 };

export const counter = cache(async () => {
	return { count: counterObj.count };
});
