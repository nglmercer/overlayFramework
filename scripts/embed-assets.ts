
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const DIST_DIR = join(import.meta.dir, "../dist");
const OUTPUT_FILE = join(import.meta.dir, "../backend/src/embedded-assets.ts");

async function walk(dir: string): Promise<string[]> {
  const files = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(
    files.map(async (file) => {
      const path = join(dir, file.name);
      return file.isDirectory() ? walk(path) : path;
    })
  );
  return paths.flat();
}

try {
  const allFiles = await walk(DIST_DIR);
  const assets: Record<string, string> = {};

  for (const file of allFiles) {
    const relPath = "/" + relative(DIST_DIR, file);
    const content = await readFile(file);
    // Store as base64 to keep it in a single TS file easily
    // In a real high-perf app, we might use something else, but this is the "easy" way
    assets[relPath] = content.toString("base64");
  }

  const tsContent = `
/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * This file contains embedded assets from the /dist directory.
 */
 
export const embeddedAssets: Record<string, { content: Uint8Array, type: string }> = {
${Object.entries(assets)
    .map(([path, b64]) => {
      // Basic mime type detection
      const ext = path.split('.').pop() || '';
      let type = 'application/octet-stream';
      if (ext === 'html') type = 'text/html';
      else if (ext === 'js') type = 'application/javascript';
      else if (ext === 'css') type = 'text/css';
      else if (ext === 'ico') type = 'image/x-icon';
      else if (ext === 'png') type = 'image/png';
      else if (ext === 'svg') type = 'image/svg+xml';
      
      return `  "${path}": { 
    content: Buffer.from("${b64}", "base64"),
    type: "${type}"
  },`;
    })
    .join("\n")}
};
`;

  await writeFile(OUTPUT_FILE, tsContent);
  console.log(`✅ Embedded ${allFiles.length} assets into ${OUTPUT_FILE}`);
} catch (error) {
  console.error("❌ Failed to embed assets:", error);
}
