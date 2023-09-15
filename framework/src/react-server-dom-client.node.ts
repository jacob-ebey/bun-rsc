import { Readable } from "node:stream";
// @ts-expect-error
import { createFromNodeStream } from "react-server-dom-webpack/client.node";

export function createFromReadableStream(stream: ReadableStream<Uint8Array>) {
	const readable = Readable.fromWeb(stream);
	return createFromNodeStream(readable);
}
