export default function Loading() {
	return (
		<main className="flex justify-center items-center h-full w-full bg-opacity-50 bg-gray-300">
			<div
				aria-label="Loading..."
				className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-gray-900"
			/>
		</main>
	);
}
