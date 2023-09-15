import { sayHello } from "../actions/say-hello.tsx";
import { Counter } from "../components/counter.tsx";
import { PendingLabel } from "../components/form.tsx";

export default async function Home() {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return (
		<main>
			<h1>Home</h1>
			<Counter />

			<form action={sayHello}>
				<input type="hidden" name="name" value="Hidden" />
				<button type="submit">
					<PendingLabel pending="Submitting...">
						Submit Server Action Hidden Value
					</PendingLabel>
				</button>
			</form>
			<form action={sayHello}>
				<button type="submit" name="name" value="Button">
					<PendingLabel pending="Submitting...">
						Submit Server Action Button Value
					</PendingLabel>
				</button>
			</form>
			<button type="submit" name="name" value="Button" form="say-hello">
				Submit Server Action Button External Form
			</button>
			<form action={sayHello} id="say-hello">
				<PendingLabel pending="Submitting...">External Form</PendingLabel>
			</form>
		</main>
	);
}
