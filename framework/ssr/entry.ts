import * as React from "react";
import * as ReactDOM from "#react-dom-server-implementation";
import * as ReactDOMClient from "#react-server-dom-client-implementation";

export async function fetch(
	request: Request,
	{
		browserEntry,
		rscResponse,
	}: { browserEntry: string; rscResponse: Response },
): Promise<Response> {
	if (!rscResponse.body) throw new Error("No RSC response body.");

	const [rscStreamA, rscStreamB] = rscResponse.body.tee();

	const element = ReactDOMClient.createFromReadableStream(rscStreamA);

	const ssrStream = await ReactDOM.renderToReadableStream(element, {
		onError: console.error,
		signal: request.signal,
		bootstrapModules: [browserEntry],
		bootstrapScriptContent:
			"window.__RSC_STREAM__ = new ReadableStream({" +
			"start(controller) {" +
			"window.__RSC_CONTROLLER__ = controller;" +
			"const encoder = new TextEncoder();" +
			"window.__RSC_CHUNK__ = (c) => {" +
			"controller.enqueue(encoder.encode(c));" +
			"};" +
			"}});",
	});

	const htmlStream = new SSRTransformStream(rscStreamB);

	ssrStream.pipeThrough(htmlStream);

	return new Response(htmlStream.readable, {
		headers: {
			"Content-Type": "text/html",
		},
	});
}

class SSRTransformStream extends TransformStream<Uint8Array, Uint8Array> {
	constructor(rscStream: ReadableStream<Uint8Array>) {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();

		const reader = rscStream.getReader();
		let buffer = "";
		const readRSCStreamPromise = (async () => {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value);
			}
		})();
		readRSCStreamPromise.catch(() => {});

		const writeRSCChunkToHTML = (
			controller: TransformStreamDefaultController<Uint8Array>,
		) => {
			if (buffer) {
				controller.enqueue(
					encoder.encode(
						`<script>__RSC_CHUNK__(${JSON.stringify(buffer)});</script>`,
					),
				);
				buffer = "";
			}
		};

		super({
			transform(chunk, controller) {
				controller.enqueue(chunk);
				if (chunk.at(-1) === 62) {
					writeRSCChunkToHTML(controller);
				}
			},
			async flush(controller) {
				await readRSCStreamPromise;
				writeRSCChunkToHTML(controller);
				controller.enqueue(
					encoder.encode("<script>__RSC_CONTROLLER__.close();</script>"),
				);
			},
		});
	}
}
