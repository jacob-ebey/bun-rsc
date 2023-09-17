import * as React from "react";

export interface FormAction {
	id: string;
	formData: FormData;
	result: unknown;
}

export interface RequestContext {
	type: "initialized";
	action?: FormAction;
	url: URL;
}

export const getRequestContext = React.cache<
	() => RequestContext | { type: "uninitialized" }
>(() => ({ type: "uninitialized" }));
