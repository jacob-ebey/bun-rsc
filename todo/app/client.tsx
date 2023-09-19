/// <reference lib="dom" />

"use client";

import * as React from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";

export function Pending({
	children,
	pending,
}: {
	children: React.ReactNode;
	pending: React.ReactNode;
}) {
	const status = useFormStatus();
	return status.pending ? pending : children;
}

export function EnhancedForm({
	submitOnChanged,
	...props
}: React.HTMLProps<HTMLFormElement> & {
	submitOnChanged?: string[];
}) {
	const submitOnChangedSet = React.useMemo(
		() => new Set(submitOnChanged || []),
		[submitOnChanged],
	);

	return (
		<form
			{...props}
			onChange={(event) => {
				if (props.onChange) {
					props.onChange(event);
				}
				if (
					!submitOnChanged ||
					event.defaultPrevented ||
					typeof props.action !== "function" ||
					!event.target ||
					!(event.target instanceof Element) ||
					!submitOnChangedSet.has(event.target.getAttribute("name") || "")
				) {
					return;
				}

				const formData = new FormData(event.currentTarget);
				props.action(formData);
			}}
		/>
	);
}
