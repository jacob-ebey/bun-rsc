import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { type BunPlugin } from "bun";

import { resolveUseDependencies } from "./routes.ts";
import type { BundleInfo } from "./server.ts";

import { type BundlerOptions } from "./bundler.input.ts";

export async function bundle({
	browserEntry,
	browserOutdir,
	clientDependencies,
	environment,
	outdir,
	processed,
	root,
	routes,
	serverDependencies,
	serverEntry,
	serverOutdir,
	ssrEntry,
	ssrOutdir,
}: BundlerOptions) {
	function toRelative(filepath: string) {
		return path.relative(root, filepath);
	}

	const rscClientPlugin: BunPlugin = {
		name: "rsc-client",
		setup(build) {
			build.onLoad({ filter: /.*/ }, async (args) => {
				await resolveUseDependencies(
					[args.path],
					clientDependencies,
					serverDependencies,
					processed,
				);

				const serverDepExports = serverDependencies.get(args.path);
				if (serverDepExports) {
					let contents = "";

					const moduleId = path.relative(root, args.path);
					for (const [exp, name] of serverDepExports) {
						const exportId = JSON.stringify(`${moduleId}#${exp}`);
						const serverReference = `{ $$typeof: { value: Symbol.for("react.server.reference") }, $$id: { value:${exportId} } }`;

						let toExport = `function ${name}(...args) {`;
						toExport += `return window.callServer(${exportId}, args, "action");`;
						toExport += "}\n";
						toExport += `Object.defineProperties(${name}, ${serverReference})`;

						contents +=
							exp === "default"
								? `export default ${toExport};\n`
								: `export ${toExport};\n`;
					}

					return {
						contents,
						loader: "js",
					};
				}

				const contents = await readFile(args.path, "utf8");

				return { contents };
			});
		},
	};

	console.time("build ssr");
	const ssrBuild = await Bun.build({
		external: [
			"react",
			"react-dom",
			"react-dom/server.bun",
			"react-server-dom-webpack/client.edge",
			"react-server-dom-webpack/server.edge",
		],
		entrypoints: [ssrEntry, ...clientDependencies.keys()],
		target: "bun",
		format: "esm",
		sourcemap: "external",
		root,
		splitting: true,
		minify: environment === "production",
		outdir: ssrOutdir,
		define: {
			"process.env.NODE_ENV":
				environment === "production" ? `"production"` : `"development"`,
		},
		plugins: [rscClientPlugin],
	});
	console.timeEnd("build ssr");

	if (!ssrBuild.success) {
		console.error(...ssrBuild.logs);
		throw new Error("SSR build failed");
	}

	console.time("build browser");
	const browserBuild = await Bun.build({
		entrypoints: [browserEntry, ...clientDependencies.keys()],
		target: "browser",
		format: "esm",
		sourcemap: "external",
		root,
		splitting: true,
		minify: environment === "production",
		outdir: browserOutdir,
		define: {
			"process.env.NODE_ENV":
				environment === "production" ? `"production"` : `"development"`,
		},
		plugins: [rscClientPlugin],
	});
	console.timeEnd("build browser");

	if (!browserBuild.success) {
		console.error(...browserBuild.logs);
		throw new Error("Browser build failed");
	}

	console.time("build server");
	const serverBuild = await Bun.build({
		external: [
			"react",
			"react-dom",
			"react-dom/server.bun",
			"react-server-dom-webpack/client.edge",
			"react-server-dom-webpack/server.edge",
		],
		entrypoints: [
			serverEntry,
			...serverDependencies.keys(),
			...routes.values(),
		],
		target: "bun",
		format: "esm",
		sourcemap: "external",
		root,
		splitting: true,
		minify: environment === "production",
		outdir: serverOutdir,
		define: {
			"process.env.NODE_ENV":
				environment === "production" ? `"production"` : `"development"`,
		},
		plugins: [
			{
				name: "rsc-server",
				setup(build) {
					build.onLoad({ filter: /.*/ }, async (args) => {
						await resolveUseDependencies(
							[args.path],
							clientDependencies,
							serverDependencies,
							processed,
						);

						const clientDepExports = clientDependencies.get(args.path);
						if (clientDepExports) {
							let contents = "";

							const moduleId = path.relative(root, args.path);
							for (const [exp, name] of clientDepExports) {
								const exportId = JSON.stringify(`${moduleId}#${exp}`);
								const clientReference = `{ $$typeof: Symbol.for("react.client.reference"), $$id: ${exportId} }`;

								contents +=
									exp === "default"
										? `export default ${clientReference};\n`
										: `export const ${name} = ${clientReference};\n`;
							}

							return {
								contents,
								loader: "js",
							};
						}

						let contents = await readFile(args.path, "utf8");

						const serverDepExports = serverDependencies.get(args.path);
						if (serverDepExports) {
							const moduleId = path.relative(root, args.path);

							for (const [exp, name] of serverDepExports) {
								const exportId = JSON.stringify(`${moduleId}#${exp}`);
								const serverReference = `{ $$typeof: { value: Symbol.for("react.server.reference") }, $$id: { value: ${exportId} } }`;

								contents += `if (typeof ${name} === "function") {Object.defineProperties(${name}, ${serverReference});}\n`;
							}
						}

						return {
							contents,
						};
					});
				},
			},
		],
	});
	console.timeEnd("build server");

	if (!serverBuild.success) {
		console.error(...serverBuild.logs);
		throw new Error("Server build failed");
	}

	console.time("collect build info");
	let outputBrowserEntry: string | undefined;
	let outputSsrEntry: string | undefined;
	let outputServerEntry: string | undefined;

	const browserEntryWithoutExt = browserEntry.slice(
		0,
		browserEntry.lastIndexOf("."),
	);
	for (const output of browserBuild.outputs) {
		if (output.kind !== "entry-point") continue;
		const relativePath = path.relative(browserOutdir, output.path);
		const inputFile = path.resolve(root, relativePath);
		const inputFileWithoutExt = inputFile.slice(0, inputFile.lastIndexOf("."));

		if (inputFileWithoutExt === browserEntryWithoutExt) {
			outputBrowserEntry = output.path;
			break;
		}
	}

	const ssrEntryWithoutExt = ssrEntry.slice(0, ssrEntry.lastIndexOf("."));
	const routesWithoutExtensions = new Set<string>(
		Array.from(routes.values()).map((route) =>
			route.slice(0, route.lastIndexOf(".")),
		),
	);

	for (const output of ssrBuild.outputs) {
		if (output.kind !== "entry-point") continue;
		const relativePath = path.relative(ssrOutdir, output.path);
		const inputFile = path.resolve(root, relativePath);
		const inputFileWithoutExt = inputFile.slice(0, inputFile.lastIndexOf("."));

		if (inputFileWithoutExt === ssrEntryWithoutExt) {
			outputSsrEntry = output.path;
			break;
		}
	}

	const serverEntryWithoutExt = serverEntry.slice(
		0,
		serverEntry.lastIndexOf("."),
	);
	const routesOutput: Record<string, string> = {};

	for (const output of serverBuild.outputs) {
		if (output.kind !== "entry-point") continue;
		const relativePath = path.relative(serverOutdir, output.path);
		const inputFile = path.resolve(root, relativePath);
		const inputFileWithoutExt = inputFile.slice(0, inputFile.lastIndexOf("."));

		if (inputFileWithoutExt === serverEntryWithoutExt) {
			outputServerEntry = output.path;
			continue;
		}

		if (routesWithoutExtensions.has(inputFileWithoutExt)) {
			routesOutput[toRelative(inputFileWithoutExt)] = toRelative(output.path);
		}
	}
	console.timeEnd("collect build info");

	if (!outputBrowserEntry || !outputSsrEntry || !outputServerEntry) {
		throw new Error("Could not find browser, SSR, or server entrypoints");
	}

	function toRelativeDeps(deps: Map<string, [string, string][]>) {
		const relativeDeps: Record<string, [string, string][]> = {};
		for (const [depPath, theExports] of deps) {
			relativeDeps[path.relative(root, depPath)] = theExports;
		}
		return relativeDeps;
	}

	if (Array.from(routes).length !== Object.keys(routesOutput).length) {
		throw new Error("Route count mismatch");
	}

	return {
		routes: routesOutput,
		clientDependencies: toRelativeDeps(clientDependencies),
		serverDependencies: toRelativeDeps(serverDependencies),
		outputBrowserEntry: toRelative(outputBrowserEntry),
		outputSsrEntry: toRelative(outputSsrEntry),
		outputServerEntry: toRelative(outputServerEntry),
	} as BundleInfo;
}
