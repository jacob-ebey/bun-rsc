"use server";

import { throwRedirect, type ThisAction } from "framework";
import * as v from "valibot";

import * as models from "../../models/mod.ts";
import { FormErrors } from "../components.tsx";
import { loginPathname } from "../config.ts";
import { getUser } from "../utils.ts";

const FormDataCheckboxSchema = v.transform(v.string(), (s) => s === "on");
const FromDataIntegerSchema = v.transform(v.string([v.minLength(1)]), (s) =>
	v.parse(v.number([v.safeInteger()]), Number.parseInt(s)),
);

const deleteSchema = v.object({
	id: FromDataIntegerSchema,
});

export async function deleteTodo(this: ThisAction, formData: FormData) {
	const [user] = await Promise.all([getUser(this.headers)]);

	if (!user) {
		throwRedirect(loginPathname);
	}

	const parsed = v.safeParse(
		deleteSchema,
		Object.fromEntries(formData.entries()),
	);

	if (!parsed.success) {
		// TODO: set status code
		return {
			id: undefined,
			element: <FormErrors errors={["Invalid request"]} />,
		};
	}

	const { id } = parsed.output;

	try {
		await models.todo.deleteTodo(user.id, id);
	} catch (error) {
		console.error(error);
		// TODO: set status code
		return {
			id,
			element: <FormErrors errors={["Failed to delete"]} />,
		};
	}
}

const addSchema = v.object({
	task: v.string([v.minLength(1)]),
	completed: v.optional(FormDataCheckboxSchema),
});

export async function addTodo(this: ThisAction, formData: FormData) {
	const [user] = await Promise.all([getUser(this.headers)]);

	if (!user) {
		return throwRedirect(loginPathname);
	}

	const parsed = v.safeParse(addSchema, Object.fromEntries(formData.entries()));

	if (!parsed.success) {
		return <FormErrors errors={["No task provided"]} />;
	}

	const { task, completed } = parsed.output;

	try {
		await models.todo.createTodo(user.id, {
			task,
			completed: !!completed,
		});
		return <FormErrors errors={[]} />;
	} catch (error) {
		console.error(error);
		// TODO: set status code
		return <FormErrors errors={["Failed to add"]} />;
	}
}

const editSchema = v.object({
	id: FromDataIntegerSchema,
	task: v.string(),
	completed: v.optional(FormDataCheckboxSchema),
});

export async function editTodo(this: ThisAction, formData: FormData) {
	const [user] = await Promise.all([getUser(this.headers)]);

	if (!user) {
		throwRedirect(loginPathname);
	}

	console.log(Object.fromEntries(formData.entries()));
	const parsed = v.safeParse(
		editSchema,
		Object.fromEntries(formData.entries()),
	);

	if (!parsed.success) {
		// TODO: set status code
		return {
			id: undefined,
			element: <FormErrors errors={["Invalid request"]} />,
		};
	}

	const { id, task, completed } = parsed.output;

	try {
		await models.todo.updateTodo(user.id, id, {
			task,
			completed: !!completed,
		});
		return {
			id,
			element: undefined,
		};
	} catch (error) {
		console.error(error);
		// TODO: set status code
		return {
			id,
			element: <FormErrors errors={["Failed to update"]} />,
		};
	}
}
