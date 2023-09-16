import { PassThrough, Readable } from "node:stream";
// @ts-expect-error
import { renderToPipeableStream } from "react-dom/server.node";

export function renderToReadableStream(
	element: unknown,
	options: { signal?: AbortSignal },
) {
	const signal = options.signal;

	const { pipe, abort } = renderToPipeableStream(element, options);

	const passthrough = new PassThrough({
		write(chunk, encoding, callback) {
			this.push(chunk, encoding);
			callback();
		},
	});
	pipe(passthrough);
	if (signal) {
		signal.addEventListener("abort", abort, { once: true });
	}

	return Readable.toWeb(passthrough);
}
