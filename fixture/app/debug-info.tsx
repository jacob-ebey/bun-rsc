"use client";

import { useLocation, useNavigation } from "framework/client";

export function DebugInfo({ url }: { url: string }) {
	const location = useLocation();
	const navigation = useNavigation();

	return (
		<>
			<dl>
				<dt>URL</dt>
				<dd>{url}</dd>
			</dl>
			<div style={{ display: "flex", height: 250 }}>
				<pre style={{ flex: 1 }}>
					<code>{JSON.stringify(location || null, null, 2)}</code>
				</pre>
				<pre style={{ flex: 1 }}>
					<code>{JSON.stringify(navigation || null, null, 2)}</code>
				</pre>
			</div>
		</>
	);
}
