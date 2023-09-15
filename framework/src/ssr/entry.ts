import * as React from "react";
// @ts-ignore
import * as ReactDOM from "#react-dom-server-implementation";
// @ts-ignore
import * as ReactDOMClient from "#react-server-dom-client-implementation";

async function RecursiveRSCRenderer({
	decoder,
	reader,
}: {
	decoder: TextDecoder;
	reader: ReadableStreamDefaultReader<Uint8Array>;
}): Promise<React.ReactElement> {
	const result = await reader.read();
	const chunk = result.value;
	const chunkString = decoder.decode(chunk, { stream: true });
	const script = React.createElement("script", {
		// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
		dangerouslySetInnerHTML: {
			// TODO: encode the chunk
			__html: ` __RSC_CHUNK__(${JSON.stringify(chunkString)});`,
		},
	});
	if (result.done) {
		return React.createElement(
			React.Fragment,
			{},
			script,
			React.createElement("script", {
				// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
				dangerouslySetInnerHTML: {
					__html: "__RSC_CONTROLLER__.close();",
				},
			}),
		);
	}
	return React.createElement(
		React.Fragment,
		{},
		script,
		React.createElement(
			React.Suspense,
			{},
			React.createElement(RecursiveRSCRenderer, { decoder, reader }),
		),
	);
}

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

	const htmlStream = await ReactDOM.renderToReadableStream(
		React.createElement(
			React.Fragment,
			{},
			element,
			React.createElement("script", {
				// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
				dangerouslySetInnerHTML: {
					__html:
						"window.__RSC_STREAM__ = new ReadableStream({" +
						"start(controller) {" +
						"window.__RSC_CONTROLLER__ = controller;" +
						"const encoder = new TextEncoder();" +
						"window.__RSC_CHUNK__ = (c) => {" +
						"controller.enqueue(encoder.encode(c));" +
						"};" +
						"}});",
				},
			}),
			React.createElement("script", {
				async: true,
				type: "module",
				src: browserEntry,
			}),
			React.createElement(
				React.Suspense,
				{},
				React.createElement(RecursiveRSCRenderer, {
					reader: rscStreamB.getReader(),
					decoder: new TextDecoder(),
				}),
			),
		),
		{
			onError: console.error,
			signal: request.signal,
		},
	);

	return new Response(htmlStream, {
		headers: {
			"Content-Type": "text/html",
			"Transfer-Encoding": "chunked",
		},
	});
}
