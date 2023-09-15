export function dynamicImport(url: string): Promise<unknown> {
	let toImport = url.replace(/\.[tj]sx?$/, ".js");
	if (!toImport.endsWith(".js")) {
		toImport += ".js";
	}
	return import(toImport);
}
