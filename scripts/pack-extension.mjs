import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";

const extensionDir = process.cwd();
const outDir = resolve(extensionDir, "out");
const distDir = resolve(extensionDir, "dist");
const publicDir = resolve(extensionDir, "public");
const nextDir = resolve(distDir, "_next");
const safeNextDir = resolve(distDir, "next-assets");

if (!existsSync(outDir)) {
  console.error("Pasta 'out' nao encontrada. Execute 'next build' antes de empacotar.");
  process.exit(1);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
cpSync(outDir, distDir, { recursive: true });
if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true, force: true });
}

if (existsSync(nextDir)) {
  rmSync(safeNextDir, { recursive: true, force: true });
  renameSync(nextDir, safeNextDir);
}

const textExtensions = new Set([".html", ".js", ".css", ".json", ".map"]);

const rewriteFileReferences = (filePath) => {
  const content = readFileSync(filePath, "utf8");
  const rewritten = content
    .replaceAll('"/_next/', '"/next-assets/')
    .replaceAll("'/_next/", "'/next-assets/")
    .replaceAll("(/_next/", "(/next-assets/")
    .replaceAll('"_next/', '"next-assets/')
    .replaceAll("'_next/", "'next-assets/")
    .replaceAll("(_next/", "(next-assets/");

  if (rewritten !== content) {
    writeFileSync(filePath, rewritten, "utf8");
  }
};

const walkAndRewrite = (currentDir) => {
  for (const entry of readdirSync(currentDir)) {
    const fullPath = join(currentDir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walkAndRewrite(fullPath);
      continue;
    }

    const extension = fullPath.slice(fullPath.lastIndexOf("."));
    if (textExtensions.has(extension)) {
      rewriteFileReferences(fullPath);
    }
  }
};

walkAndRewrite(distDir);

console.log(`Extensao empacotada em: ${distDir} (sem pasta _next na raiz)`);
