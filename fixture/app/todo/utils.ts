const warnings = new Set();
function warnOnce(warning: string) {
	if (!warnings.has(warning)) {
		warnings.add(warning);
		console.warn(warning);
	}
}
export function getSecret(secret: string, developmentSecret?: string): string {
	const result = process.env[secret];
	if (!result && developmentSecret) {
		warnOnce(`Using development secret: ${secret}`);
		return developmentSecret;
	}
	if (!result) {
		throw new Error(`Missing secret: ${secret}`);
	}
	return result;
}
