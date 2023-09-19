import { Hono } from "hono";
import { etag } from "hono/etag";

/**
 *
 * @param {(response: Response) => Promise<Response>} handler
 * @param {import("hono").MiddlewareHandler} staticHandler
 * @param {((app: import("hono").Hono) => void)[]} beforeMiddlewares
 */
export function createApp(handler, staticHandler, ...beforeMiddlewares) {
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

	for (const middleware of beforeMiddlewares) {
		middleware(app);
	}

	const honoAppHandler = (c) => handler(c.req.raw);
	app.get("*", honoAppHandler);
	app.post("*", honoAppHandler);

	return app;
}
