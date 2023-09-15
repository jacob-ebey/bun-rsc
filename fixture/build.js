import { bundle, discoverRoutes } from "framework/bundler";

console.time("build");

const routes = await discoverRoutes(import.meta.url, "app");
await bundle(import.meta.url, routes, "production");

console.timeEnd("build");
