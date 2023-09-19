function base64ToArrayBuffer(base64: string) {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

export function handler(request: Request) {
	switch (request.method) {
		case "GET": {
			const image = base64ToArrayBuffer(
				"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
			);
			return new Response(image, {
				status: 200,
				headers: {
					"Cache-Control": "public, max-age=31536000",
					"Content-Type": "image/gif",
				},
			});
		}
		default:
			return new Response("Method not allowed", { status: 405 });
	}
}
