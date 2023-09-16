"use server";

import { counterObj } from "../models/counter.ts";

function sleepRandom(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, Math.random() * ms);
	});
}

export function incrementOrDecrement(formData: FormData) {
	if (formData.has("increment")) {
		return increment();
	} else if (formData.has("decrement")) {
		return decrement();
	}
	throw new Error("Invalid intent");
}

export async function decrement() {
	await sleepRandom(2000);
	counterObj.count--;
}
export async function increment() {
	await sleepRandom(100);
	counterObj.count++;
}
