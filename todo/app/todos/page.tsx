import * as React from "react";

import { getFormAction, throwRedirect } from "framework";

import * as models from "../../models/mod.ts";
import { EnhancedForm } from "../client-components.tsx";
import { Checkbox, Input, Submit } from "../components.tsx";
import { loginPathname } from "../config.ts";
import { addTodo, deleteTodo, editTodo } from "./actions.tsx";
import { Pending } from "./client.tsx";
import { getUser } from "../utils.ts";

export default async function Todos() {
	const addAction = getFormAction(addTodo);
	const deleteAction = getFormAction(deleteTodo);
	const editAction = getFormAction(editTodo);

	const [user] = await Promise.all([getUser()]);

	if (!user) {
		return throwRedirect(loginPathname);
	}
	const todos = await models.todo.getTodos(user.id);

	return (
		<main className="flex flex-col items-center justify-center w-full p-4 bg-gray-100">
			<div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
				<TodoForm errors={addAction.result} />
				{deleteAction.result &&
					!deleteAction.result.id &&
					deleteAction.result?.element}
				{editAction.result &&
					!editAction.result.id &&
					editAction.result?.element}
				<ul className="py-4">
					{todos.map((todo) => (
						<TodoItem
							key={todo.id}
							todo={todo}
							deleteResult={deleteAction.result}
							editResult={editAction.result}
						/>
					))}
				</ul>
			</div>
		</main>
	);
}

function TodoForm({ errors }: { errors?: React.ReactNode }) {
	return (
		<form action={addTodo}>
			<Input type="text" name="task" autoComplete="off">
				Add a new todo
			</Input>
			{errors}
			<Submit>
				<Pending pending="Adding...">Add</Pending>
			</Submit>
		</form>
	);
}

function TodoItem({
	todo,
	deleteResult,
	editResult,
}: {
	todo: models.Todo;
	deleteResult?: Awaited<ReturnType<typeof deleteTodo>>;
	editResult?: Awaited<ReturnType<typeof editTodo>>;
}) {
	return (
		<li>
			<EnhancedForm action={editTodo}>
				<input type="hidden" name="id" value={todo.id} />
				<input type="hidden" name="task" value={todo.task} />

				<div className="flex gap-4 justify-between">
					<Checkbox name="completed" defaultChecked={todo.completed}>
						{todo.task}
					</Checkbox>
					<button type="submit" formAction={deleteTodo}>
						<Pending pending="Deleting...">Delete</Pending>
					</button>
				</div>
				{deleteResult?.id === todo.id && deleteResult?.element}
				{editResult?.id === todo.id && editResult?.element}
			</EnhancedForm>
		</li>
	);
}
