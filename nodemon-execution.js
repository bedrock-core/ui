import { spawn } from "child_process";

let child;

function startResourcePack() {
	if (child) {
		console.log("🔁 Restarting resource-pack watch...");
		child.kill();
	}

	child = spawn("yarn", ["workspace", "@bedrock-core/ui-resource-pack", "run", "watch"], {
		stdio: "inherit",
		shell: true,
	});
}

startResourcePack();

// graceful exit
process.on("SIGINT", () => {
	if (child) child.kill();
	process.exit();
});
