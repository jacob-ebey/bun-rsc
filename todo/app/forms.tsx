import { login, signup } from "./actions.tsx";
import { FormErrors, FullScreenForm, Input, Submit } from "./components.tsx";

import { Pending } from "./client-components.tsx";

export function LoginForm({
	error,
}: {
	error?: Awaited<ReturnType<typeof login>>;
}) {
	return (
		<FullScreenForm action={login}>
			<h1 className="text-2xl font-bold mb-4">TODOs Login</h1>
			<Input type="text" name="username" autoComplete="email" required>
				Username
			</Input>
			<Input type="password" name="password" autoComplete="password" required>
				Password
			</Input>
			{error}
			<Submit>
				<Pending pending="Submitting...">Login</Pending>
			</Submit>
			<p className="mt-4">
				Don't have an account?{" "}
				<a href="?signup" className="text-blue-500">
					Sign up
				</a>
				.
			</p>
		</FullScreenForm>
	);
}

export function SignupForm({
	error,
}: {
	error?: Awaited<ReturnType<typeof signup>>;
}) {
	const errors = error || {};

	return (
		<FullScreenForm action={signup}>
			<h1 className="text-2xl font-bold mb-4">TODOs Signup</h1>
			<Input
				type="text"
				name="username"
				autoComplete="email"
				required
				errors={error?.nested.username}
			>
				Username
			</Input>
			<Input
				type="password"
				name="password"
				autoComplete="new-password"
				required
				errors={error?.nested.password}
			>
				Password
			</Input>
			<Input
				type="password"
				name="verifyPassword"
				autoComplete="new-password"
				required
				errors={error?.nested.verifyPassword}
			>
				Verify Password
			</Input>
			<FormErrors errors={error?.root} />
			<Submit>Signup</Submit>
			<p className="mt-4">
				Already have an account?{" "}
				<a href="/" className="text-blue-500">
					Log in
				</a>
				.
			</p>
		</FullScreenForm>
	);
}
