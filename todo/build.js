import { spawn } from "node:child_process";
import { bundle, discoverRoutes } from "framework/bundler";

console.time("build");

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
await bundle(import.meta.url, routes, "production");

console.timeEnd("build");
