"use server";

export function sayHello(formData: FormData) {
	const name = String(formData.get("name") || "") || "world";
	return <p>Hello {name}!</p>;
}
