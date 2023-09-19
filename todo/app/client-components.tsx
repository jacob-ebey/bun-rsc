/// <reference lib="dom" />

"use client";

import * as React from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";

export function Pending({
	action,
	pending,
	children,
}: {
	action?: (formData: FormData) => unknown;
	pending: React.ReactNode;
	children: React.ReactNode;
}) {
	const status = useFormStatus();

	if (action && status.action && status.action !== action) {
		return children;
	}

	if (status.pending) {
		return pending;
	}

	return children;
}

export function EnhancedForm(
	props: React.HTMLProps<HTMLFormElement> & {
		submitOnChanged?: string[];
	},
) {
	const status = useFormStatus();
	return (
		<form
			{...props}
			onChange={(event) => {
				if (props.onChange) {
					props.onChange(event);
				}
				if (event.defaultPrevented || typeof props.action !== "function") {
					return;
				}

				const formData = new FormData(event.currentTarget);
				props.action(formData);
			}}
		/>
	);
}
