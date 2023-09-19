import * as React from "react";

import * as crypto from "./crypto.ts";
import { getRequestContext } from "./framework-internal.ts";
import { DangerousScript } from "./router.client.ts";

export type { ThisAction } from "./framework-types.ts";

export { crypto };

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AwaitedReturnResult<T> = T extends (...args: any[]) => infer R
	? Awaited<R>
	: never;

export function getFormAction<A>(
	action: A,
):
	| { ran: true; result: AwaitedReturnResult<A> }
	| { ran: false; result: undefined } {
	const c = getRequestContext();
	if (c.type === "uninitialized") {
		throw new Error("Missing request context");
	}

	const formAction = action as undefined | { $$id: string };
	if (!formAction?.$$id) {
		throw new Error("Invalid action");
	}

	if (c.action?.id === formAction.$$id) {
		if ("error" in c.action) {
			throw c.action.error;
		}
		return { ran: true, result: c.action.result as AwaitedReturnResult<A> };
	}

	return { ran: false, result: undefined };
}

export function getHeaders(): Headers {
	const c = getRequestContext();
	if (c.type === "uninitialized") {
		throw new Error("Missing request context");
	}

	return new Headers(c.headers);
}

export function getURL() {
	const c = getRequestContext();
	if (c.type === "uninitialized") {
		throw new Error("Missing request context");
	}

	return c.url;
}

const redirectSymbol = Symbol("framework.redirect");

export type FrameworkRedirect = React.ReactElement & {
	__framework_redirect?: typeof redirectSymbol;
};

export function isRedirect(element: unknown): element is FrameworkRedirect {
	return React.isValidElement(element) && element.type === DangerousScript;
}

export function throwRedirect(
	to: string,
	statusCodeOrInit: number | ResponseInit = 302,
): never {
	const c = getRequestContext();

	const status = typeof statusCodeOrInit === "number" ? statusCodeOrInit : 302;
	const init =
		typeof statusCodeOrInit === "object" && statusCodeOrInit
			? statusCodeOrInit
			: {};
	const headers = new Headers(init.headers ? init.headers : {});
	headers.set("Location", to);

	const response = new Response("", {
		status,
		...init,
		headers,
	});

	if (c.type === "uninitialized") {
		throw response;
	}

	c.onResponse(response);

	// TODO: Allow external redirects
	return React.createElement(DangerousScript, {
		content: `if (window.callServer){window.callServer(${JSON.stringify(
			to,
		)}, [location.pathname, false], "navigation");window.history.replaceState({redirect:true}, '', ${JSON.stringify(
			to,
		)});} else window.location.href = ${JSON.stringify(to)};`,
	}) as never;
}
