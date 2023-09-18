"use client";

export function SelfSubmittingInput({
	action,
	...props
}: React.HTMLProps<HTMLInputElement> & {
	action: (formData: FormData) => unknown;
}) {
	return (
		<input
			{...props}
			onChange={(event) => {
				const form = event.target.form;
				if (!form) {
					throw new Error("SelfSubmittingInput must be used inside a form");
				}
				const formData = new FormData(form);
				action(formData);
			}}
		/>
	);
}
