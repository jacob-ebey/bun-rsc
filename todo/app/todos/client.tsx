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
