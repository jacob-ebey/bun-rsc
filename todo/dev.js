import { spawn } from "node:child_process";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { bundle, discoverRoutes } from "framework/bundler";
import { createHandler, createDevMiddleware } from "framework/server";

import { createApp } from "./server.js";

process.env.NODE_ENV = "development";

console.time("startup");

console.time("build:css");
const buildCss = spawn("bun", ["build:css"], { stdio: "inherit" });
await new Promise((resolve, reject) => {
	buildCss.on("exit", (code) => {
		if (code === 0) {
			resolve();
		} else {
			reject(new Error("Failed to build CSS"));
		}
	});
});
console.timeEnd("build:css");

const routes = await discoverRoutes(import.meta.url, "app");
const bundleInfo = await bundle(import.meta.url, routes, "development");
const handler = createHandler(import.meta.url, bundleInfo);

const devMiddleware = createDevMiddleware("/_hmr");

const app = createApp(handler, serveStatic(), (app) => {
	app.get("/_hmr", (c) => {
		return devMiddleware.hmr(c.req.raw);
	});
	app.use("*", async (c, next) => {
		await next();
		if (c.res.headers.get("Content-Type")?.match(/text\/html/)) {
			c.res = devMiddleware.html(c.res);
		}
	});
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
