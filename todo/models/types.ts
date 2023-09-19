export interface User {
	id: number;
	username: string;
}

export interface Todo {
	id: number;
	userId: number;
	task: string;
	completed: boolean;
}
