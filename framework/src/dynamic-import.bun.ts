export function dynamicImport(url: string): Promise<unknown> {
	return import(url);
}
