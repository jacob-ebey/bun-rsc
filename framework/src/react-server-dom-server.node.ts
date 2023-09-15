import { PassThrough, Readable } from "node:stream";
// @ts-expect-error
import { renderToPipeableStream } from "react-server-dom-webpack/server.node";

export {
	decodeReply, // @ts-expect-error
} from "react-server-dom-webpack/server.node";

export function renderToReadableStream(
	element: unknown,
	clientManifest: unknown,
	options: { signal?: AbortSignal },
) {
	const signal = options.signal;

	const { pipe, abort } = renderToPipeableStream(
		element,
		clientManifest,
		options,
	);

	const passthrough = new PassThrough();
	pipe(passthrough);
	if (signal) {
		signal.addEventListener("abort", abort, { once: true });
	}

	return Readable.toWeb(passthrough);
}
