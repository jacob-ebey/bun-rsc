import * as path from "node:path";

console.log("Building framework...");
let step = Bun.spawn(["bun", "run", "build"], {
	stderr: "inherit",
	stdout: "inherit",
	cwd: path.resolve(process.cwd(), "framework"),
});

if (await step.exited) {
	throw new Error("Failed to build framework");
}

console.log("Building fixture...");
step = Bun.spawn(["bun", "run", "build"], {
	stderr: "inherit",
	stdout: "inherit",
	cwd: path.resolve(process.cwd(), "fixture"),
});

if (await step.exited) {
	throw new Error("Failed to build fixture");
}
