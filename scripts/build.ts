
import { spawn } from "bun";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const BACKEND_ENTRY = join(ROOT, "backend/src/server.ts");
const OUT_FILE = join(ROOT, "overlay-server");

console.log("🚀 Starting build process...");

// 1. Build frontend
console.log("📦 Building frontend (Vite)...");
const viteProc = spawn(["npm", "run", "build"], { stdout: "inherit", stderr: "inherit" });
if (await viteProc.exited !== 0) process.exit(1);

// 2. Embed assets
console.log("📄 Embedding assets...");
const embedProc = spawn(["bun", "run", "scripts/embed-assets.ts"], { stdout: "inherit", stderr: "inherit" });
if (await embedProc.exited !== 0) process.exit(1);

// 3. Compile backend to single executable
console.log("🔨 Compiling backend to binary...");
// We use --minify to reduce binary size since we are embedding stuff
const buildProc = spawn(["bun", "build", "--compile", "--minify", BACKEND_ENTRY, "--outfile", OUT_FILE], { stdout: "inherit", stderr: "inherit" });
if (await buildProc.exited !== 0) process.exit(1);

console.log(`\n✅ Build successful! Executable created: ${OUT_FILE}`);
console.log(`\nYou can now run your server anywhere with: ./${OUT_FILE.split('/').pop()}`);
