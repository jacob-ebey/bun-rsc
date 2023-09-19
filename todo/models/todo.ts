import { getDb } from "./db.ts";

import type { Todo, User } from "./types.ts";

export interface CreateTodo {
	task: string;
	completed?: boolean;
}

export function getTodos(userId: number): Promise<Todo[]> {
	const db = getDb();
	const stmt = db.prepare("SELECT * FROM todos WHERE userId = ?");
	return Promise.resolve(stmt.all(userId) as Todo[]);
}

export function updateTodo(
	userId: number,
	todoId: number,
	updatedFields: Partial<CreateTodo>,
): Promise<Todo> {
	const db = getDb();
	const { task, completed } = updatedFields;
	const stmt = db.prepare(
		"UPDATE todos SET task = ?, completed = ? WHERE id = ? AND userId = ?",
	);
	const info = stmt.run(task, completed ? 1 : 0, todoId, userId);

	if (info.changes === 0) {
		return Promise.reject(new Error("Todo not found or not updated"));
	}

	return Promise.resolve({
		id: todoId,
		userId,
		task: task || "",
		completed: completed || false,
	});
}

export function deleteTodo(userId: number, todoId: number): Promise<void> {
	const db = getDb();
	const stmt = db.prepare("DELETE FROM todos WHERE id = ? AND userId = ?");
	const info = stmt.run(todoId, userId);

	if (info.changes === 0) {
		return Promise.reject(new Error("Todo not found or not deleted"));
	}

	return Promise.resolve();
}

export function createTodo(userId: number, todo: CreateTodo): Promise<Todo> {
	const db = getDb();
	const stmt = db.prepare(
		"INSERT INTO todos (userId, task, completed) VALUES (?, ?, ?)",
	);
	const info = stmt.run(userId, todo.task, todo.completed ? 1 : 0);
	const newTodoId = info.lastInsertRowid;
	if (typeof newTodoId !== "number") {
		return Promise.reject(new Error("Todo not created"));
	}

	return Promise.resolve({
		id: newTodoId,
		userId,
		task: todo.task,
		completed: todo.completed || false,
	});
}
