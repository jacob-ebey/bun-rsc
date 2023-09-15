import * as path from "node:path";
import { builtinModules, createRequire } from "node:module";

import er from "enhanced-resolve";

const require = createRequire(import.meta.url);

const resolver = er.ResolverFactory.createResolver({
	fileSystem: new er.CachedInputFileSystem(require("fs"), 4000),
	extensions: [".js", ".ts", ".jsx", ".tsx"],
});

export async function resolve(
	id: string,
	parent: string,
): Promise<string | false> {
	return new Promise<string | false>((resolve, reject) => {
		if (
			id.startsWith("node:") ||
			id.startsWith("#") ||
			builtinModules.includes(id)
		) {
			return resolve(false);
		}
		resolver.resolve({}, path.dirname(parent), id, {}, (err, res) => {
			if (err) reject(err);
			else if (!res) reject(new Error(`Could not resolve ${id}`));
			else resolve(res);
		});
	}).catch(() => {
		return require.resolve(id, { paths: [path.dirname(parent)] });
	});
}
