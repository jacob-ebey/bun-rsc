import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveUseDependencies } from "./routes.ts";
import type { BundleInfo } from "./server.ts";

import * as builderImplementation from "#bundler-implementation";

export { discoverRoutes } from "./routes.ts";

export async function bundle(
	importURL: string,
	routes: Map<string, string>,
	environment: "development" | "production" = "development",
): Promise<BundleInfo> {
	const clientDependencies = new Map<string, [string, string][]>();
	const serverDependencies = new Map<string, [string, string][]>();
	const processed = new Set<string>();

	const root = path.dirname(fileURLToPath(importURL));
	const outdir = path.join(root, "dist");
	const browserEntry = path.join(root, "framework", "browser", "entry.ts");
	const browserOutdir = path.join(outdir, "browser");
	const ssrEntry = path.join(root, "framework", "ssr", "entry.ts");
	const ssrOutdir = path.join(outdir, "ssr");
	const serverEntry = path.join(root, "framework", "server", "entry.ts");
	const serverOutdir = path.join(outdir, "server");

	console.time("walk routes for directives");
	await resolveUseDependencies(
		[serverEntry, ...routes.values()],
		clientDependencies,
		serverDependencies,
		processed,
	);
	console.timeEnd("walk routes for directives");

	const bundleInfo = await builderImplementation.bundle({
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
	});

	await writeFile(
		path.join(outdir, "bundle-info.json"),
		JSON.stringify(bundleInfo, null, 2),
		"utf8",
	);

	return bundleInfo;
}
