import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createHandler } from "framework/server";

import { createApp } from "./server.js";

import bundleInfo from "./dist/bundle-info.json" assert { type: "json" };

console.time("startup");

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
