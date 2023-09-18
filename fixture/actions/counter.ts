"use server";

import { counterObj } from "../models/counter.ts";

export function incrementOrDecrement(formData: FormData) {
	if (formData.has("increment")) {
		return increment();
	} else if (formData.has("decrement")) {
		return decrement();
	}
	throw new Error("Invalid intent");
}

export async function decrement() {
	counterObj.count--;
}
export async function increment() {
	counterObj.count++;
}
