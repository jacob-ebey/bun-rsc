import { incrementOrDecrement } from "../../actions/counter.ts";
import { Counter } from "../../components/counter.tsx";
import { counter } from "../../models/counter.ts";

export default async function About() {
	const [{ count }] = await Promise.all([
		counter(),
		new Promise((resolve) => setTimeout(resolve, 1000)),
	]);
	return (
		<main>
			<h1>About</h1>

			<Counter count={count} incrementOrDecrement={incrementOrDecrement} />

			<p>This is using React Server Components!</p>
			<p>
				It supports navigation with a cache that lasts until the user refreshes
				the page, or a POST form is submitted.
			</p>
		</main>
	);
}
