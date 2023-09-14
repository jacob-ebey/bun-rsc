import { sayHello } from "../actions/say-hello.tsx";
import { Counter } from "../components/counter.tsx";

export default function Home() {
	return (
		<main>
			<h1>Home</h1>
			<Counter />

			<form action={sayHello}>
				<input type="hidden" name="name" value="Hidden" />
				<button type="submit">Submit Server Action Hidden Value</button>
			</form>
			<form action={sayHello}>
				<button type="submit" name="name" value="Button">
					Submit Server Action Button Value
				</button>
			</form>
		</main>
	);
}
