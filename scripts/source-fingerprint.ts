import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";

/** Identifies source inputs, not timestamps or output folders. */
export function sourceFingerprint(root: string) {
  const files = [
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "apps/player/index.html",
    "apps/player/vite.config.ts",
    "apps/player/src-tauri/Cargo.toml",
    "apps/player/src-tauri/Cargo.lock",
    "apps/player/src-tauri/build.rs",
    "apps/player/src-tauri/tauri.conf.json",
    "scripts/source-fingerprint.ts",
  ];
  const collect = (directory: string) => {
    for (const entry of readdirSync(resolve(root, directory), {
      withFileTypes: true,
    })) {
      if (["node_modules", "dist", "target", ".git"].includes(entry.name))
        continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) collect(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  for (const directory of [
    "apps/player/src",
    "apps/player/src-tauri/src",
    "apps/player/src-tauri/capabilities",
    "packages",
    "scenes",
  ])
    collect(directory);
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    const absolute = resolve(root, file);
    hash.update(relative(root, absolute).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(absolute));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}
