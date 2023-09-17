import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAsync } from "@oxidation-compiler/napi";

// @ts-ignore
import * as resolver from "#resolver-implementation";

export async function discoverRoutes(importURL: string, appDir: string) {
	const importDir = path.dirname(fileURLToPath(importURL));
	const appDirPath = path.join(importDir, appDir);

	const routes = new Map<string, string>();
	await discoverRoutesRecursive(appDirPath, appDirPath, routes);

	return routes;
}

const routeRegex = /(layout|loading|not\-found|page|problem|route)\.[tj]sx?$/;
const routeFileExtensions = [".js", ".ts", ".jsx", ".tsx"];
async function discoverRoutesRecursive(
	dir: string,
	appDirPath: string,
	routes: Map<string, string>,
	base = dir,
) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			await discoverRoutesRecursive(
				path.join(dir, entry.name),
				appDirPath,
				routes,
				base,
			);
		} else if (entry.isFile() && routeRegex.test(entry.name)) {
			const ext = path.extname(entry.name);
			if (!routeFileExtensions.includes(ext)) {
				continue;
			}

			const fullPath = path.join(dir, entry.name);
			const pathWithoutExt = path
				.relative(base, fullPath)
				.slice(0, -ext.length);
			if (routes.has(pathWithoutExt)) {
				throw new Error(`Duplicate route: ${pathWithoutExt}`);
			}

			const routeId = pathWithoutExt;

			routes.set(routeId, fullPath);
		}
	}
}

export async function resolveUseDependencies(
	routes: Set<string> | string[],
	clientDependencies: Map<string, [string, string][]>,
	serverDependencies: Map<string, [string, string][]>,
	processed: Set<string>,
) {
	for (const route of routes) {
		if (processed.has(route)) {
			continue;
		}
		processed.add(route);

		const contents = await readFile(route, "utf8");
		const ast = await parseAsync(contents, { sourceFilename: route });
		const isClientModule = ast.program.includes(`"directive":"use client"`);
		const isServerModule = ast.program.includes(`"directive":"use server"`);

		if (isClientModule && isServerModule) {
			throw new Error(`Module ${route} cannot be both client and server`);
		}

		const imports: Set<string> = new Set();
		const theExports: [string, string][] = [];
		const program = JSON.parse(ast.program);
		for (const node of program.body) {
			switch (node.type) {
				case "ExportNamedDeclaration":
				case "ExportDefaultDeclaration":
					if (isClientModule || isServerModule) {
						if (Array.isArray(node.specifiers)) {
							for (const specifier of node.specifiers) {
								theExports.push([
									specifier.exported.name,
									specifier.local.name,
								]);
							}
						}

						if (!node.declaration) {
							continue;
						}

						// TODO: Support `export const abc = () => {};`
						if (node.declaration?.type !== "FunctionDeclaration") {
							throw new Error(
								`Only function declarations are allowed to be exported from ${route} when using "use server" or "use client"`,
							);
						}

						if (!node.declaration.id?.name) {
							throw new Error(
								`Exported function declarations must have a name in ${route} when using "use server" or "use client"`,
							);
						}
						theExports.push([
							node.type === "ExportDefaultDeclaration"
								? "default"
								: node.declaration.id.name,
							node.declaration.id.name,
						]);
					}
					break;
				case "ImportDeclaration":
					if (node?.source?.value) {
						imports.add(node.source.value);
					}
					break;
				default:
					break;
			}
		}

		// imports = transpiler.scanImports(contents);
		const toSet =
			isClientModule || isServerModule
				? isClientModule
					? clientDependencies
					: serverDependencies
				: null;
		if (toSet) toSet.set(route, theExports);

		const resolvedImports: string[] = [];

		for (const imp of imports) {
			const resolvedImport = await resolver.resolve(imp, route);
			if (!resolvedImport) continue;
			if (resolvedImport.startsWith("file://")) {
				resolvedImports.push(fileURLToPath(resolvedImport));
			} else {
				resolvedImports.push(resolvedImport);
			}
		}

		if (resolvedImports.length > 0) {
			await resolveUseDependencies(
				resolvedImports,
				clientDependencies,
				serverDependencies,
				processed,
			);
		}
	}
}
