import { Hono } from "hono";
import { etag } from "hono/etag";

/**
 *
 * @param {(response: Response) => Promise<Response>} handler
 * @param {import("hono").MiddlewareHandler} staticHandler
 */
export function createApp(handler, staticHandler) {
	const app = new Hono();
	app.get(
		"/dist/browser/*",
		etag(),
		async (c, next) => {
			await next();
			if (c.res.status === 200) {
				c.res.headers.set("Cache-Control", "public, max-age=31536000");
			}
		},
		staticHandler,
	);

	app.get(
		"/static/*",
		etag(),
		async (c, next) => {
			await next();
			if (c.res.status === 200) {
				c.res.headers.set("Cache-Control", "public, max-age=300");
			}
		},
		staticHandler,
	);

	const honoAppHandler = (c) => handler(c.req.raw);
	app.get("*", honoAppHandler);
	app.post("*", honoAppHandler);

	return app;
}
