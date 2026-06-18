#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/.aws/lambda"

mkdir -p "$OUTPUT_DIR"

package_lambda() {
  local service="$1"
  local package_dir="$OUTPUT_DIR/$service"

  rm -rf "$package_dir" "$OUTPUT_DIR/$service.zip"
  mkdir -p "$package_dir"

  cp -R "$REPO_ROOT/services/$service/dist" "$package_dir/dist"
  cp "$REPO_ROOT/services/$service/package.json" "$package_dir/package.json"

  npm install --omit=dev --ignore-scripts --no-audit --no-fund --prefix "$package_dir"

  (
    cd "$package_dir"
    if command -v zip >/dev/null 2>&1; then
      zip -qr "../$service.zip" dist node_modules package.json
    elif command -v powershell.exe >/dev/null 2>&1; then
      powershell.exe -NoProfile -Command "Compress-Archive -Path 'dist','node_modules','package.json' -DestinationPath '../$service.zip' -Force"
    else
      echo "zip command not found. Install zip or run this script in PowerShell-capable Windows/Git Bash."
      exit 1
    fi
  )
}

package_lambda auth
package_lambda email
package_lambda whatsapp

echo "Lambda packages created in $OUTPUT_DIR"
