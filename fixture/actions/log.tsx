"use server";

export async function log(...args: unknown[]) {
	console.log(...args);
	return true;
}
