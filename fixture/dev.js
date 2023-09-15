import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { bundle, discoverRoutes } from "framework/bundler";
import { createHandler } from "framework/server";

import { createApp } from "./server.js";

console.time("startup");

const routes = await discoverRoutes(import.meta.url, "app");
const bundleInfo = await bundle(import.meta.url, routes, "development");
const handler = createHandler(import.meta.url, bundleInfo);

const app = createApp(handler, serveStatic());

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
