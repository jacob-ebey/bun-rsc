import pkg from "./package.json";

const buildResult = await Bun.build({
	entrypoints: [
		"./framework/bundler.ts",
		"./framework/bundler.node.ts",
		"./framework/dynamic-import.node.ts",
		"./framework/react-dom-server.node.ts",
		"./framework/react-server-dom-client.node.ts",
		"./framework/react-server-dom-server.node.ts",
		"./framework/resolve.node.ts",
		"./framework/server.ts",
	],
	format: "esm",
	target: "node",
	splitting: true,
	external: [
		...Object.keys(pkg.dependencies),
		"#bundler-implementation",
		"#dynamic-import-implementation",
		"#react-dom-server-implementation",
		"#react-server-dom-client-implementation",
		"#react-server-dom-server-implementation",
		"#resolver-implementation",
	],
	outdir: "./build/node",
});

if (!buildResult.success) {
	console.error(...buildResult.logs);
	console.error("Build failed");
	process.exit(1);
} else {
	console.log("Build succeeded");
}
