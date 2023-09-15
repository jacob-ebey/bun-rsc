"use server";

let short = false;
export async function sayHello(formData: FormData) {
	short = !short;
	// await new Promise((resolve) => setTimeout(resolve, short ? 0 : 1000));
	const name = String(formData.get("name") || "") || "world";
	console.log(`Hello ${name}!`);
	return <p>Hello {name}!</p>;
}
