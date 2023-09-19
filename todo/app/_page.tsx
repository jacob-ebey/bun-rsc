import { getFormAction, getURL } from "framework";

import { login, signup } from "./actions.tsx";
import { Pending } from "./client.tsx";
import { FormErrors, FullScreenForm, Input, Submit } from "./components.tsx";
import { getUser } from "./utils.ts";

export default async function Home() {
	const loginAction = getFormAction(login);
	const signupAction = getFormAction(signup);
	const url = getURL();

	const [user] = await Promise.all([getUser()]);

	let mode: "login" | "signup" | "logged-in" = "login";
	if (user) {
		mode = "logged-in";
	} else if (url.searchParams.has("signup")) {
		mode = "signup";
	}

	return (
		<main className="flex flex-col justify-center items-center flex-1 w-full bg-gray-100 p-4">
			{(() => {
				switch (mode) {
					case "logged-in":
						if (!user) throw new Error("User is not logged in");
						return (
							<div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
								<h1 className="text-2xl font-bold mb-4">TODOs</h1>
								<p className="mb-4">Logged in as {user.username}</p>
								<p>
									<a
										href="/todos"
										className="block text-center bg-blue-500 text-white rounded-lg px-4 py-2 w-full"
									>
										Go to TODOs
									</a>
								</p>
							</div>
						);
					case "login":
						return <LoginForm error={loginAction.result} />;
					case "signup":
						return <SignupForm error={signupAction.result} />;
					default:
						throw new Error(`Unknown mode: ${mode}`);
				}
			})()}
		</main>
	);
}

function LoginForm({
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

function SignupForm({
	error,
}: {
	error?: Awaited<ReturnType<typeof signup>>;
}) {
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
