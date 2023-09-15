"use client";

import * as React from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";

export function PendingLabel({
	pending,
	children,
}: {
	pending: React.ReactNode;
	children: React.ReactNode;
}) {
	const status = useFormStatus();
	if (status.pending) {
		return pending;
	}
	return children;
}
