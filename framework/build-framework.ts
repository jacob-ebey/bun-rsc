import pkg from "./package.json";

const buildResult = await Bun.build({
	entrypoints: [
		"./src/bundler.ts",
		"./src/bundler.node.ts",
		"./src/dynamic-import.node.ts",
		"./src/framework.ts",
		"./src/react-dom-server.node.ts",
		"./src/react-server-dom-client.node.ts",
		"./src/react-server-dom-server.node.ts",
		"./src/resolve.node.ts",
		"./src/server.ts",
	],
	format: "esm",
	target: "node",
	splitting: true,
	external: [
		...Object.keys(pkg.dependencies),
		...Object.keys(pkg.imports),
		"framework",
		"framework/router",
		"framework/client",
	],
	outdir: "./dist/node",
});

if (!buildResult.success) {
	console.error(...buildResult.logs);
	console.error("Build failed");
	process.exit(1);
} else {
	console.log("Build succeeded");
}
