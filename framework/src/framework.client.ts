export function useInvalidate() {
	return (invalidate: string) => {
		invalidateCache(invalidate);
		callServer(location.href, [location.pathname, false], "navigation");
	};
}
