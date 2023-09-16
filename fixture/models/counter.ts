import { cache } from "react";

export const counterObj = { count: 0 };

export const counter = cache(async () => {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return { count: counterObj.count };
});
