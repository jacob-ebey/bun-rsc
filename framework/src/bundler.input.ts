export interface BundlerOptions {
	browserEntry: string;
	serverExternals: string[];
	browserOutdir: string;
	clientDependencies: Map<string, [string, string][]>;
	environment: "development" | "production";
	outdir: string;
	processed: Set<string>;
	root: string;
	routes: Map<string, string>;
	serverDependencies: Map<string, [string, string][]>;
	serverEntry: string;
	serverOutdir: string;
	ssrEntry: string;
	ssrOutdir: string;
}
