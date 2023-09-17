import * as React from "react";

export type FormAction = {
	id: string;
	formData: FormData;
} & (
	| {
			result: unknown;
	  }
	| {
			error: unknown;
	  }
);

export interface RequestContext {
	type: "initialized";
	action?: FormAction;
	headers: Headers;
	url: URL;
	onResponse(response: Response): void;
}

export const getRequestContext = React.cache<
	() => RequestContext | { type: "uninitialized" }
>(() => ({ type: "uninitialized" }));
