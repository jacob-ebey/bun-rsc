import { getFormAction, isRedirect } from "framework";

import { loginPathname } from "../config.ts";
import { SelfSubmittingInput } from "../form.tsx";
import { getTODOS } from "../loaders.ts";
import { getUser } from "../request.ts";

import { updateTodo } from "../actions.tsx";

export default async function AllTODOs() {
	const userPromise = getUser();
	const [todos, updateTodosAction] = await Promise.all([
		getTODOS(userPromise, loginPathname),
		getFormAction(updateTodo),
	]);
	if (isRedirect(todos)) {
		return todos;
	}

	return (
		<main>
			<h1>All TODOs</h1>
			<section>
				{updateTodosAction.result}
				{todos.map((todoItem) => (
					<form
						key={todoItem.id}
						action={updateTodo}
						style={{ display: "flex", gap: 12 }}
					>
						<input type="hidden" name="id" value={todoItem.id} />
						<SelfSubmittingInput
							action={updateTodo}
							aria-label={todoItem.completed ? "Completed" : "Not Completed"}
							type="checkbox"
							name="completed"
							defaultChecked={todoItem.completed}
							style={{
								transform: "scale(2)",
							}}
						/>{" "}
						<input
							aria-label="TODO"
							type="text"
							name="todo"
							defaultValue={todoItem.todo}
							style={{
								flex: 1,
							}}
						/>
					</form>
				))}
			</section>
		</main>
	);
}
