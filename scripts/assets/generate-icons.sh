#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SVG_PATH="$ROOT_DIR/resources/icon.svg"
PNG_PATH="$ROOT_DIR/resources/icon.png"
ICO_PATH="$ROOT_DIR/resources/icon.ico"
ICNS_PATH="$ROOT_DIR/resources/icon.icns"
TMP_DIR="$(mktemp -d)"
ICONSET_DIR="$TMP_DIR/icon.iconset"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$ICONSET_DIR"

qlmanage -t -s 1024 -o "$TMP_DIR" "$SVG_PATH" >/dev/null
mv "$TMP_DIR/icon.svg.png" "$PNG_PATH"

for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$PNG_PATH" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
done

cp "$ICONSET_DIR/icon_32x32.png" "$ICONSET_DIR/icon_16x16@2x.png"
cp "$ICONSET_DIR/icon_128x128.png" "$ICONSET_DIR/icon_32x32@2x.png"
cp "$ICONSET_DIR/icon_256x256.png" "$ICONSET_DIR/icon_128x128@2x.png"
cp "$ICONSET_DIR/icon_512x512.png" "$ICONSET_DIR/icon_256x256@2x.png"
cp "$PNG_PATH" "$ICONSET_DIR/icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o "$ICNS_PATH"
sips -z 256 256 "$PNG_PATH" --out "$TMP_DIR/icon-256.png" >/dev/null
node "$ROOT_DIR/scripts/assets/png-to-ico.mjs" "$TMP_DIR/icon-256.png" "$ICO_PATH"
