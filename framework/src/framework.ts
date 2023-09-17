import { getRequestContext } from "./framework-internal.ts";

export function getURL() {
	const c = getRequestContext();
	if (c.type === "uninitialized") {
		throw new Error("Missing request context");
	}

	return c.url;
}

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
		return { ran: true, result: c.action.result as AwaitedReturnResult<A> };
	}

	return { ran: false, result: undefined };
}
