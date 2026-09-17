#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This helper must run on macOS."
  exit 1
fi
project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
for tool in node npx cargo rustc xcode-select; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing $tool. Follow docs/MAC_TESTING.md, then reopen Terminal."
    exit 1
  fi
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) { console.error("Use Node.js 24 or later."); process.exit(1); }'
xcode-select -p >/dev/null
case "$(uname -m)" in
  x86_64) echo "Building for Intel Mac (x86_64)." ;;
  arm64) echo "Building for Apple Silicon (arm64)." ;;
  *) echo "Unsupported architecture."; exit 1 ;;
esac
export CARGO_TARGET_DIR="$project_root/.local/mac-build"
mkdir -p "$project_root/.local"
# npx supplies pnpm to Tauri's nested beforeBuildCommand too.
npx --yes --package=pnpm@11.18.0 --call 'pnpm install --frozen-lockfile && pnpm desktop:build --bundles app' 2>&1 | tee "$project_root/.local/mac-build.log"
app_path="$CARGO_TARGET_DIR/release/bundle/macos/LumaWindow.app"
if [[ ! -d "$app_path" ]]; then
  echo "App not found at $app_path. Check .local/mac-build.log."
  exit 1
fi
echo "Built: $app_path"
open "$app_path"
