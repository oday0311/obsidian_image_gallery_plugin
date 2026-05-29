import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const pluginsRoot =
  process.env.OBSIDIAN_PLUGINS_DIR ??
  "/Users/xxx/Documents/Obsidian Vault/.obsidian/plugins";

const requiredFiles = ["main.js", "manifest.json"];
const optionalFiles = ["styles.css", "versions.json"];

async function main() {
  const manifestPath = path.join(projectRoot, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  validateManifest(manifest);
  validatePluginsRoot(pluginsRoot);

  const targetDir = path.join(pluginsRoot, manifest.id);
  ensurePathInsideRoot(targetDir, pluginsRoot);

  console.log(`Building plugin: ${manifest.id}`);
  await runNodeScript("esbuild.config.mjs");

  await ensureBuildArtifactsExist(projectRoot, requiredFiles);
  await fs.mkdir(targetDir, { recursive: true });

  const filesToSync = [
    ...requiredFiles,
    ...(await filterExistingFiles(projectRoot, optionalFiles)),
  ];

  for (const fileName of filesToSync) {
    await safeCopyFile(
      path.join(projectRoot, fileName),
      path.join(targetDir, fileName),
    );
  }

  console.log(`Synced ${filesToSync.length} file(s) to: ${targetDir}`);
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("manifest.json is invalid.");
  }

  if (!manifest.id || typeof manifest.id !== "string") {
    throw new Error("manifest.json must contain a string id.");
  }

  if (manifest.id.includes("/") || manifest.id.includes("\\")) {
    throw new Error("manifest id cannot contain path separators.");
  }
}

function validatePluginsRoot(targetPath) {
  const normalized = path.normalize(targetPath);
  const expectedSuffix = path.normalize(path.join(".obsidian", "plugins"));

  if (!normalized.endsWith(expectedSuffix)) {
    throw new Error(
      `Refusing to sync outside an Obsidian plugins directory: ${targetPath}`,
    );
  }
}

function ensurePathInsideRoot(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Target path escapes the plugins directory: ${targetPath}`);
  }
}

function runNodeScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptName], {
      cwd: projectRoot,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

async function ensureBuildArtifactsExist(rootDir, fileNames) {
  for (const fileName of fileNames) {
    const filePath = path.join(rootDir, fileName);
    await fs.access(filePath);
  }
}

async function filterExistingFiles(rootDir, fileNames) {
  const result = [];

  for (const fileName of fileNames) {
    try {
      await fs.access(path.join(rootDir, fileName));
      result.push(fileName);
    } catch {
      // Skip optional files that do not exist in the project root.
    }
  }

  return result;
}

async function safeCopyFile(sourcePath, targetPath) {
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.copyFile(sourcePath, tempPath);
  await fs.rename(tempPath, targetPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
