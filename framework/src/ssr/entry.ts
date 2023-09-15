import * as React from "react";
// @ts-ignore
import * as ReactDOM from "#react-dom-server-implementation";
// @ts-ignore
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
	await new Promise((resolve) => setTimeout(resolve, 0));
	const script = React.createElement("script", {
		// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
		dangerouslySetInnerHTML: {
			// TODO: encode the chunk
			__html: ` __RSC_CHUNK__(${sanitize(JSON.stringify(chunkString))});`,
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

// Taken from https://github.com/cyco130/vite-rsc/blob/2e3d0ad9915e57c4b2eaa3ea24b46c1b477a4cce/packages/fully-react/src/server/htmlescape.ts#L25C1-L38C2
const TERMINATORS_LOOKUP: Record<string, string> = {
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

const TERMINATORS_REGEX = /[\u2028\u2029]/g;

function sanitizer(match: string | number) {
	return TERMINATORS_LOOKUP[match];
}

export function sanitize(str: string) {
	return str.replace(TERMINATORS_REGEX, sanitizer);
}
