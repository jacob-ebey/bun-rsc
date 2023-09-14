"use server";

export function sayHello(formData: FormData) {
	const name = String(formData.get("name") || "") || "world";
	console.log(`Hello ${name}!`);
	return <p>Hello {name}!</p>;
}
