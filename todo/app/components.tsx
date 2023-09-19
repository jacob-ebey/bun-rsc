import * as React from "react";

export function FullScreenForm({
	action,
	children,
}: { action: (formData: FormData) => unknown; children: React.ReactNode }) {
	return (
		<form
			action={action}
			className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
		>
			{children}
		</form>
	);
}

export function Input({
	type,
	name,
	required,
	errors,
	autoComplete,
	children,
}: {
	type: string;
	name: string;
	required?: boolean;
	errors?: string[];
	autoComplete?: string;
	children: React.ReactNode;
}) {
	const id = React.useId();
	return (
		<div className="mb-4">
			<label htmlFor={id} className="block text-gray-700 text-sm mb-2">
				{children}
			</label>
			<input
				id={id}
				type={type}
				name={name}
				className="w-full p-2 border rounded"
				required={required}
				autoComplete={autoComplete}
			/>
			<FieldErrors errors={errors} />
		</div>
	);
}

export function Checkbox({
	defaultChecked,
	name,
	children,
}: {
	defaultChecked: boolean;
	name: string;
	children: React.ReactNode;
}) {
	return (
		<label className="w-full flex items-center mb-4 bg-white p-4 rounded-lg shadow">
			<input
				type="checkbox"
				name={name}
				defaultChecked={defaultChecked}
				className="form-checkbox h-5 w-5 text-blue-600 rounded mr-4 focus:ring-0 focus:ring-offset-0"
			/>
			<span
				className={`flex-1 text-lg font-medium ${
					defaultChecked
						? "line-through text-gray-400 hover:no-underline hover:text-black"
						: "text-black hover:line-through hover:text-gray-400"
				}`}
			>
				{children}
			</span>
		</label>
	);
}

export function FieldErrors({ errors }: { errors?: string[] }) {
	if (!errors?.length) return null;

	return (
		<>
			{errors.map((error, index) => (
				<p key={index + error} className="text-red-500">
					{error}
				</p>
			))}
		</>
	);
}

export function Submit({ children }: { children: React.ReactNode }) {
	return (
		<button
			type="submit"
			className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
		>
			{children}
		</button>
	);
}

export function FormErrors({ errors }: { errors?: string[] }) {
	if (!errors?.length) return null;

	return (
		<>
			{errors.map((error, index) => (
				<p key={index + error} className="mb-4 text-red-500">
					{error}
				</p>
			))}
		</>
	);
}
