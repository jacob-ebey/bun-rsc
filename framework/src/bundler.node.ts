import { readFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import * as esbuild from "esbuild";

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
	await mkdir(outdir, { recursive: true });

	function toRelative(filepath: string) {
		return path.relative(root, filepath);
	}

	const rscClientPlugin: esbuild.Plugin = {
		name: "rsc-client",
		setup(build) {
			let dots = ".";
			for (const clientDependency of clientDependencies.keys()) {
				const newDots =
					path
						.relative(root, clientDependency)
						.match(/^(\.\.[\/\\])+/g)?.[0]
						.slice(0, -1) ?? ".";
				if (newDots.length > dots.length) {
					dots = newDots;
				}
			}
			for (const serverDependency of serverDependencies.keys()) {
				const newDots =
					path
						.relative(root, serverDependency)
						.match(/^(\.\.[\/\\])+/g)?.[0]
						.slice(0, -1) ?? ".";
				if (newDots.length > dots.length) {
					dots = newDots;
				}
			}
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

					const relative = path.relative(path.resolve(root, dots), args.path);
					const moduleId = relative.replace(/^(\.\.[\/\\])+/, "");
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

				return {
					contents,
					loader: args.path.slice(
						args.path.lastIndexOf(".") + 1,
					) as esbuild.Loader,
				};
			});
		},
	};

	console.time("build ssr");
	const ssrBuild = await esbuild.build({
		bundle: true,
		write: true,
		external: [
			"react",
			"react-dom",
			"react-dom/server.node",
			"react-server-dom-webpack/client.node",
			"react-server-dom-webpack/server.node",
		],
		entryPoints: [ssrEntry, ...clientDependencies.keys()],
		target: "node18",
		platform: "node",
		format: "esm",
		sourcemap: "external",
		absWorkingDir: root,
		splitting: true,
		minify: environment === "production",
		outdir: ssrOutdir,
		define: {
			"process.env.NODE_ENV":
				environment === "production" ? `"production"` : `"development"`,
		},
		metafile: true,
		jsx: "automatic",
		plugins: [rscClientPlugin],
	});
	console.timeEnd("build ssr");

	if (ssrBuild.errors.length > 0) {
		console.error(
			await esbuild.formatMessages(ssrBuild.errors, {
				kind: "error",
				color: true,
			}),
		);
		throw new Error("SSR build failed");
	}

	console.time("build browser");
	const browserBuild = await esbuild.build({
		bundle: true,
		write: true,
		entryPoints: [browserEntry, ...clientDependencies.keys()],
		target: "es2021",
		platform: "browser",
		format: "esm",
		sourcemap: "external",
		absWorkingDir: root,
		splitting: true,
		minify: environment === "production",
		outdir: browserOutdir,
		define: {
			"process.env.NODE_ENV":
				environment === "production" ? `"production"` : `"development"`,
		},
		metafile: true,
		jsx: "automatic",
		plugins: [rscClientPlugin],
	});
	console.timeEnd("build browser");

	if (browserBuild.errors.length > 0) {
		console.error(
			await esbuild.formatMessages(browserBuild.errors, {
				kind: "error",
				color: true,
			}),
		);
		throw new Error("Browser build failed");
	}

	console.time("build server");
	const serverBuild = await esbuild.build({
		bundle: true,
		write: true,
		external: [
			"react",
			"react-dom",
			"react-dom/server.node",
			"react-server-dom-webpack/client.node",
			"react-server-dom-webpack/server.node",
		],
		entryPoints: [
			serverEntry,
			...serverDependencies.keys(),
			...routes.values(),
		],
		target: "node18",
		platform: "node",
		format: "esm",
		sourcemap: "external",
		absWorkingDir: root,
		splitting: true,
		minify: environment === "production",
		outdir: serverOutdir,
		define: {
			"process.env.NODE_ENV":
				environment === "production" ? `"production"` : `"development"`,
		},
		metafile: true,
		jsx: "automatic",
		plugins: [
			{
				name: "rsc-server",
				setup(build) {
					let dots = ".";
					for (const clientDependency of clientDependencies.keys()) {
						const newDots =
							path
								.relative(root, clientDependency)
								.match(/^(\.\.[\/\\])+/g)?.[0]
								.slice(0, -1) ?? ".";
						if (newDots.length > dots.length) {
							dots = newDots;
						}
					}
					for (const serverDependency of serverDependencies.keys()) {
						const newDots =
							path
								.relative(root, serverDependency)
								.match(/^(\.\.[\/\\])+/g)?.[0]
								.slice(0, -1) ?? ".";
						if (newDots.length > dots.length) {
							dots = newDots;
						}
					}
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

							const relative = path.relative(
								path.resolve(root, dots),
								args.path,
							);
							const moduleId = relative.replace(/^(\.\.[\/\\])+/, "");
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
							const relative = path.relative(
								path.resolve(root, dots),
								args.path,
							);
							const moduleId = relative.replace(/^(\.\.[\/\\])+/, "");

							for (const [exp, name] of serverDepExports) {
								const exportId = JSON.stringify(`${moduleId}#${exp}`);
								const serverReference = `{ $$typeof: { value: Symbol.for("react.server.reference") }, $$id: { value: ${exportId} } }`;

								contents += `if (typeof ${name} === "function") {Object.defineProperties(${name}, ${serverReference});}\n`;
							}
						}

						return {
							contents,
							loader: args.path.slice(
								args.path.lastIndexOf(".") + 1,
							) as esbuild.Loader,
						};
					});
				},
			},
		],
	});
	console.timeEnd("build server");

	if (serverBuild.errors.length > 0) {
		console.error(
			await esbuild.formatMessages(serverBuild.errors, {
				kind: "error",
				color: true,
			}),
		);
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

	for (const [outputPath, output] of Object.entries(
		browserBuild.metafile.outputs,
	)) {
		if (!output.entryPoint) continue;
		const inputFile = path.resolve(root, output.entryPoint);
		const inputFileWithoutExt = inputFile.slice(0, inputFile.lastIndexOf("."));

		if (inputFileWithoutExt === browserEntryWithoutExt) {
			outputBrowserEntry = outputPath;
			break;
		}
	}

	const ssrEntryWithoutExt = ssrEntry.slice(0, ssrEntry.lastIndexOf("."));
	const routesWithoutExtensions = new Set<string>(
		Array.from(routes.values()).map((route) =>
			route.slice(0, route.lastIndexOf(".")),
		),
	);

	for (const [outputPath, output] of Object.entries(
		ssrBuild.metafile.outputs,
	)) {
		if (!output.entryPoint) continue;
		const inputFile = path.resolve(root, output.entryPoint);
		const inputFileWithoutExt = inputFile.slice(0, inputFile.lastIndexOf("."));

		if (inputFileWithoutExt === ssrEntryWithoutExt) {
			outputSsrEntry = outputPath;
			break;
		}
	}

	const serverEntryWithoutExt = serverEntry.slice(
		0,
		serverEntry.lastIndexOf("."),
	);
	const routesOutput: Record<string, string> = {};

	for (const [outputPath, output] of Object.entries(
		serverBuild.metafile.outputs,
	)) {
		if (!output.entryPoint) continue;
		const inputFile = path.resolve(root, output.entryPoint);
		const inputFileWithoutExt = inputFile.slice(0, inputFile.lastIndexOf("."));

		if (inputFileWithoutExt === serverEntryWithoutExt) {
			outputServerEntry = outputPath;
			continue;
		}

		if (routesWithoutExtensions.has(inputFileWithoutExt)) {
			routesOutput[toRelative(inputFileWithoutExt)] = toRelative(outputPath);
		}
	}
	console.timeEnd("collect build info");

	if (!outputBrowserEntry || !outputSsrEntry || !outputServerEntry) {
		console.log({
			outputBrowserEntry,
			outputSsrEntry,
			outputServerEntry,
		});
		throw new Error("Could not find browser, SSR, or server entrypoints");
	}

	function toRelativeDeps(deps: Map<string, [string, string][]>) {
		let dots = ".";
		for (const dep of deps) {
			const newDots =
				path
					.relative(root, dep[0])
					.match(/^(\.\.[\/\\])+/g)?.[0]
					.slice(0, -1) ?? ".";
			if (newDots.length > dots.length) {
				dots = newDots;
			}
		}
		const relativeDeps: Record<string, [string, string][]> = {};
		for (const [depPath, theExports] of deps) {
			const relative = path.relative(path.resolve(root, dots), depPath);
			const rel = relative.replace(/^(\.\.[\/\\])+/, "");
			relativeDeps[rel] = theExports;
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
