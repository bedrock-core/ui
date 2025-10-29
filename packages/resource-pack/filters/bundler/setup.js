const path = require("path");
const fs = require("fs");
const child_process = require("child_process");

//Load config.json file
// The path to the config.json directory is in the ROOT_DIR environment variable
const rootPath = process.env.ROOT_DIR;
if (!rootPath) {
  console.warn("ROOT_DIR environment variable not found");
  return;
}

console.log("Setup script running - checking for dependencies in project root");

// Check if package.json exists in project root and install dependencies there
const packageJsonPath = path.resolve(rootPath, "package.json");
if (fs.existsSync(packageJsonPath)) {
  console.log("Installing dependencies in project root:", rootPath);
  child_process.execSync(`yarn install`, {
    cwd: rootPath,
    stdio: "inherit"
  });
} else {
  console.log("package.json not found in project root, execute 'yarn install' manually in", rootPath);
}