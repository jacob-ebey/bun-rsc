export function installEventListeners() {
	if (!window.navigation) {
		console.error("window.navigation is not defined");
		return;
	}

	window.navigation.addEventListener("navigate", (event) => {
		if (!event.canIntercept || event.hashChange || event.downloadRequest) {
			return;
		}

		// Check if the URL is on the same origin.
		const url = new URL(event.destination.url);
		if (url.origin !== location.origin) {
			return;
		}
		console.log(event);
		const fromURL = location.pathname;

		event.intercept({
			handler() {
				return callServer(url.href, [fromURL, false], "navigation");
			},
		});
	});

	// addEventListener("click", (event) => {
	// 	const target = event.target;
	// 	if (!(target instanceof HTMLAnchorElement)) {
	// 		return;
	// 	}

	// 	const href = target.getAttribute("href");
	// 	if (!href) {
	// 		return;
	// 	}
	// 	const url = new URL(href, location.origin);
	// 	if (url.origin !== location.origin) {
	// 		return;
	// 	}
	// 	if (target.getAttribute("target") === "_blank") {
	// 		return;
	// 	}
	// 	if (target.getAttribute("download") !== null) {
	// 		return;
	// 	}

	// 	callServer(url.href, [location.pathname, true], "navigation");
	// 	lastLocation = url.pathname + url.search;

	// 	event.preventDefault();
	// });

	// addEventListener("submit", (event) => {});

	// addEventListener("popstate", (event) => {
	// 	callServer(location.href, [lastLocation, false], "navigation");
	// 	lastLocation = location.pathname + location.search;
	// });
}
