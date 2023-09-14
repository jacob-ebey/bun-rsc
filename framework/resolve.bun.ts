import * as path from "node:path";

export async function resolve(
	id: string,
	parent: string,
): Promise<string | false> {
	if (id.startsWith("node:")) return false;
	return Bun.resolve(id, path.dirname(parent));
}
