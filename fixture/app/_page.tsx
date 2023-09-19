import { getFormAction } from "framework";

import { incrementOrDecrement } from "../actions/counter.ts";
import { sayHello } from "../actions/say-hello.tsx";
import { Counter } from "../components/counter.tsx";
import { PendingLabel } from "../components/form.tsx";
import { counter } from "../models/counter.ts";

export default async function Home() {
	const [{ count }] = await Promise.all([counter()]);
	const sayHelloAction = getFormAction(sayHello);

	return (
		<main>
			<h1>Home</h1>
			<Counter count={count} incrementOrDecrement={incrementOrDecrement} />

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

			<div style={{ border: "1px solid var(--nc-bg-3)" }}>
				<p>Say Hello Result</p>
				{sayHelloAction.result}
			</div>
		</main>
	);
}
