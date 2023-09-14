import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { etag } from "hono/etag";

import { bundle, discoverRoutes } from "./build/node/bundler.js";
import { createHandler } from "./build/node/server.js";

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

serve(
	{
		port: 3000,
		fetch: app.fetch,
	},
	(info) => {
		console.log(`Server running at http://${info.address}:${info.port}`);
		console.timeEnd("startup");
	},
);
