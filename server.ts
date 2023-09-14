import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { etag } from "hono/etag";

import { bundle, discoverRoutes } from "./framework/bundler";
import { createHandler } from "./framework/server";

console.time("startup");
const routes = await discoverRoutes(import.meta.url, "app");
const bundleInfo = await bundle(import.meta.url, routes);
const handler = createHandler(import.meta.url, bundleInfo);

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
	serveStatic(),
);
app.use("*", (c) => {
	return handler(c.req.raw);
});

const server = Bun.serve({
	port: 3000,
	fetch: (request) => {
		return app.fetch(request);
	},
});

console.log(`Server running at http://${server.hostname}:${server.port}`);
console.timeEnd("startup");
