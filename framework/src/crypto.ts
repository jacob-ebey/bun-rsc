export async function sign(value: string, secret: string) {
	const key = await createKey(secret, ["sign"]);
	const data = new TextEncoder().encode(value);
	const signature = await crypto.subtle.sign("HMAC", key, data);
	const hash = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(
		/=+$/,
		"",
	);

	return `${value}.${hash}`;
}

export async function unsign(signed: string, secret: string) {
	const index = signed.lastIndexOf(".");
	const value = signed.slice(0, index);
	const hash = signed.slice(index + 1);

	const key = await createKey(secret, ["verify"]);
	const data = new TextEncoder().encode(value);
	const signature = byteStringToUint8Array(atob(hash));
	const valid = await crypto.subtle.verify("HMAC", key, signature, data);

	return valid ? value : false;
}

async function createKey(
	secret: string,
	usages: CryptoKey["usages"],
): Promise<CryptoKey> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		usages,
	);

	return key;
}

function byteStringToUint8Array(byteString: string): Uint8Array {
	const array = new Uint8Array(byteString.length);

	for (let i = 0; i < byteString.length; i++) {
		array[i] = byteString.charCodeAt(i);
	}

	return array;
}
